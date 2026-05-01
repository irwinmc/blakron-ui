import { Sprite, Rectangle } from '@blakron/core';
import { UIState, isUIComponent } from '../core/UIState.js';
import type { IUIOwner } from '../core/UIState.js';
import type { IUIComponent } from '../core/IUIComponent.js';
import type { ILayoutTarget } from '../layouts/ILayoutTarget.js';
import type { LayoutBase } from '../layouts/LayoutBase.js';

/**
 * Group is the base container for UI components.
 * It participates in the invalidation/validation layout cycle and
 * delegates child positioning to a pluggable LayoutBase instance.
 */
export class Group extends Sprite implements IUIComponent, ILayoutTarget, IUIOwner {
	readonly ui: UIState;

	private _layout: LayoutBase | null = null;
	private _contentWidth = 0;
	private _contentHeight = 0;

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
		this._contentWidth = w;
		this._contentHeight = h;
	}

	// ── IUIOwner lifecycle ────────────────────────────────────────────────

	createChildren(): void {}
	childrenCreated(): void {}

	commitProperties(): void {
		this.ui.onCommitProperties();
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
