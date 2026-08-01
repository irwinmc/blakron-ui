import { Component } from './Component.js';
import { Event, Rectangle } from '@blakron/core';
import { Direction } from '../core/Direction.js';
import type { Label } from './Label.js';

/**
 * ProgressBar component that visualizes the progress of a task over time.
 *
 * The progress bar fills from `minimum` to `maximum` based on the current `value`.
 * The direction of fill is controlled by the `direction` property.
 *
 * States: none (non-interactive visual element).
 */
export class ProgressBar extends Component {
	// ── Instance fields ───────────────────────────────────────────────────

	public thumb?: Component;
	public labelDisplay?: Label;

	private _minimum = 0;
	private _maximum = 100;
	private _value = 0;
	private _direction = Direction.LTR;
	private _labelFunction?: (value: number, maximum: number) => string;

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor() {
		super();
	}

	// ── Getters / Setters ─────────────────────────────────────────────────

	public get minimum(): number {
		return this._minimum;
	}

	public set minimum(value: number) {
		if (this._minimum === value) return;
		this._minimum = value;
		if (this._value < value) this._value = value;
		this.invalidateDisplayList();
	}

	public get maximum(): number {
		return this._maximum;
	}

	public set maximum(value: number) {
		if (this._maximum === value) return;
		this._maximum = value;
		if (this._value > value) this._value = value;
		this.invalidateDisplayList();
	}

	public get value(): number {
		return this._value;
	}

	public set value(val: number) {
		val = Math.max(this._minimum, Math.min(this._maximum, val));
		if (this._value === val) return;
		this._value = val;
		this.invalidateDisplayList();
		this.dispatchEventWith(Event.CHANGE);
	}

	public get direction(): string {
		return this._direction;
	}

	public set direction(value: string) {
		if (this._direction === value) return;
		this._direction = value;
		this.invalidateDisplayList();
	}

	public get labelFunction(): ((value: number, maximum: number) => string) | undefined {
		return this._labelFunction;
	}

	public set labelFunction(fn: ((value: number, maximum: number) => string) | undefined) {
		if (this._labelFunction === fn) return;
		this._labelFunction = fn;
		this.invalidateDisplayList();
	}

	public get ratio(): number {
		const range = this._maximum - this._minimum;
		if (range <= 0) return 0;
		return (this._value - this._minimum) / range;
	}

	// ── Override methods ──────────────────────────────────────────────────

	public override updateDisplayList(unscaledWidth: number, unscaledHeight: number): void {
		super.updateDisplayList(unscaledWidth, unscaledHeight);

		const thumb = this.thumb;
		if (thumb) {
			const thumbWidth = thumb.width;
			const thumbHeight = thumb.height;
			const r = this.ratio;
			let clipW = Math.round(r * thumbWidth);
			if (clipW < 0 || clipW === Infinity) clipW = 0;
			let clipH = Math.round(r * thumbHeight);
			if (clipH < 0 || clipH === Infinity) clipH = 0;

			const rect = thumb.scrollRect ?? new Rectangle();
			switch (this._direction) {
				case Direction.RTL:
					rect.setTo(thumbWidth - clipW, 0, clipW, thumbHeight);
					thumb.x = thumbWidth - clipW;
					break;
				case Direction.TTB:
					rect.setTo(0, 0, thumbWidth, clipH);
					break;
				case Direction.BTT:
					rect.setTo(0, thumbHeight - clipH, thumbWidth, clipH);
					thumb.y = thumbHeight - clipH;
					break;
				default: // LTR
					rect.setTo(0, 0, clipW, thumbHeight);
					break;
			}
			thumb.scrollRect = rect;
		}

		if (this.labelDisplay) {
			this.labelDisplay.text = this._valueToLabel(this._value, this._maximum);
		}
	}

	// ── Protected methods ─────────────────────────────────────────────────

	/**
	 * Converts the current value to display text.
	 * Override this method to customize the label format.
	 * The default format is `"value / maximum"`.
	 */
	protected _valueToLabel(value: number, maximum: number): string {
		if (this._labelFunction) {
			return this._labelFunction(value, maximum);
		}
		return value + ' / ' + maximum;
	}
}
