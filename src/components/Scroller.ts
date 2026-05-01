import { TouchEvent, Event, Rectangle } from '@blakron/core';
import type { IEventDispatcher } from '@blakron/core';
import { Component } from './Component.js';
import type { IViewport } from '../core/IViewport.js';
import { ScrollPolicy } from '../core/ScrollPolicy.js';
import { TouchScroll } from './TouchScroll.js';
import { HScrollBar } from './HScrollBar.js';
import { VScrollBar } from './VScrollBar.js';
import { PropertyEvent } from '../events/PropertyEvent.js';

/**
 * Scroller wraps an {@link IViewport} (typically a Group) and provides
 * touch-scrolling, scroll bars, and scroll-policy management.
 *
 * @skinPart horizontalScrollBar — the HScrollBar skin part.
 * @skinPart verticalScrollBar   — the VScrollBar skin part.
 */
export class Scroller extends Component {
	// ── Skin parts ──────────────────────────────────────────────────────

	/** [SkinPart] Horizontal scroll bar. */
	horizontalScrollBar?: HScrollBar;
	/** [SkinPart] Vertical scroll bar. */
	verticalScrollBar?: VScrollBar;

	// ── Private state ───────────────────────────────────────────────────

	private _viewport: IViewport | undefined;
	private _horizontalScrollPolicy = ScrollPolicy.AUTO;
	private _verticalScrollPolicy = ScrollPolicy.AUTO;

	/** Scroll throw speed multiplier. */
	scrollFactor = 1.0;
	/** Whether content bounces when dragged past the edge. */
	bounces = true;

	private _hScroll: TouchScroll;
	private _vScroll: TouchScroll;

	// Touch tracking
	private _touchPointID = -1;
	private _startTouchPointX = 0;
	private _startTouchPointY = 0;

	/** Reusable Rectangle for viewport bounds queries. */
	private static readonly _vpBounds = new Rectangle();

	/** Scroll begin threshold in pixels. */
	static readonly DEFAULT_THRESHOLD = 8;

	// ── Constructor ─────────────────────────────────────────────────────

	constructor() {
		super();
		this._hScroll = new TouchScroll(this.onHScrollUpdate, this.onHScrollEnd);
		this._vScroll = new TouchScroll(this.onVScrollUpdate, this.onVScrollEnd);
		this.touchChildren = true;
	}

	// ── viewport ────────────────────────────────────────────────────────

	get viewport(): IViewport | undefined {
		return this._viewport;
	}
	set viewport(value: IViewport | undefined) {
		if (value === this._viewport) return;
		const old = this._viewport;
		if (old) {
			const d = old as unknown as IEventDispatcher;
			d.removeEventListener(PropertyEvent.PROPERTY_CHANGE, this._onViewportPropChange);
			d.removeEventListener(TouchEvent.TOUCH_BEGIN, this._onTouchBegin);
			d.removeEventListener(TouchEvent.TOUCH_MOVE, this._onTouchMove);
			d.removeEventListener(TouchEvent.TOUCH_END, this._onTouchEnd);
			d.removeEventListener(TouchEvent.TOUCH_CANCEL, this._onTouchEnd);
		}
		this._viewport = value;
		if (value) {
			const d = value as unknown as IEventDispatcher;
			d.addEventListener(PropertyEvent.PROPERTY_CHANGE, this._onViewportPropChange);
			d.addEventListener(TouchEvent.TOUCH_BEGIN, this._onTouchBegin);
			d.addEventListener(TouchEvent.TOUCH_MOVE, this._onTouchMove);
			d.addEventListener(TouchEvent.TOUCH_END, this._onTouchEnd);
			d.addEventListener(TouchEvent.TOUCH_CANCEL, this._onTouchEnd);
			value.scrollEnabled = true;
		}
		this.invalidateDisplayList();
	}

	// ── Scroll policies ─────────────────────────────────────────────────

	get horizontalScrollPolicy(): string {
		return this._horizontalScrollPolicy;
	}
	set horizontalScrollPolicy(value: string) {
		if (this._horizontalScrollPolicy === value) return;
		this._horizontalScrollPolicy = value;
		this.invalidateDisplayList();
	}

	get verticalScrollPolicy(): string {
		return this._verticalScrollPolicy;
	}
	set verticalScrollPolicy(value: string) {
		if (this._verticalScrollPolicy === value) return;
		this._verticalScrollPolicy = value;
		this.invalidateDisplayList();
	}

	// ── Skin part lifecycle ─────────────────────────────────────────────

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

	// ── updateDisplayList ───────────────────────────────────────────────

	override updateDisplayList(unscaledWidth: number, unscaledHeight: number): void {
		super.updateDisplayList(unscaledWidth, unscaledHeight);
		this.updateScrollBarVisibility();
	}

	// ── Scroll bar visibility ───────────────────────────────────────────

	private updateScrollBarVisibility(): void {
		const vp = this._viewport;
		if (!vp) return;

		const b = Scroller._vpBounds;
		vp.getLayoutBounds(b);
		const vpWidth = b.width;
		const vpHeight = b.height;

		// Horizontal
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
				// AUTO
				hsb.visible = canScrollH;
			}
		}

		// Vertical
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
				// AUTO
				vsb.visible = canScrollV;
			}
		}
	}

	// ── Viewport property change ────────────────────────────────────────

	private _onViewportPropChange = (e: Event): void => {
		const pe = e as PropertyEvent;
		switch (pe.property) {
			case 'contentWidth':
			case 'contentHeight':
				this.updateScrollBarVisibility();
				break;
		}
	};

	// ── Touch handlers ──────────────────────────────────────────────────

	private _onTouchBegin = (e: Event): void => {
		const te = e as TouchEvent;
		if (this._touchPointID !== -1) return; // already tracking

		const vp = this._viewport;
		if (!vp) return;

		this._touchPointID = te.touchPointID;
		this._startTouchPointX = te.stageX;
		this._startTouchPointY = te.stageY;

		this._hScroll.stop();
		this._vScroll.stop();
	};

	private _onTouchMove = (e: Event): void => {
		const te = e as TouchEvent;
		if (te.touchPointID !== this._touchPointID) return;

		const vp = this._viewport;
		if (!vp) return;

		const moveX = this._startTouchPointX - te.stageX;
		const moveY = this._startTouchPointY - te.stageY;

		if (!this._hScroll.isStarted() && !this._vScroll.isStarted()) {
			// Check if we've passed the threshold
			if (Math.abs(moveX) < Scroller.DEFAULT_THRESHOLD && Math.abs(moveY) < Scroller.DEFAULT_THRESHOLD) {
				return;
			}
			// Start scrolling in the direction with larger movement
			const tb = Scroller._vpBounds;
			vp.getLayoutBounds(tb);
			const maxH = Math.max(0, vp.contentWidth - tb.width);
			const maxV = Math.max(0, vp.contentHeight - tb.height);

			if (maxH > 0 && Math.abs(moveX) >= Math.abs(moveY)) {
				this._hScroll.scrollFactor = this.scrollFactor;
				this._hScroll.bounces = this.bounces;
				this._hScroll.start(te.stageX);
			}
			if (maxV > 0 && Math.abs(moveY) >= Math.abs(moveX)) {
				this._vScroll.scrollFactor = this.scrollFactor;
				this._vScroll.bounces = this.bounces;
				this._vScroll.start(te.stageY);
			}
		}

		if (this._hScroll.isStarted()) {
			const b = Scroller._vpBounds;
			vp.getLayoutBounds(b);
			this._hScroll.update(te.stageX, Math.max(0, vp.contentWidth - b.width), vp.scrollH);
		}
		if (this._vScroll.isStarted()) {
			const b = Scroller._vpBounds;
			vp.getLayoutBounds(b);
			this._vScroll.update(te.stageY, Math.max(0, vp.contentHeight - b.height), vp.scrollV);
		}
	};

	private _onTouchEnd = (e: Event): void => {
		const te = e as TouchEvent;
		if (te.touchPointID !== this._touchPointID) return;

		this._touchPointID = -1;
		const vp = this._viewport;
		if (!vp) return;

		if (this._hScroll.isStarted()) {
			const b = Scroller._vpBounds;
			vp.getLayoutBounds(b);
			this._hScroll.finish(vp.scrollH, Math.max(0, vp.contentWidth - b.width));
		}
		if (this._vScroll.isStarted()) {
			const b = Scroller._vpBounds;
			vp.getLayoutBounds(b);
			this._vScroll.finish(vp.scrollV, Math.max(0, vp.contentHeight - b.height));
		}
	};

	// ── TouchScroll callbacks ───────────────────────────────────────────

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
