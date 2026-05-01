import { Event, type IEventDispatcher } from '@blakron/core';

export class ItemTapEvent extends Event {
	static readonly ITEM_TAP = 'itemTap';

	/** The item that was tapped. */
	item: unknown = null;
	/** The index of the tapped item in the data provider. */
	itemIndex = -1;

	constructor(type: string, bubbles = false, cancelable = false) {
		super(type, bubbles, cancelable);
	}

	static dispatchItemTapEvent(target: IEventDispatcher, item: unknown, itemIndex: number): boolean {
		if (!target.hasEventListener(ItemTapEvent.ITEM_TAP)) return true;
		const e = new ItemTapEvent(ItemTapEvent.ITEM_TAP, false, false);
		e.item = item;
		e.itemIndex = itemIndex;
		return target.dispatchEvent(e);
	}
}
