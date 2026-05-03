import { TouchEvent, Event } from '@blakron/core';
import { ListBase } from './ListBase.js';
import { ItemRenderer } from './ItemRenderer.js';
import { ItemTapEvent } from '../events/ItemTapEvent.js';
import { HorizontalLayout } from '../layouts/HorizontalLayout.js';
import { JustifyAlign } from '../layouts/JustifyAlign.js';

/**
 * TabBar — a horizontal strip of selectable tabs.
 *
 * Extends ListBase so it inherits selection logic. Uses a HorizontalLayout
 * by default and dispatches {@link ItemTapEvent.ITEM_TAP} on tap.
 *
 * @defaultProperty dataProvider
 */
export class TabBar extends ListBase {
	/** Per-renderer tap handler, stored so we can remove it in rendererRemoved. */
	private readonly _rendererHandlers = new Map<ItemRenderer, (e: Event) => void>();

	// ── Constructor ─────────────────────────────────────────────────────

	constructor() {
		super();
		this.useVirtualLayout = false;
	}

	// ── createChildren ──────────────────────────────────────────────────

	override createChildren(): void {
		if (!this.layout) {
			const hl = new HorizontalLayout();
			hl.gap = 0;
			hl.horizontalAlign = JustifyAlign.CONTENT_JUSTIFY;
			this.layout = hl;
		}
		super.createChildren();
	}

	// ── Renderer lifecycle ──────────────────────────────────────────────

	protected override rendererAdded(renderer: ItemRenderer, _index: number, _item: unknown): void {
		const handler = (e: Event): void => {
			const idx = renderer.itemIndex;
			if (idx >= 0) this.selectedIndex = idx;
			ItemTapEvent.dispatchItemTapEvent(this, renderer.data, idx, renderer);
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
