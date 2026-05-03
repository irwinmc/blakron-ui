import { SliderBase } from './SliderBase.js';
import { Direction } from '../core/Direction.js';

/**
 * HSlider — a horizontal slider (left-to-right).
 */
export class HSlider extends SliderBase {
	public constructor() {
		super();
		this.direction = Direction.LTR;
	}
}
