import { DisplayObject, DisplayObjectContainer, Rectangle, Matrix, Event } from '@blakron/core';
import type { IUIComponent } from './IUIComponent.js';
import { validator } from './Validator.js';
import { UIEvent } from '../events/UIEvent.js';

// ── Internal state keys (numeric enum for compact storage) ────────────────────

const enum K {
	left,
	right,
	top,
	bottom,
	horizontalCenter,
	verticalCenter,
	percentWidth,
	percentHeight,
	explicitWidth,
	explicitHeight,
	width,
	height,
	minWidth,
	maxWidth,
	minHeight,
	maxHeight,
	measuredWidth,
	measuredHeight,
	oldPreferWidth,
	oldPreferHeight,
	oldX,
	oldY,
	oldWidth,
	oldHeight,
	invalidatePropertiesFlag,
	invalidateSizeFlag,
	invalidateDisplayListFlag,
	layoutWidthExplicitlySet,
	layoutHeightExplicitlySet,
	initialized,
}

function isDeltaIdentity(m: Matrix): boolean {
	return m.a === 1 && m.b === 0 && m.c === 0 && m.d === 1;
}

function formatRelative(value: number | string, total: number): number {
	if (typeof value === 'number' || !value) return +(value as number);
	const s = value as string;
	const pct = s.indexOf('%');
	if (pct === -1) return +s;
	return +s.substring(0, pct) * 0.01 * total;
}

// ── UIComponent mixin implementation ─────────────────────────────────────────

/**
 * Base mixin that implements the IUIComponent layout contract on top of any
 * DisplayObject subclass.
 *
 * Usage: extend UIComponentBase (which already applies the mixin to Sprite),
 * or call `implementUIComponent(MyClass)` to apply it to a custom class.
 */
export class UIComponentImpl extends DisplayObject implements IUIComponent {
	/** @internal packed state bag — avoids per-property field overhead */
	declare $ui: Record<number, number | boolean>;
	declare $includeInLayout: boolean;

	/** Nest depth in the display tree — set by Stage/DisplayObjectContainer. */
	declare nestLevel: number;

	constructor() {
		super();
		this._initUIValues();
	}

	private _initUIValues(): void {
		this.$ui = {
			[K.left]: NaN,
			[K.right]: NaN,
			[K.top]: NaN,
			[K.bottom]: NaN,
			[K.horizontalCenter]: NaN,
			[K.verticalCenter]: NaN,
			[K.percentWidth]: NaN,
			[K.percentHeight]: NaN,
			[K.explicitWidth]: NaN,
			[K.explicitHeight]: NaN,
			[K.width]: 0,
			[K.height]: 0,
			[K.minWidth]: 0,
			[K.maxWidth]: 100000,
			[K.minHeight]: 0,
			[K.maxHeight]: 100000,
			[K.measuredWidth]: 0,
			[K.measuredHeight]: 0,
			[K.oldPreferWidth]: NaN,
			[K.oldPreferHeight]: NaN,
			[K.oldX]: 0,
			[K.oldY]: 0,
			[K.oldWidth]: 0,
			[K.oldHeight]: 0,
			[K.invalidatePropertiesFlag]: true,
			[K.invalidateSizeFlag]: true,
			[K.invalidateDisplayListFlag]: true,
			[K.layoutWidthExplicitlySet]: false,
			[K.layoutHeightExplicitlySet]: false,
			[K.initialized]: false,
		};
		this.$includeInLayout = true;
		this.touchEnabled = true;
	}

	// ── Lifecycle hooks (override in subclasses) ──────────────────────────

	/** Called once when the component is first added to stage. */
	protected createChildren(): void {}

	/** Called after createChildren(). */
	protected childrenCreated(): void {}

	/** Apply pending property changes. Override to react to invalidateProperties(). */
	protected commitProperties(): void {
		const v = this.$ui;
		if (v[K.oldWidth] !== v[K.width] || v[K.oldHeight] !== v[K.height]) {
			this.dispatchEventWith(Event.RESIZE);
			v[K.oldWidth] = v[K.width];
			v[K.oldHeight] = v[K.height];
		}
		if (v[K.oldX] !== this.x || v[K.oldY] !== this.y) {
			UIEvent.dispatchUIEvent(this, UIEvent.MOVE);
			v[K.oldX] = this.x;
			v[K.oldY] = this.y;
		}
	}

	/** Measure preferred size. Override to set measuredWidth/measuredHeight. */
	protected measure(): void {}

	/** Position and size children. Override to implement custom layout. */
	protected updateDisplayList(_w: number, _h: number): void {}

	// ── Stage attachment ──────────────────────────────────────────────────

	override onAddToStage(stage: unknown, nestLevel: number): void {
		super.onAddToStage(stage as never, nestLevel);
		this._checkInvalidateFlag();
		const v = this.$ui;
		if (!v[K.initialized]) {
			v[K.initialized] = true;
			this.createChildren();
			this.childrenCreated();
			UIEvent.dispatchUIEvent(this, UIEvent.CREATION_COMPLETE);
		}
	}

	private _checkInvalidateFlag(): void {
		const v = this.$ui;
		if (v[K.invalidatePropertiesFlag]) validator.invalidateProperties(this as never);
		if (v[K.invalidateSizeFlag]) validator.invalidateSize(this as never);
		if (v[K.invalidateDisplayListFlag]) validator.invalidateDisplayList(this as never);
	}

	// ── includeInLayout ───────────────────────────────────────────────────

	get includeInLayout(): boolean {
		return this.$includeInLayout;
	}
	set includeInLayout(value: boolean) {
		value = !!value;
		if (this.$includeInLayout === value) return;
		this.$includeInLayout = true;
		this._invalidateParentLayout();
		this.$includeInLayout = value;
	}

	// ── Anchor constraints ────────────────────────────────────────────────

	get left(): number | string {
		return this.$ui[K.left] as number;
	}
	set left(value: number | string) {
		const v = typeof value === 'number' || !value ? +value : String(value).trim();
		if (this.$ui[K.left] === v) return;
		this.$ui[K.left] = v as number;
		this._invalidateParentLayout();
	}

	get right(): number | string {
		return this.$ui[K.right] as number;
	}
	set right(value: number | string) {
		const v = typeof value === 'number' || !value ? +value : String(value).trim();
		if (this.$ui[K.right] === v) return;
		this.$ui[K.right] = v as number;
		this._invalidateParentLayout();
	}

	get top(): number | string {
		return this.$ui[K.top] as number;
	}
	set top(value: number | string) {
		const v = typeof value === 'number' || !value ? +value : String(value).trim();
		if (this.$ui[K.top] === v) return;
		this.$ui[K.top] = v as number;
		this._invalidateParentLayout();
	}

	get bottom(): number | string {
		return this.$ui[K.bottom] as number;
	}
	set bottom(value: number | string) {
		const v = typeof value === 'number' || !value ? +value : String(value).trim();
		if (this.$ui[K.bottom] === v) return;
		this.$ui[K.bottom] = v as number;
		this._invalidateParentLayout();
	}

	get horizontalCenter(): number | string {
		return this.$ui[K.horizontalCenter] as number;
	}
	set horizontalCenter(value: number | string) {
		const v = typeof value === 'number' || !value ? +value : String(value).trim();
		if (this.$ui[K.horizontalCenter] === v) return;
		this.$ui[K.horizontalCenter] = v as number;
		this._invalidateParentLayout();
	}

	get verticalCenter(): number | string {
		return this.$ui[K.verticalCenter] as number;
	}
	set verticalCenter(value: number | string) {
		const v = typeof value === 'number' || !value ? +value : String(value).trim();
		if (this.$ui[K.verticalCenter] === v) return;
		this.$ui[K.verticalCenter] = v as number;
		this._invalidateParentLayout();
	}

	// ── Percentage sizing ─────────────────────────────────────────────────

	get percentWidth(): number {
		return this.$ui[K.percentWidth] as number;
	}
	set percentWidth(value: number) {
		value = +value;
		if (this.$ui[K.percentWidth] === value) return;
		this.$ui[K.percentWidth] = value;
		this._invalidateParentLayout();
	}

	get percentHeight(): number {
		return this.$ui[K.percentHeight] as number;
	}
	set percentHeight(value: number) {
		value = +value;
		if (this.$ui[K.percentHeight] === value) return;
		this.$ui[K.percentHeight] = value;
		this._invalidateParentLayout();
	}

	// ── Explicit / measured sizes ─────────────────────────────────────────

	// explicitWidth/explicitHeight are plain properties on DisplayObject.
	// We keep them in sync via the width/height setters below.

	override get width(): number {
		this._validateSizeNow();
		return this.$ui[K.width] as number;
	}
	override set width(value: number) {
		value = +value;
		const v = this.$ui;
		if (value < 0 || (v[K.width] === value && this.explicitWidth === value)) return;
		this.explicitWidth = value;
		if (isNaN(value)) this.invalidateSize();
		this.invalidateProperties();
		this.invalidateDisplayList();
		this._invalidateParentLayout();
	}

	override get height(): number {
		this._validateSizeNow();
		return this.$ui[K.height] as number;
	}
	override set height(value: number) {
		value = +value;
		const v = this.$ui;
		if (value < 0 || (v[K.height] === value && this.explicitHeight === value)) return;
		this.explicitHeight = value;
		if (isNaN(value)) this.invalidateSize();
		this.invalidateProperties();
		this.invalidateDisplayList();
		this._invalidateParentLayout();
	}

	get minWidth(): number {
		return this.$ui[K.minWidth] as number;
	}
	set minWidth(value: number) {
		value = +value || 0;
		if (value < 0 || this.$ui[K.minWidth] === value) return;
		this.$ui[K.minWidth] = value;
		this.invalidateSize();
		this._invalidateParentLayout();
	}

	get maxWidth(): number {
		return this.$ui[K.maxWidth] as number;
	}
	set maxWidth(value: number) {
		value = +value || 0;
		if (value < 0 || this.$ui[K.maxWidth] === value) return;
		this.$ui[K.maxWidth] = value;
		this.invalidateSize();
		this._invalidateParentLayout();
	}

	get minHeight(): number {
		return this.$ui[K.minHeight] as number;
	}
	set minHeight(value: number) {
		value = +value || 0;
		if (value < 0 || this.$ui[K.minHeight] === value) return;
		this.$ui[K.minHeight] = value;
		this.invalidateSize();
		this._invalidateParentLayout();
	}

	get maxHeight(): number {
		return this.$ui[K.maxHeight] as number;
	}
	set maxHeight(value: number) {
		value = +value || 0;
		if (value < 0 || this.$ui[K.maxHeight] === value) return;
		this.$ui[K.maxHeight] = value;
		this.invalidateSize();
		this._invalidateParentLayout();
	}

	// ── Invalidation cycle ────────────────────────────────────────────────

	setMeasuredSize(width: number, height: number): void {
		this.$ui[K.measuredWidth] = Math.ceil(+width || 0);
		this.$ui[K.measuredHeight] = Math.ceil(+height || 0);
	}

	invalidateProperties(): void {
		const v = this.$ui;
		if (!v[K.invalidatePropertiesFlag]) {
			v[K.invalidatePropertiesFlag] = true;
			if (this.stage) validator.invalidateProperties(this as never);
		}
	}

	validateProperties(): void {
		const v = this.$ui;
		if (v[K.invalidatePropertiesFlag]) {
			this.commitProperties();
			v[K.invalidatePropertiesFlag] = false;
		}
	}

	invalidateSize(): void {
		const v = this.$ui;
		if (!v[K.invalidateSizeFlag]) {
			v[K.invalidateSizeFlag] = true;
			if (this.stage) validator.invalidateSize(this as never);
		}
	}

	validateSize(recursive = false): void {
		if (recursive && this instanceof DisplayObjectContainer) {
			for (let i = 0; i < this.numChildren; i++) {
				const child = this.getChildAt(i);
				if (child && isUIComponent(child)) child.validateSize(true);
			}
		}
		const v = this.$ui;
		if (v[K.invalidateSizeFlag]) {
			if (this._measureSizes()) {
				this.invalidateDisplayList();
				this._invalidateParentLayout();
			}
			v[K.invalidateSizeFlag] = false;
		}
	}

	invalidateDisplayList(): void {
		const v = this.$ui;
		if (!v[K.invalidateDisplayListFlag]) {
			v[K.invalidateDisplayListFlag] = true;
			if (this.stage) validator.invalidateDisplayList(this as never);
		}
	}

	validateDisplayList(): void {
		const v = this.$ui;
		if (v[K.invalidateDisplayListFlag]) {
			this._updateFinalSize();
			this.updateDisplayList(v[K.width] as number, v[K.height] as number);
			v[K.invalidateDisplayListFlag] = false;
		}
	}

	validateNow(): void {
		if (this.stage) validator.validateClient(this as never);
	}

	// ── Layout bounds ─────────────────────────────────────────────────────

	setLayoutBoundsSize(layoutWidth: number, layoutHeight: number): void {
		layoutWidth = +layoutWidth;
		layoutHeight = +layoutHeight;
		if (layoutWidth < 0 || layoutHeight < 0) return;

		const v = this.$ui;
		const maxW = v[K.maxWidth] as number;
		const maxH = v[K.maxHeight] as number;
		const minW = Math.min(v[K.minWidth] as number, maxW);
		const minH = Math.min(v[K.minHeight] as number, maxH);

		let w: number, h: number;
		if (isNaN(layoutWidth)) {
			v[K.layoutWidthExplicitlySet] = false;
			w = this._preferredUWidth();
		} else {
			v[K.layoutWidthExplicitlySet] = true;
			w = Math.max(minW, Math.min(maxW, layoutWidth));
		}
		if (isNaN(layoutHeight)) {
			v[K.layoutHeightExplicitlySet] = false;
			h = this._preferredUHeight();
		} else {
			v[K.layoutHeightExplicitlySet] = true;
			h = Math.max(minH, Math.min(maxH, layoutHeight));
		}

		const m = this._anchorMatrix();
		if (isDeltaIdentity(m)) {
			this._setActualSize(w, h);
			return;
		}
		// With rotation/scale: fit the unscaled size into the layout bounds
		const fit = fitBounds(
			layoutWidth,
			layoutHeight,
			m,
			this.explicitWidth,
			this.explicitHeight,
			this._preferredUWidth(),
			this._preferredUHeight(),
			minW,
			minH,
			maxW,
			maxH,
		);
		this._setActualSize(fit.w, fit.h);
	}

	setLayoutBoundsPosition(x: number, y: number): void {
		const m = this.matrix;
		if (!isDeltaIdentity(m) || this.anchorOffsetX !== 0 || this.anchorOffsetY !== 0) {
			const bounds = new Rectangle();
			this.getLayoutBounds(bounds);
			x += this.x - bounds.x;
			y += this.y - bounds.y;
		}
		const prevX = this.x,
			prevY = this.y;
		this.x = x;
		this.y = y;
		if (this.x !== prevX || this.y !== prevY) {
			UIEvent.dispatchUIEvent(this, UIEvent.MOVE);
		}
	}

	getLayoutBounds(bounds: Rectangle): void {
		const v = this.$ui;
		const w = (v[K.layoutWidthExplicitlySet] as boolean)
			? (v[K.width] as number)
			: isNaN(this.explicitWidth)
				? (v[K.measuredWidth] as number)
				: (this.explicitWidth);
		const h = (v[K.layoutHeightExplicitlySet] as boolean)
			? (v[K.height] as number)
			: isNaN(this.explicitHeight)
				? (v[K.measuredHeight] as number)
				: (this.explicitHeight);
		this._applyMatrix(bounds, w, h);
	}

	getPreferredBounds(bounds: Rectangle): void {
		this._applyMatrix(bounds, this._preferredUWidth(), this._preferredUHeight());
	}

	// ── Private helpers ───────────────────────────────────────────────────

	private _preferredUWidth(): number {
		const v = this.$ui;
		return isNaN(this.explicitWidth) ? (v[K.measuredWidth] as number) : (this.explicitWidth);
	}

	private _preferredUHeight(): number {
		const v = this.$ui;
		return isNaN(this.explicitHeight) ? (v[K.measuredHeight] as number) : (this.explicitHeight);
	}

	private _setActualSize(w: number, h: number): void {
		const v = this.$ui;
		let changed = false;
		if (v[K.width] !== w) {
			v[K.width] = w;
			changed = true;
		}
		if (v[K.height] !== h) {
			v[K.height] = h;
			changed = true;
		}
		if (changed) {
			this.invalidateDisplayList();
			this.dispatchEventWith(Event.RESIZE);
		}
	}

	private _validateSizeNow(): void {
		this.validateSize(true);
		this._updateFinalSize();
	}

	private _updateFinalSize(): void {
		const v = this.$ui;
		const w = (v[K.layoutWidthExplicitlySet] as boolean)
			? (v[K.width] as number)
			: isNaN(this.explicitWidth)
				? (v[K.measuredWidth] as number)
				: (this.explicitWidth);
		const h = (v[K.layoutHeightExplicitlySet] as boolean)
			? (v[K.height] as number)
			: isNaN(this.explicitHeight)
				? (v[K.measuredHeight] as number)
				: (this.explicitHeight);
		this._setActualSize(w, h);
	}

	private _measureSizes(): boolean {
		const v = this.$ui;
		if (!v[K.invalidateSizeFlag]) return false;
		if (isNaN(this.explicitWidth) || isNaN(this.explicitHeight)) {
			this.measure();
			v[K.measuredWidth] = Math.max(
				Math.min(v[K.measuredWidth] as number, v[K.maxWidth] as number),
				v[K.minWidth] as number,
			);
			v[K.measuredHeight] = Math.max(
				Math.min(v[K.measuredHeight] as number, v[K.maxHeight] as number),
				v[K.minHeight] as number,
			);
		}
		const pw = this._preferredUWidth();
		const ph = this._preferredUHeight();
		if (pw !== v[K.oldPreferWidth] || ph !== v[K.oldPreferHeight]) {
			v[K.oldPreferWidth] = pw;
			v[K.oldPreferHeight] = ph;
			return true;
		}
		return false;
	}

	protected _invalidateParentLayout(): void {
		const parent = this.parent;
		if (!parent || !this.$includeInLayout || !isUIComponent(parent)) return;
		parent.invalidateSize();
		parent.invalidateDisplayList();
	}

	private _applyMatrix(bounds: Rectangle, w: number, h: number): void {
		bounds.setTo(0, 0, w, h);
		const m = this._anchorMatrix();
		if (isDeltaIdentity(m)) {
			bounds.x += m.tx;
			bounds.y += m.ty;
		} else {
			// transform bounds by matrix
			const { a, b, c, d, tx, ty } = m;
			const x1 = tx,
				y1 = ty;
			const x2 = a * w + tx,
				y2 = b * w + ty;
			const x3 = c * h + tx,
				y3 = d * h + ty;
			const x4 = a * w + c * h + tx,
				y4 = b * w + d * h + ty;
			bounds.x = Math.min(x1, x2, x3, x4);
			bounds.y = Math.min(y1, y2, y3, y4);
			bounds.width = Math.max(x1, x2, x3, x4) - bounds.x;
			bounds.height = Math.max(y1, y2, y3, y4) - bounds.y;
		}
	}

	private _anchorMatrix(): Matrix {
		const m = this.matrix;
		const ox = this.anchorOffsetX,
			oy = this.anchorOffsetY;
		if (ox === 0 && oy === 0) return m;
		// pre-multiply by translation(-ox, -oy)
		return new Matrix(m.a, m.b, m.c, m.d, m.a * -ox + m.c * -oy + m.tx, m.b * -ox + m.d * -oy + m.ty);
	}
}

// ── Type guard ────────────────────────────────────────────────────────────────

export function isUIComponent(obj: unknown): obj is IUIComponent {
	return obj instanceof UIComponentImpl;
}

// ── fitBounds helper (replaces MatrixUtil.fitBounds) ─────────────────────────

function fitBounds(
	layoutW: number,
	layoutH: number,
	matrix: Matrix,
	explicitW: number,
	explicitH: number,
	preferredW: number,
	preferredH: number,
	minW: number,
	minH: number,
	maxW: number,
	maxH: number,
): { w: number; h: number } {
	// Simplified: if no explicit size, use preferred clamped to min/max
	const w = isNaN(explicitW) ? Math.max(minW, Math.min(maxW, preferredW)) : Math.max(minW, Math.min(maxW, explicitW));
	const h = isNaN(explicitH) ? Math.max(minH, Math.min(maxH, preferredH)) : Math.max(minH, Math.min(maxH, explicitH));
	return { w, h };
}
