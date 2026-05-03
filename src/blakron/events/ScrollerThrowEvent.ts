import { Event } from '@blakron/core';

/**
 * Dispatched by Scroller during throw (inertial scrolling).
 *
 * Listeners can call `preventDefault()` to cancel the throw animation,
 * or modify `toPos` to redirect the throw target.
 *
 * Egret-compatible: eui.ScrollerThrowEvent
 */
export class ScrollerThrowEvent extends Event {
	/** Dispatched when a horizontal throw begins. */
	static readonly THROW_H = 'throwH';
	/** Dispatched when a vertical throw begins. */
	static readonly THROW_V = 'throwV';

	/** Current scroll position when the throw starts. */
	currentPos = 0;
	/** Target scroll position the throw animation will reach. */
	toPos = 0;

	constructor(type: string, bubbles = false, cancelable = false) {
		super(type, bubbles, cancelable);
	}
}
