import { Event, type IEventDispatcher } from '@blakron/core';

/**
 * UI event types and dispatcher for UI component lifecycle and interaction events.
 */
export class UIEvent extends Event {
	/** Dispatched when a component finishes initialization after being added to stage. */
	static readonly CREATION_COMPLETE = 'creationComplete';
	/** Dispatched when a change interaction ends (e.g. slider released). */
	static readonly CHANGE_END = 'changeEnd';
	/** Dispatched when a change interaction begins. */
	static readonly CHANGE_START = 'changeStart';
	/** Dispatched before a panel closes. */
	static readonly CLOSING = 'closing';
	/** Dispatched when a UI component's position changes within its parent. */
	static readonly MOVE = 'move';

	constructor(type: string, bubbles = false, cancelable = false) {
		super(type, bubbles, cancelable);
	}

	static dispatchUIEvent(target: IEventDispatcher, eventType: string, bubbles = false, cancelable = false): boolean {
		if (!target.hasEventListener(eventType)) return true;
		const event = new UIEvent(eventType, bubbles, cancelable);
		return target.dispatchEvent(event);
	}
}
