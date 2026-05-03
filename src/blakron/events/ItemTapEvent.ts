import { Event, type IEventDispatcher } from '@blakron/core';
import type { ItemRenderer } from '../components/ItemRenderer.js';

export class ItemTapEvent extends Event {
	static readonly ITEM_TAP = 'itemTap';

	/** The data item that was tapped. */
	item: unknown;
	/** The index of the tapped item in the data provider. */
	itemIndex = -1;
	/** The ItemRenderer that was tapped. */
	itemRenderer?: ItemRenderer;

	constructor(type: string, bubbles = false, cancelable = false) {
		super(type, bubbles, cancelable);
	}

	static dispatchItemTapEvent(
		target: IEventDispatcher,
		item: unknown,
		itemIndex: number,
		itemRenderer?: ItemRenderer,
	): boolean {
		if (!target.hasEventListener(ItemTapEvent.ITEM_TAP)) return true;
		const e = new ItemTapEvent(ItemTapEvent.ITEM_TAP, false, false);
		e.item = item;
		e.itemIndex = itemIndex;
		e.itemRenderer = itemRenderer;
		return target.dispatchEvent(e);
	}
}
