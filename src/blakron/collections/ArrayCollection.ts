import { EventDispatcher } from '@blakron/core';
import { CollectionEvent, CollectionEventKind } from '../events/CollectionEvent.js';
import type { ICollection } from './ICollection.js';

/**
 * A wrapper around a plain `unknown[]` that implements {@link ICollection}.
 *
 * Dispatches {@link CollectionEvent.COLLECTION_CHANGE} whenever items are
 * added, removed, replaced, or the entire source is reset — allowing
 * data-driven components (DataGroup, List, TabBar…) to update efficiently.
 *
 * @defaultProperty source
 */
export class ArrayCollection extends EventDispatcher implements ICollection {
	private _source: unknown[];

	constructor(source?: unknown[]) {
		super();
		this._source = source ?? [];
	}

	// ── source ──────────────────────────────────────────────────────────

	/** The underlying array. Setting this replaces the entire collection (RESET). */
	get source(): unknown[] {
		return this._source;
	}
	set source(value: unknown[]) {
		this._source = value ?? [];
		this.dispatchCoEvent(CollectionEventKind.RESET);
	}

	// ── ICollection ─────────────────────────────────────────────────────

	get length(): number {
		return this._source.length;
	}

	getItemAt(index: number): unknown {
		return this._source[index];
	}

	getItemIndex(item: unknown): number {
		return this._source.indexOf(item);
	}

	// ── Mutation helpers ────────────────────────────────────────────────

	/** Append an item to the end of the list. */
	addItem(item: unknown): void {
		this._source.push(item);
		this.dispatchCoEvent(CollectionEventKind.ADD, this._source.length - 1, -1, [item]);
	}

	/** Insert an item at the given index. */
	addItemAt(item: unknown, index: number): void {
		if (index < 0 || index > this._source.length) {
			throw new RangeError(`ArrayCollection.addItemAt: index ${index} out of range`);
		}
		this._source.splice(index, 0, item);
		this.dispatchCoEvent(CollectionEventKind.ADD, index, -1, [item]);
	}

	/** Remove and return the item at the given index. */
	removeItemAt(index: number): unknown {
		if (index < 0 || index >= this._source.length) {
			throw new RangeError(`ArrayCollection.removeItemAt: index ${index} out of range`);
		}
		const item = this._source.splice(index, 1)[0];
		this.dispatchCoEvent(CollectionEventKind.REMOVE, index, -1, [item]);
		return item;
	}

	/** Replace the item at the given index and return the old item. */
	replaceItemAt(item: unknown, index: number): unknown {
		if (index < 0 || index >= this._source.length) {
			throw new RangeError(`ArrayCollection.replaceItemAt: index ${index} out of range`);
		}
		const old = this._source.splice(index, 1, item)[0];
		this.dispatchCoEvent(CollectionEventKind.REPLACE, index, -1, [item], [old]);
		return old;
	}

	/** Notify the view that the given item's properties have changed. */
	itemUpdated(item: unknown): void {
		const index = this.getItemIndex(item);
		if (index !== -1) {
			this.dispatchCoEvent(CollectionEventKind.UPDATE, index, -1, [item]);
		}
	}

	/** Remove every item from the list. */
	removeAll(): void {
		const items = this._source.slice();
		this._source.length = 0;
		this.dispatchCoEvent(CollectionEventKind.REMOVE, 0, -1, items);
	}

	/**
	 * Replace all items with a new source. Unlike setting `source`, this does
	 * **not** reset scroll position in the view — individual add/remove events
	 * are dispatched instead.
	 */
	replaceAll(newSource: unknown[]): void {
		const src = newSource ?? [];
		const newLen = src.length;
		const oldLen = this._source.length;
		// Remove extras from the tail
		for (let i = newLen; i < oldLen; i++) {
			this.removeItemAt(newLen);
		}
		// Replace or add from head
		for (let i = 0; i < newLen; i++) {
			if (i >= oldLen) this.addItemAt(src[i], i);
			else this.replaceItemAt(src[i], i);
		}
		this._source = src;
	}

	/** Manually refresh the view (e.g. after sorting/filtering the source directly). */
	refresh(): void {
		this.dispatchCoEvent(CollectionEventKind.REFRESH);
	}

	// ── Internal ────────────────────────────────────────────────────────

	private dispatchCoEvent(
		kind: CollectionEventKind,
		location = -1,
		oldLocation = -1,
		items: unknown[] = [],
		oldItems: unknown[] = [],
	): void {
		CollectionEvent.dispatchCollectionEvent(this, kind, location, oldLocation, items);
	}
}
