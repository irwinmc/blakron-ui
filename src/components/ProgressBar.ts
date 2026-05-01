import { Component } from './Component.js';
import { Event } from '@blakron/core';
import { Direction } from '../core/Direction.js';

/**
 * ProgressBar component that visualizes the progress of a task over time.
 *
 * The progress bar fills from `minimum` to `maximum` based on the current `value`.
 * The direction of fill is controlled by the `direction` property.
 *
 * States: none (non-interactive visual element).
 */
export class ProgressBar extends Component {
	private _minimum = 0;
	private _maximum = 100;
	private _value = 0;
	private _direction: string = Direction.LTR;
	private _labelFunction: ((value: number, maximum: number) => string) | null = null;

	/** Skin part: the fill/stretch area (positioned by updateDisplayList). */
	thumb: Component | null = null;

	/** Skin part: label showing progress text. */
	labelDisplay: import('./Label.js').Label | null = null;

	constructor() {
		super();
	}

	// ── Value range ─────────────────────────────────────────────────────

	get minimum(): number {
		return this._minimum;
	}

	set minimum(value: number) {
		if (this._minimum === value) return;
		this._minimum = value;
		if (this._value < value) this._value = value;
		this.invalidateDisplayList();
	}

	get maximum(): number {
		return this._maximum;
	}

	set maximum(value: number) {
		if (this._maximum === value) return;
		this._maximum = value;
		if (this._value > value) this._value = value;
		this.invalidateDisplayList();
	}

	get value(): number {
		return this._value;
	}

	set value(val: number) {
		val = Math.max(this._minimum, Math.min(this._maximum, val));
		if (this._value === val) return;
		this._value = val;
		this.invalidateDisplayList();
		this.dispatchEventWith(Event.CHANGE);
	}

	// ── Direction ───────────────────────────────────────────────────────

	get direction(): string {
		return this._direction;
	}

	set direction(value: string) {
		if (this._direction === value) return;
		this._direction = value;
		this.invalidateDisplayList();
	}

	// ── Label function ──────────────────────────────────────────────────

	get labelFunction(): ((value: number, maximum: number) => string) | null {
		return this._labelFunction;
	}

	set labelFunction(fn: ((value: number, maximum: number) => string) | null) {
		if (this._labelFunction === fn) return;
		this._labelFunction = fn;
		this.invalidateDisplayList();
	}

	/**
	 * Converts the current value to display text.
	 * Override this method to customize the label format.
	 * The default format is `"value / maximum"`.
	 */
	protected valueToLabel(value: number, maximum: number): string {
		if (this._labelFunction != null) {
			return this._labelFunction(value, maximum);
		}
		return value + ' / ' + maximum;
	}

	// ── Computed ratio ──────────────────────────────────────────────────

	get ratio(): number {
		const range = this._maximum - this._minimum;
		if (range <= 0) return 0;
		return (this._value - this._minimum) / range;
	}

	// ── Rendering ───────────────────────────────────────────────────────

	override updateDisplayList(unscaledWidth: number, unscaledHeight: number): void {
		super.updateDisplayList(unscaledWidth, unscaledHeight);

		const thumb = this.thumb;
		if (thumb) {
			const r = this.ratio;
			switch (this._direction) {
				case Direction.RTL:
					thumb.x = unscaledWidth * (1 - r);
					thumb.y = 0;
					thumb.width = unscaledWidth * r;
					thumb.height = unscaledHeight;
					break;
				case Direction.TTB:
					thumb.x = 0;
					thumb.y = 0;
					thumb.width = unscaledWidth;
					thumb.height = unscaledHeight * r;
					break;
				case Direction.BTT:
					thumb.x = 0;
					thumb.y = unscaledHeight * (1 - r);
					thumb.width = unscaledWidth;
					thumb.height = unscaledHeight * r;
					break;
				default: // LTR
					thumb.x = 0;
					thumb.y = 0;
					thumb.width = unscaledWidth * r;
					thumb.height = unscaledHeight;
					break;
			}
		}

		// Update label
		if (this.labelDisplay) {
			this.labelDisplay.text = this.valueToLabel(this._value, this._maximum);
		}
	}
}
