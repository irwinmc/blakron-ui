import { Event, type IEventDispatcher } from '@blakron/core';

export const CollectionEventKind = {
	ADD: 'add',
	REMOVE: 'remove',
	UPDATE: 'update',
	RESET: 'reset',
	REFRESH: 'refresh',
	REPLACE: 'replace',
	MOVE: 'move',
} as const;

export type CollectionEventKind = (typeof CollectionEventKind)[keyof typeof CollectionEventKind];

export class CollectionEvent extends Event {
	static readonly COLLECTION_CHANGE = 'collectionChange';

	kind: CollectionEventKind = CollectionEventKind.ADD;
	items: unknown[] = [];
	location = -1;
	oldLocation = -1;

	constructor(type: string, bubbles = false, cancelable = false) {
		super(type, bubbles, cancelable);
	}

	static dispatchCollectionEvent(
		target: IEventDispatcher,
		kind: CollectionEventKind,
		location = -1,
		oldLocation = -1,
		items: unknown[] = [],
	): boolean {
		if (!target.hasEventListener(CollectionEvent.COLLECTION_CHANGE)) return true;
		const e = new CollectionEvent(CollectionEvent.COLLECTION_CHANGE);
		e.kind = kind;
		e.location = location;
		e.oldLocation = oldLocation;
		e.items = items;
		return target.dispatchEvent(e);
	}
}
