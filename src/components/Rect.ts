import { Component } from './Component.js';

/**
 * A rectangular shape component with fill and stroke support.
 * Extends Component and uses the inherited Graphics to draw a filled/stroked rectangle.
 *
 * States: none (non-interactive visual element).
 */
export class Rect extends Component {
	private _fillColor = 0x000000;
	private _fillAlpha = 1;
	private _strokeColor = 0x444444;
	private _strokeAlpha = 1;
	private _strokeWeight = 0;
	private _ellipseWidth = 0;
	private _ellipseHeight = 0;

	constructor(width?: number, height?: number, fillColor?: number) {
		super();
		this.touchChildren = false;
		if (width !== undefined) this.width = width;
		if (height !== undefined) this.height = height;
		if (fillColor !== undefined) this.fillColor = fillColor;
	}

	// ── Fill ────────────────────────────────────────────────────────────

	get fillColor(): number {
		return this._fillColor;
	}

	set fillColor(value: number) {
		if (value === undefined || this._fillColor === value) return;
		this._fillColor = value;
		this.invalidateDisplayList();
	}

	get fillAlpha(): number {
		return this._fillAlpha;
	}

	set fillAlpha(value: number) {
		if (this._fillAlpha === value) return;
		this._fillAlpha = value;
		this.invalidateDisplayList();
	}

	// ── Stroke ──────────────────────────────────────────────────────────

	get strokeColor(): number {
		return this._strokeColor;
	}

	set strokeColor(value: number) {
		if (this._strokeColor === value) return;
		this._strokeColor = value;
		this.invalidateDisplayList();
	}

	get strokeAlpha(): number {
		return this._strokeAlpha;
	}

	set strokeAlpha(value: number) {
		if (this._strokeAlpha === value) return;
		this._strokeAlpha = value;
		this.invalidateDisplayList();
	}

	get strokeWeight(): number {
		return this._strokeWeight;
	}

	set strokeWeight(value: number) {
		if (this._strokeWeight === value) return;
		this._strokeWeight = value;
		this.invalidateDisplayList();
	}

	// ── Ellipse (rounded corners) ───────────────────────────────────────

	get ellipseWidth(): number {
		return this._ellipseWidth;
	}

	set ellipseWidth(value: number) {
		if (this._ellipseWidth === value) return;
		this._ellipseWidth = value;
		this.invalidateDisplayList();
	}

	get ellipseHeight(): number {
		return this._ellipseHeight;
	}

	set ellipseHeight(value: number) {
		if (this._ellipseHeight === value) return;
		this._ellipseHeight = value;
		this.invalidateDisplayList();
	}

	// ── Rendering ───────────────────────────────────────────────────────

	override updateDisplayList(unscaledWidth: number, unscaledHeight: number): void {
		super.updateDisplayList(unscaledWidth, unscaledHeight);

		const g = this.graphics;
		g.clear();

		if (unscaledWidth <= 0 || unscaledHeight <= 0) return;

		const sw = this._strokeWeight;
		const ew = this._ellipseWidth;
		const eh = this._ellipseHeight;
		const isRound = ew !== 0 || eh !== 0;

		// Draw stroke border first (if any)
		if (sw > 0) {
			g.beginFill(this._fillColor, 0);
			g.lineStyle(sw, this._strokeColor, this._strokeAlpha);
			if (isRound) {
				g.drawRoundRect(sw / 2, sw / 2, unscaledWidth - sw, unscaledHeight - sw, ew, eh);
			} else {
				g.drawRect(sw / 2, sw / 2, unscaledWidth - sw, unscaledHeight - sw);
			}
			g.endFill();
		}

		// Draw fill
		g.beginFill(this._fillColor, this._fillAlpha);
		g.lineStyle(sw, this._strokeColor, 0);
		if (isRound) {
			g.drawRoundRect(sw, sw, unscaledWidth - sw * 2, unscaledHeight - sw * 2, ew, eh);
		} else {
			g.drawRect(sw, sw, unscaledWidth - sw * 2, unscaledHeight - sw * 2);
		}
		g.endFill();
	}
}
