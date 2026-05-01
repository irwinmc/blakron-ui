import { SliderBase } from './SliderBase.js';
import { Direction } from '../core/Direction.js';

/**
 * VSlider — a vertical slider (bottom-to-top, standard slider convention).
 */
export class VSlider extends SliderBase {
	constructor() {
		super();
		this.direction = Direction.BTT;
	}
}
