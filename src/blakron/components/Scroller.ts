import { TouchEvent, Event, Rectangle, DisplayObject } from '@blakron/core';
import { Component } from './Component.js';
import type { Skin } from './Skin.js';
import type { IViewport } from '../core/IViewport.js';
import { ScrollPolicy } from '../core/ScrollPolicy.js';
import { TouchScroll } from './TouchScroll.js';
import { HScrollBar } from './HScrollBar.js';
import { VScrollBar } from './VScrollBar.js';
import { PropertyEvent } from '../events/PropertyEvent.js';
import { isUIComponent } from '../core/UIComponent.js';

/**
 * Scratch rectangle for viewport layout-bounds queries.
 *
 * Kept at module scope (rather than as a `static`/instance field on the class)
 * because a `static readonly` *object* field triggers the Rollup class-rename
 * that corrupts `constructor.name` (the HSlider/VSlider bug from 1.0.3), and an
 * instance field with an object initialiser also provokes the rename. The
 * methods that use it are non-reentrant, so sharing one rectangle is safe.
 */
const vpBounds = new Rectangle();

/**
 * Scroller wraps an {@link IViewport} (typically a Group) and provides
 * touch-scrolling, scroll bars, and scroll-policy management.
 *
 * @skinPart horizontalScrollBar — the HScrollBar skin part.
 * @skinPart verticalScrollBar   — the VScrollBar skin part.
 */
export class Scroller extends Component {
	// ── Static fields ─────────────────────────────────────────────────────

	public static readonly DEFAULT_THRESHOLD = 8;

	// ── Instance fields ───────────────────────────────────────────────────

	public horizontalScrollBar?: HScrollBar;
	public verticalScrollBar?: VScrollBar;
	public scrollFactor = 1.0;
	public bounces = true;

	private _viewport?: IViewport;
	private _horizontalScrollPolicy = ScrollPolicy.AUTO;
	private _verticalScrollPolicy = ScrollPolicy.AUTO;
	private _hScroll: TouchScroll;
	private _vScroll: TouchScroll;
	private _touchPointID = -1;
	private _startTouchPointX = 0;
	private _startTouchPointY = 0;
	private _touchMoved = false;
	private _touchCancelled = false;

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor() {
		super();
		this._hScroll = new TouchScroll(this.onHScrollUpdate, this.onHScrollEnd);
		this._vScroll = new TouchScroll(this.onVScrollUpdate, this.onVScrollEnd);
		this.touchChildren = true;
	}

	// ── Getters / Setters ─────────────────────────────────────────────────

	public get viewport(): IViewport | undefined {
		return this._viewport;
	}

	public set viewport(value: IViewport | undefined) {
		if (value === this._viewport) return;
		const old = this._viewport;
		if (old) {
			old.removeEventListener(PropertyEvent.PROPERTY_CHANGE, this._onViewportPropChange);
			old.removeEventListener(TouchEvent.TOUCH_BEGIN, this._onTouchBeginCapture, true);
			old.removeEventListener(TouchEvent.TOUCH_END, this._onTouchEndCapture, true);
			old.removeEventListener(TouchEvent.TOUCH_TAP, this._onTouchTapCapture, true);
			old.scrollEnabled = false;
			const oldDisplay = old as unknown as DisplayObject;
			if (oldDisplay.parent === this) this.removeChild(oldDisplay);
		}
		this._viewport = value;
		if (value) {
			this.addChildAt(value as unknown as DisplayObject, 0);
			value.addEventListener(PropertyEvent.PROPERTY_CHANGE, this._onViewportPropChange);
			value.addEventListener(TouchEvent.TOUCH_BEGIN, this._onTouchBeginCapture, true);
			value.addEventListener(TouchEvent.TOUCH_END, this._onTouchEndCapture, true);
			value.addEventListener(TouchEvent.TOUCH_TAP, this._onTouchTapCapture, true);
			value.scrollEnabled = true;
		}
		this.invalidateDisplayList();
	}

	public get horizontalScrollPolicy(): string {
		return this._horizontalScrollPolicy;
	}

	public set horizontalScrollPolicy(value: string) {
		if (this._horizontalScrollPolicy === value) return;
		this._horizontalScrollPolicy = value;
		this.invalidateDisplayList();
	}

	public get verticalScrollPolicy(): string {
		return this._verticalScrollPolicy;
	}

	public set verticalScrollPolicy(value: string) {
		if (this._verticalScrollPolicy === value) return;
		this._verticalScrollPolicy = value;
		this.invalidateDisplayList();
	}

	// ── Override methods ──────────────────────────────────────────────────

	protected override partAdded(partName: string, instance: unknown): void {
		super.partAdded(partName, instance);
		if (instance instanceof HScrollBar && partName === 'horizontalScrollBar') {
			this.horizontalScrollBar = instance;
			instance.viewport = this._viewport;
		} else if (instance instanceof VScrollBar && partName === 'verticalScrollBar') {
			this.verticalScrollBar = instance;
			instance.viewport = this._viewport;
		}
	}

	protected override partRemoved(partName: string, instance: unknown): void {
		super.partRemoved(partName, instance);
		if (partName === 'horizontalScrollBar') {
			if (instance instanceof HScrollBar) instance.viewport = undefined;
			this.horizontalScrollBar = undefined;
		} else if (partName === 'verticalScrollBar') {
			if (instance instanceof VScrollBar) instance.viewport = undefined;
			this.verticalScrollBar = undefined;
		}
	}

	public override updateDisplayList(unscaledWidth: number, unscaledHeight: number): void {
		super.updateDisplayList(unscaledWidth, unscaledHeight);
		const vp = this._viewport;
		if (vp && isUIComponent(vp)) {
			// Match egret: size the viewport to fill the Scroller and anchor it at (0,0).
			vp.setLayoutBoundsSize(unscaledWidth, unscaledHeight);
			vp.setLayoutBoundsPosition(0, 0);
		}
		this._updateScrollBarVisibility();
	}

	protected override setSkin(skin: Skin | undefined): void {
		super.setSkin(skin);
		// Match egret: after the skin (scroll bars) is applied, re-add the viewport
		// at index 0 so it sits beneath the scroll bars and is never orphaned by
		// the skin application.
		const vp = this._viewport;
		if (vp) {
			this.addChildAt(vp as unknown as DisplayObject, 0);
		}
	}

	public override $onRemoveFromStage(): void {
		super.$onRemoveFromStage();
		this._removeStageTouchListeners();
		this._hScroll.stop();
		this._vScroll.stop();
		this._touchPointID = -1;
	}

	// ── Private methods ───────────────────────────────────────────────────

	private _updateScrollBarVisibility(): void {
		const vp = this._viewport;
		if (!vp) return;

		const b = vpBounds;
		vp.getLayoutBounds(b);
		const vpWidth = b.width;
		const vpHeight = b.height;

		const hsb = this.horizontalScrollBar;
		if (hsb) {
			const maxScrollH = Math.max(0, vp.contentWidth - vpWidth);
			const canScrollH = maxScrollH > 0;
			const policy = this._horizontalScrollPolicy;
			if (policy === ScrollPolicy.ON) {
				hsb.visible = true;
			} else if (policy === ScrollPolicy.OFF) {
				hsb.visible = false;
			} else {
				hsb.visible = canScrollH;
			}
		}

		const vsb = this.verticalScrollBar;
		if (vsb) {
			const maxScrollV = Math.max(0, vp.contentHeight - vpHeight);
			const canScrollV = maxScrollV > 0;
			const policy = this._verticalScrollPolicy;
			if (policy === ScrollPolicy.ON) {
				vsb.visible = true;
			} else if (policy === ScrollPolicy.OFF) {
				vsb.visible = false;
			} else {
				vsb.visible = canScrollV;
			}
		}
	}

	private _onViewportPropChange = (e: Event): void => {
		const pe = e as PropertyEvent;
		switch (pe.property) {
			case 'contentWidth':
			case 'contentHeight':
				this._updateScrollBarVisibility();
				break;
		}
	};

	private _onTouchBeginCapture = (e: Event): void => {
		if (!this._canScroll()) return;
		this._touchCancelled = false;
		this._touchMoved = false;
		this._onTouchBegin(e);
	};

	private _onTouchEndCapture = (e: Event): void => {
		if (this._touchCancelled) {
			e.stopPropagation();
		}
	};

	private _onTouchTapCapture = (e: Event): void => {
		if (this._touchCancelled) {
			e.stopPropagation();
		}
	};

	private _canScroll(): boolean {
		const vp = this._viewport;
		if (!vp) return false;
		const b = vpBounds;
		vp.getLayoutBounds(b);
		return vp.contentWidth > b.width || vp.contentHeight > b.height;
	}

	private _onTouchBegin = (e: Event): void => {
		const te = e as TouchEvent;
		if (this._touchPointID !== -1) return;

		const vp = this._viewport;
		if (!vp) return;

		this._touchPointID = te.touchPointID;
		this._startTouchPointX = te.stageX;
		this._startTouchPointY = te.stageY;

		this._hScroll.stop();
		this._vScroll.stop();

		const stage = this.stage;
		if (stage) {
			stage.addEventListener(TouchEvent.TOUCH_MOVE, this._onTouchMove);
			stage.addEventListener(TouchEvent.TOUCH_END, this._onTouchEnd);
			stage.addEventListener(TouchEvent.TOUCH_CANCEL, this._onTouchEnd);
		}
	};

	private _removeStageTouchListeners(): void {
		const stage = this.stage;
		if (stage) {
			stage.removeEventListener(TouchEvent.TOUCH_MOVE, this._onTouchMove);
			stage.removeEventListener(TouchEvent.TOUCH_END, this._onTouchEnd);
			stage.removeEventListener(TouchEvent.TOUCH_CANCEL, this._onTouchEnd);
		}
	}

	private _onTouchMove = (e: TouchEvent): void => {
		if (e.touchPointID !== this._touchPointID) return;

		const vp = this._viewport;
		if (!vp) return;

		const moveX = this._startTouchPointX - e.stageX;
		const moveY = this._startTouchPointY - e.stageY;

		if (!this._hScroll.isStarted() && !this._vScroll.isStarted()) {
			if (Math.abs(moveX) < Scroller.DEFAULT_THRESHOLD && Math.abs(moveY) < Scroller.DEFAULT_THRESHOLD) {
				return;
			}
			// Scroll gesture confirmed — swallow the upcoming tap so child
			// components (e.g. List items) don't receive a false "click".
			this._touchCancelled = true;
			this._touchMoved = true;
			const tb = vpBounds;
			vp.getLayoutBounds(tb);
			const maxH = Math.max(0, vp.contentWidth - tb.width);
			const maxV = Math.max(0, vp.contentHeight - tb.height);

			if (maxH > 0 && Math.abs(moveX) >= Math.abs(moveY)) {
				this._hScroll.scrollFactor = this.scrollFactor;
				this._hScroll.bounces = this.bounces;
				this._hScroll.start(e.stageX);
			}
			if (maxV > 0 && Math.abs(moveY) >= Math.abs(moveX)) {
				this._vScroll.scrollFactor = this.scrollFactor;
				this._vScroll.bounces = this.bounces;
				this._vScroll.start(e.stageY);
			}
		}

		if (this._hScroll.isStarted()) {
			const b = vpBounds;
			vp.getLayoutBounds(b);
			this._hScroll.update(e.stageX, Math.max(0, vp.contentWidth - b.width), vp.scrollH);
		}
		if (this._vScroll.isStarted()) {
			const b = vpBounds;
			vp.getLayoutBounds(b);
			this._vScroll.update(e.stageY, Math.max(0, vp.contentHeight - b.height), vp.scrollV);
		}
	};

	private _onTouchEnd = (e: TouchEvent): void => {
		if (e.touchPointID !== this._touchPointID) return;

		this._touchPointID = -1;
		this._removeStageTouchListeners();
		const vp = this._viewport;
		if (!vp) return;

		if (this._hScroll.isStarted()) {
			const b = vpBounds;
			vp.getLayoutBounds(b);
			this._hScroll.finish(vp.scrollH, Math.max(0, vp.contentWidth - b.width));
		}
		if (this._vScroll.isStarted()) {
			const b = vpBounds;
			vp.getLayoutBounds(b);
			this._vScroll.finish(vp.scrollV, Math.max(0, vp.contentHeight - b.height));
		}
	};

	private onHScrollUpdate = (scrollPos: number): void => {
		const vp = this._viewport;
		if (vp) vp.scrollH = scrollPos;
	};

	private onVScrollUpdate = (scrollPos: number): void => {
		const vp = this._viewport;
		if (vp) vp.scrollV = scrollPos;
	};

	private onHScrollEnd = (): void => {
		// Horizontal throw animation ended
	};

	private onVScrollEnd = (): void => {
		// Vertical throw animation ended
	};
}
