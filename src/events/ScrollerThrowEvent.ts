import { Event } from '@blakron/core';

/**
 * Dispatched by Scroller during throw (inertial scrolling).
 *
 * Listeners can call `preventDefault()` to cancel the throw animation.
 */
export class ScrollerThrowEvent extends Event {
	/** Dispatched when a horizontal throw begins. */
	static readonly THROW_H = 'throwH';
	/** Dispatched when a vertical throw begins. */
	static readonly THROW_V = 'throwV';

	constructor(type: string, bubbles = false, cancelable = false) {
		super(type, bubbles, cancelable);
	}
}
