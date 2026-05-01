import { Sprite, Rectangle, Point, DisplayObject } from '@blakron/core';
import { UIState, isUIComponent } from '../core/UIState.js';
import type { IUIOwner } from '../core/UIState.js';
import type { IUIComponent } from '../core/IUIComponent.js';
import type { IViewport } from '../core/IViewport.js';
import type { ILayoutTarget } from '../layouts/ILayoutTarget.js';
import type { LayoutBase } from '../layouts/LayoutBase.js';
import type { IOverride } from '../states/IOverride.js';
import type { State } from '../states/State.js';
import type { Component } from './Component.js';
import type { Skin } from './Skin.js';
import { PropertyEvent } from '../events/PropertyEvent.js';
import { BasicLayout } from '../layouts/BasicLayout.js';

/**
 * Group is the base container for UI components.
 * It participates in the invalidation/validation layout cycle and
 * delegates child positioning to a pluggable LayoutBase instance.
 */
export class Group extends Sprite implements IUIComponent, IViewport, ILayoutTarget, IUIOwner {
	readonly ui: UIState;

	private _layout: LayoutBase | null = null;
	private _contentWidth = 0;
	private _contentHeight = 0;
	private _scrollEnabled = false;
	private _scrollH = 0;
	private _scrollV = 0;
	private _touchThrough = false;

	// ── View state ────────────────────────────────────────────────────────

	private _states: State[] = [];
	private _statesMap: Record<string, State> = {};
	private _currentState = '';
	private _oldState = '';
	private _explicitState = '';
	private _stateIsDirty = false;
	private _stateInitialized = false;

	constructor() {
		super();
		this.ui = new UIState(this);
		this.touchEnabled = true;
	}

	// ── Stage attachment ──────────────────────────────────────────────────

	override onAddToStage(stage: unknown, nestLevel: number): void {
		super.onAddToStage(stage as never, nestLevel);
		this.ui.onAddToStage();
	}

	// ── Layout ────────────────────────────────────────────────────────────

	get layout(): LayoutBase | null {
		return this._layout;
	}
	set layout(value: LayoutBase | null) {
		if (this._layout === value) return;
		if (this._layout) this._layout.target = null;
		this._layout = value;
		if (value) value.target = this;
		this.invalidateSize();
		this.invalidateDisplayList();
	}

	get contentWidth(): number {
		return this._contentWidth;
	}
	get contentHeight(): number {
		return this._contentHeight;
	}

	setContentSize(w: number, h: number): void {
		w = Math.ceil(+w || 0);
		h = Math.ceil(+h || 0);
		const wChanged = this._contentWidth !== w;
		const hChanged = this._contentHeight !== h;
		if (!wChanged && !hChanged) return;
		this._contentWidth = w;
		this._contentHeight = h;
		if (wChanged) {
			PropertyEvent.dispatchPropertyEvent(this, 'contentWidth');
		}
		if (hChanged) {
			PropertyEvent.dispatchPropertyEvent(this, 'contentHeight');
		}
	}

	// ── IViewport — scrolling ─────────────────────────────────────────────

	get scrollEnabled(): boolean {
		return this._scrollEnabled;
	}
	set scrollEnabled(value: boolean) {
		value = !!value;
		if (this._scrollEnabled === value) return;
		this._scrollEnabled = value;
		this._updateScrollRect();
	}

	get scrollH(): number {
		return this._scrollH;
	}
	set scrollH(value: number) {
		value = +value || 0;
		if (this._scrollH === value) return;
		this._scrollH = value;
		if (this._updateScrollRect() && this._layout) {
			this._layout.scrollPositionChanged();
		}
		PropertyEvent.dispatchPropertyEvent(this, 'scrollH');
	}

	get scrollV(): number {
		return this._scrollV;
	}
	set scrollV(value: number) {
		value = +value || 0;
		if (this._scrollV === value) return;
		this._scrollV = value;
		if (this._updateScrollRect() && this._layout) {
			this._layout.scrollPositionChanged();
		}
		PropertyEvent.dispatchPropertyEvent(this, 'scrollV');
	}

	private _updateScrollRect(): boolean {
		if (this._scrollEnabled) {
			this.scrollRect = new Rectangle(this._scrollH, this._scrollV, this.width, this.height);
		} else if (this.scrollRect) {
			this.scrollRect = undefined;
		}
		return this._scrollEnabled;
	}

	// ── Element access ────────────────────────────────────────────────────

	get numElements(): number {
		return this.numChildren;
	}

	getElementAt(index: number): DisplayObject | undefined {
		return this.getChildAt(index);
	}

	getVirtualElementAt(index: number): DisplayObject | undefined {
		return this.getElementAt(index);
	}

	setVirtualElementIndicesInView(_startIndex: number, _endIndex: number): void {
		// no-op in base Group; overridden by virtual-layout containers
	}

	set elementsContent(value: DisplayObject[]) {
		if (!value) return;
		for (let i = 0; i < value.length; i++) {
			this.addChild(value[i]);
		}
	}

	// ── Touch through ─────────────────────────────────────────────────────

	get touchThrough(): boolean {
		return this._touchThrough;
	}
	set touchThrough(value: boolean) {
		this._touchThrough = !!value;
	}

	override hitTest(stageX: number, stageY: number): DisplayObject | undefined {
		if (!this.visible || (!this.touchEnabled && !this.touchChildren) || this.scaleX === 0 || this.scaleY === 0) {
			return undefined;
		}
		const target = super.hitTest(stageX, stageY);
		if (target || this._touchThrough) return target;
		const point = this.globalToLocal(stageX, stageY, new Point());
		const bounds = new Rectangle(0, 0, this.width, this.height);
		if (this.scrollRect) {
			bounds.x = this.scrollRect.x;
			bounds.y = this.scrollRect.y;
		}
		if (bounds.contains(point.x, point.y)) return this;
		return undefined;
	}

	// ── View state (StateClient equivalent) ───────────────────────────────

	get states(): State[] {
		return this._states;
	}
	set states(value: State[]) {
		if (!value) value = [];
		this._states = value;
		this._statesMap = {};
		for (const state of value) {
			this._statesMap[state.name] = state;
		}
		if (this._stateInitialized) {
			this._commitCurrentState();
		}
	}

	get currentState(): string {
		return this._currentState;
	}
	set currentState(value: string) {
		this._explicitState = value;
		this._currentState = value;
		this._commitCurrentState();
	}

	hasState(stateName: string): boolean {
		return !!this._statesMap[stateName];
	}

	invalidateState(): void {
		if (this._stateIsDirty) return;
		this._stateIsDirty = true;
		this.invalidateProperties();
	}

	protected getCurrentState(): string {
		return '';
	}

	private _commitCurrentState(): void {
		if (!this._stateInitialized) return;
		let destination = this._statesMap[this._currentState];
		if (!destination) {
			if (this._states.length > 0) {
				this._currentState = this._states[0].name;
			} else {
				return;
			}
		}
		if (this._oldState === this._currentState) return;

		const oldStateObj = this._statesMap[this._oldState];
		if (oldStateObj) {
			for (const o of oldStateObj.overrides) {
				o.remove(this as unknown as Component, this as unknown as Skin);
			}
		}

		this._oldState = this._currentState;

		const newStateObj = this._statesMap[this._currentState];
		if (newStateObj) {
			for (const o of newStateObj.overrides) {
				o.apply(this as unknown as Component, this as unknown as Skin);
			}
		}
	}

	private _initializeStates(): void {
		this._stateInitialized = true;
		this._commitCurrentState();
	}

	// ── IUIOwner lifecycle ────────────────────────────────────────────────

	createChildren(): void {
		if (!this._layout) {
			this.layout = new BasicLayout();
		}
		this._initializeStates();
	}
	childrenCreated(): void {}

	commitProperties(): void {
		this.ui.onCommitProperties();
		if (this._stateIsDirty) {
			this._stateIsDirty = false;
			if (!this._explicitState) {
				this._currentState = this.getCurrentState();
				this._commitCurrentState();
			}
		}
	}

	measure(): void {
		if (this._layout) {
			this._layout.measure();
		} else {
			this.setMeasuredSize(0, 0);
		}
	}

	updateDisplayList(w: number, h: number): void {
		if (this._layout) {
			this._layout.updateDisplayList(w, h);
		}
		this._updateScrollRect();
	}

	// ── Child change hooks ────────────────────────────────────────────────

	override childAdded(child: unknown, index: number): void {
		super.childAdded(child as never, index);
		this.invalidateSize();
		this.invalidateDisplayList();
		if (this._layout) this._layout.elementAdded(index);
	}

	override childRemoved(child: unknown, index: number): void {
		super.childRemoved(child as never, index);
		this.invalidateSize();
		this.invalidateDisplayList();
		if (this._layout) this._layout.elementRemoved(index);
	}

	// ── IUIComponent — delegated to UIState ───────────────────────────────

	get includeInLayout(): boolean {
		return this.ui.includeInLayout;
	}
	set includeInLayout(v: boolean) {
		this.ui.includeInLayout = v;
	}

	get left(): number | string {
		return this.ui.left;
	}
	set left(v: number | string) {
		this.ui.left = v;
	}

	get right(): number | string {
		return this.ui.right;
	}
	set right(v: number | string) {
		this.ui.right = v;
	}

	get top(): number | string {
		return this.ui.top;
	}
	set top(v: number | string) {
		this.ui.top = v;
	}

	get bottom(): number | string {
		return this.ui.bottom;
	}
	set bottom(v: number | string) {
		this.ui.bottom = v;
	}

	get horizontalCenter(): number | string {
		return this.ui.horizontalCenter;
	}
	set horizontalCenter(v: number | string) {
		this.ui.horizontalCenter = v;
	}

	get verticalCenter(): number | string {
		return this.ui.verticalCenter;
	}
	set verticalCenter(v: number | string) {
		this.ui.verticalCenter = v;
	}

	get percentWidth(): number {
		return this.ui.percentWidth;
	}
	set percentWidth(v: number) {
		this.ui.percentWidth = v;
	}

	get percentHeight(): number {
		return this.ui.percentHeight;
	}
	set percentHeight(v: number) {
		this.ui.percentHeight = v;
	}

	override get width(): number {
		return this.ui.getWidth();
	}
	override set width(v: number) {
		this.ui.setWidth(v);
	}

	override get height(): number {
		return this.ui.getHeight();
	}
	override set height(v: number) {
		this.ui.setHeight(v);
	}

	get minWidth(): number {
		return this.ui.minWidth;
	}
	set minWidth(v: number) {
		this.ui.minWidth = v;
	}

	get maxWidth(): number {
		return this.ui.maxWidth;
	}
	set maxWidth(v: number) {
		this.ui.maxWidth = v;
	}

	get minHeight(): number {
		return this.ui.minHeight;
	}
	set minHeight(v: number) {
		this.ui.minHeight = v;
	}

	get maxHeight(): number {
		return this.ui.maxHeight;
	}
	set maxHeight(v: number) {
		this.ui.maxHeight = v;
	}

	setMeasuredSize(w: number, h: number): void {
		this.ui.setMeasuredSize(w, h);
	}
	invalidateProperties(): void {
		this.ui.invalidateProperties();
	}
	validateProperties(): void {
		this.ui.validateProperties();
	}
	invalidateSize(): void {
		this.ui.invalidateSize();
	}
	validateSize(recursive?: boolean): void {
		this.ui.validateSize(recursive);
	}
	invalidateDisplayList(): void {
		this.ui.invalidateDisplayList();
	}
	validateDisplayList(): void {
		this.ui.validateDisplayList();
	}
	validateNow(): void {
		this.ui.validateNow();
	}
	setLayoutBoundsSize(lw: number, lh: number): void {
		this.ui.setLayoutBoundsSize(lw, lh);
	}
	setLayoutBoundsPosition(x: number, y: number): void {
		this.ui.setLayoutBoundsPosition(x, y);
	}
	getLayoutBounds(bounds: Rectangle): void {
		this.ui.getLayoutBounds(bounds);
	}
	getPreferredBounds(bounds: Rectangle): void {
		this.ui.getPreferredBounds(bounds);
	}
}

export { isUIComponent };
