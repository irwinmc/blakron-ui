import { TouchEvent, Event } from '@blakron/core';
import { ListBase } from './ListBase.js';
import { ItemRenderer } from './ItemRenderer.js';
import { ItemTapEvent } from '../events/ItemTapEvent.js';

/**
 * List extends ListBase with touch-to-select interaction.
 *
 * Tapping a renderer selects it (updating `selectedIndex`) and dispatches
 * an {@link ItemTapEvent.ITEM_TAP}.
 *
 * @defaultProperty dataProvider
 */
export class List extends ListBase {
	/** Per-renderer tap handler, stored so we can remove it in rendererRemoved. */
	private readonly _rendererHandlers = new Map<ItemRenderer, (e: Event) => void>();

	// ── Renderer lifecycle ──────────────────────────────────────────────

	protected override rendererAdded(renderer: ItemRenderer, _index: number, _item: unknown): void {
		const handler = (e: Event): void => {
			const idx = renderer.itemIndex;
			if (idx >= 0) this.selectedIndex = idx;
			ItemTapEvent.dispatchItemTapEvent(this, renderer.data, idx);
		};
		this._rendererHandlers.set(renderer, handler);
		renderer.addEventListener(TouchEvent.TOUCH_TAP, handler);
	}

	protected override rendererRemoved(renderer: ItemRenderer, _index: number, _item: unknown): void {
		const handler = this._rendererHandlers.get(renderer);
		if (handler) {
			this._rendererHandlers.delete(renderer);
			renderer.removeEventListener(TouchEvent.TOUCH_TAP, handler);
		}
	}
}
