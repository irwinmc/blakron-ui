import { Rectangle } from '@blakron/core';
import { SliderBase } from './SliderBase.js';
import { Direction } from '../core/Direction.js';
import { isUIComponent } from '../core/UIComponent.js';

/**
 * VSlider — a vertical slider (bottom-to-top, standard slider convention).
 *
 * Overrides `pointToValue` and `updateSkinDisplayList` to position the thumb
 * using the track's layout bounds (not the slider's own height), matching egret.
 */
export class VSlider extends SliderBase {
	private static readonly _bounds = new Rectangle();

	public constructor() {
		super();
		this.direction = Direction.BTT;
	}

	/**
	 * Range of thumb movement = track height − thumb height.
	 */
	private _getThumbRange(): number {
		const track = this.track;
		const thumb = this.thumb;
		if (!track || !thumb || !isUIComponent(track) || !isUIComponent(thumb)) return 0;
		const b = VSlider._bounds;
		track.getLayoutBounds(b);
		const trackHeight = b.height;
		thumb.getLayoutBounds(b);
		return trackHeight - b.height;
	}

	protected override pointToValue(_x: number, y: number): number {
		const range = this.maximum - this.minimum;
		const thumbRange = this._getThumbRange();
		// BTT: y=0 at bottom (max), y=thumbRange at top (min) → invert.
		return this.minimum + (thumbRange !== 0 ? ((thumbRange - y) / thumbRange) * range : 0);
	}

	protected override updateSkinDisplayList(): void {
		const thumb = this.thumb;
		const track = this.track;
		if (!thumb || !track) return;

		const thumbRange = this._getThumbRange();
		const range = this.maximum - this.minimum;
		const ratio = range > 0 ? (this.pendingValue - this.minimum) / range : 0;
		const thumbY = (1 - ratio) * thumbRange; // BTT: higher value = lower y

		if (isUIComponent(thumb)) {
			const b = VSlider._bounds;
			thumb.getLayoutBounds(b);
			thumb.setLayoutBoundsPosition(b.x, Math.round(thumbY));
		} else {
			thumb.y = thumbY;
		}
	}
}
