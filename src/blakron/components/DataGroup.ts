import { Rectangle, Event, DisplayObject } from '@blakron/core';
import { Group } from './Group.js';
import { ItemRenderer } from './ItemRenderer.js';
import { CollectionEvent, CollectionEventKind } from '../events/CollectionEvent.js';
import type { ICollection } from '../collections/ICollection.js';
import { VerticalLayout } from '../layouts/VerticalLayout.js';
import { JustifyAlign } from '../layouts/JustifyAlign.js';
import type { Skin } from './Skin.js';

type SkinName = string | (new () => Skin) | Skin | undefined;

/**
 * DataGroup converts data items into visual elements (item renderers).
 *
 * Provide an {@link ICollection} via `dataProvider` and either set
 * `itemRenderer` to a class or supply `itemRendererFunction` for
 * per-item renderer resolution.
 *
 * Supports virtual layout — only creates renderers for visible items.
 *
 * @defaultProperty dataProvider
 */
export class DataGroup extends Group {
	// ── Internal state ──────────────────────────────────────────────────

	private _dataProvider: ICollection | undefined;
	private _dataProviderChanged = false;

	private _itemRenderer: (new () => ItemRenderer) | undefined;
	private _itemRendererChanged = false;

	private _itemRendererFunction: ((item: unknown) => (new () => ItemRenderer) | undefined) | undefined;

	private _itemRendererSkinName: SkinName;
	private _itemRendererSkinNameChanged = false;

	private _useVirtualLayout = false;
	private _useVirtualLayoutChanged = false;

	private readonly _rendererToClass = new Map<ItemRenderer, new () => ItemRenderer>();
	private readonly _freeRenderers = new Map<new () => ItemRenderer, ItemRenderer[]>();
	private _renderersBeingUpdated = false;
	protected _indexToRenderer: (ItemRenderer | undefined)[] = [];
	private _createNewRendererFlag = false;
	private _typicalLayoutRect: Rectangle | undefined;
	private _typicalItem: unknown = undefined;
	private _typicalItemChanged = false;
	private _cleanFreeRenderer = false;

	// ── dataProvider ────────────────────────────────────────────────────

	get dataProvider(): ICollection | undefined {
		return this._dataProvider;
	}
	set dataProvider(value: ICollection | undefined) {
		if (this._dataProvider === value) return;
		this.removeDataProviderListener();
		this._dataProvider = value;
		this._dataProviderChanged = true;
		this._cleanFreeRenderer = true;
		this.invalidateProperties();
		this.invalidateSize();
		this.invalidateDisplayList();
	}

	private removeDataProviderListener(): void {
		if (this._dataProvider) {
			this._dataProvider.removeEventListener(CollectionEvent.COLLECTION_CHANGE, this._onCollectionChange);
		}
	}

	// ── itemRenderer ────────────────────────────────────────────────────

	get itemRenderer(): (new () => ItemRenderer) | undefined {
		return this._itemRenderer;
	}
	set itemRenderer(value: (new () => ItemRenderer) | undefined) {
		if (this._itemRenderer === value) return;
		this._itemRenderer = value;
		this._itemRendererChanged = true;
		this._typicalItemChanged = true;
		this._cleanFreeRenderer = true;
		this.removeDataProviderListener();
		this.invalidateProperties();
	}

	// ── itemRendererFunction ────────────────────────────────────────────

	get itemRendererFunction(): ((item: unknown) => (new () => ItemRenderer) | undefined) | undefined {
		return this._itemRendererFunction;
	}
	set itemRendererFunction(value: ((item: unknown) => (new () => ItemRenderer) | undefined) | undefined) {
		if (this._itemRendererFunction === value) return;
		this._itemRendererFunction = value;
		this._itemRendererChanged = true;
		this._typicalItemChanged = true;
		this.removeDataProviderListener();
		this.invalidateProperties();
	}

	// ── itemRendererSkinName ────────────────────────────────────────────

	get itemRendererSkinName(): SkinName {
		return this._itemRendererSkinName;
	}
	set itemRendererSkinName(value: SkinName) {
		if (this._itemRendererSkinName === value) return;
		this._itemRendererSkinName = value;
		this._itemRendererSkinNameChanged = true;
		this.invalidateProperties();
	}

	// ── useVirtualLayout ────────────────────────────────────────────────

	get useVirtualLayout(): boolean {
		const layout = this.layout;
		if (layout) return layout.useVirtualLayout;
		return this._useVirtualLayout;
	}
	set useVirtualLayout(value: boolean) {
		if (this._useVirtualLayout === value) return;
		this._useVirtualLayout = value;
		const layout = this.layout;
		if (layout) layout.useVirtualLayout = value;
	}

	// ── numElements override ────────────────────────────────────────────

	override get numElements(): number {
		if (!this._dataProvider) return 0;
		return this._dataProvider.length;
	}

	// ── Element access ──────────────────────────────────────────────────

	override getElementAt(index: number): DisplayObject | undefined {
		return this._indexToRenderer[index] ?? undefined;
	}

	override getVirtualElementAt(index: number): DisplayObject | undefined {
		index = index | 0;
		if (!this._dataProvider || index < 0 || index >= this._dataProvider.length) return undefined;
		let renderer = this._indexToRenderer[index];
		if (!renderer) {
			const item = this._dataProvider.getItemAt(index);
			renderer = this.createVirtualRenderer(item);
			this._indexToRenderer[index] = renderer;
			this.updateRenderer(renderer, index, item);
			if (this._createNewRendererFlag) {
				renderer.validateNow();
				this._createNewRendererFlag = false;
				this.rendererAdded(renderer, index, item);
			}
		}
		return renderer;
	}

	override setVirtualElementIndicesInView(startIndex: number, endIndex: number): void {
		const layout = this.layout;
		if (!layout?.useVirtualLayout) return;
		const map = this._indexToRenderer;
		for (let i = 0; i < map.length; i++) {
			if (map[i] && (i < startIndex || i > endIndex)) {
				this.freeRendererByIndex(i);
			}
		}
	}

	// ── createChildren ──────────────────────────────────────────────────

	override createChildren(): void {
		if (!this.layout) {
			const vl = new VerticalLayout();
			vl.gap = 0;
			vl.horizontalAlign = JustifyAlign.CONTENT_JUSTIFY;
			// Sync layout's useVirtualLayout with the value set before createChildren ran
			if (this._useVirtualLayout) vl.useVirtualLayout = true;
			this.layout = vl;
		}
		super.createChildren();
	}

	// ── commitProperties ────────────────────────────────────────────────

	override commitProperties(): void {
		if (this._itemRendererChanged || this._dataProviderChanged || this._useVirtualLayoutChanged) {
			this.removeAllRenderers();
			const layout = this.layout;
			if (layout) layout.clearVirtualLayoutCache();
			this.setTypicalLayoutRect(undefined);
			this._useVirtualLayoutChanged = false;
			this._itemRendererChanged = false;

			if (this._dataProvider) {
				this._dataProvider.addEventListener(CollectionEvent.COLLECTION_CHANGE, this._onCollectionChange);
			}

			// Use _useVirtualLayout as fallback when layout hasn't been created yet
			// (commitProperties may run before createChildren if dataProvider/itemRenderer
			// are set before the component is added to the stage).
			const useVirtual = layout ? layout.useVirtualLayout : this._useVirtualLayout;
			if (useVirtual) {
				this.invalidateSize();
				this.invalidateDisplayList();
			} else {
				this.createRenderers();
			}

			if (this._dataProviderChanged) {
				this._dataProviderChanged = false;
				this.scrollH = 0;
				this.scrollV = 0;
			}
		}

		super.commitProperties();

		if (this._typicalItemChanged) {
			this._typicalItemChanged = false;
			if (this._dataProvider && this._dataProvider.length > 0) {
				this._typicalItem = this._dataProvider.getItemAt(0);
				this.measureRendererSize();
			}
		}

		if (this._itemRendererSkinNameChanged) {
			this._itemRendererSkinNameChanged = false;
			this.applyItemRendererSkinName();
		}
	}

	// ── measure / updateDisplayList ─────────────────────────────────────

	override measure(): void {
		if (this.layout?.useVirtualLayout) this.ensureTypicalLayoutElement();
		super.measure();
	}

	override updateDisplayList(unscaledWidth: number, unscaledHeight: number): void {
		const useVirtual = this.layout?.useVirtualLayout;
		if (useVirtual) this.ensureTypicalLayoutElement();
		super.updateDisplayList(unscaledWidth, unscaledHeight);
		if (useVirtual && this._typicalLayoutRect) {
			const r0 = this._indexToRenderer[0];
			if (r0) {
				const b = new Rectangle();
				r0.getPreferredBounds(b);
				if (b.width !== this._typicalLayoutRect.width || b.height !== this._typicalLayoutRect.height) {
					this._typicalLayoutRect = undefined;
				}
			}
		}
	}

	// ── Collection change ───────────────────────────────────────────────

	private _onCollectionChange = (e: Event): void => {
		this.onCollectionChange(e as CollectionEvent);
	};

	protected onCollectionChange(event: CollectionEvent): void {
		switch (event.kind) {
			case CollectionEventKind.ADD:
				this.itemAddedHandler(event.items, event.location);
				break;
			case CollectionEventKind.REMOVE:
				this.itemRemovedHandler(event.items, event.location);
				break;
			case CollectionEventKind.UPDATE:
			case CollectionEventKind.REPLACE:
				this.itemUpdatedHandler(event.items[0], event.location);
				break;
			case CollectionEventKind.RESET:
			case CollectionEventKind.REFRESH: {
				if (this.layout?.useVirtualLayout) {
					for (let i = this._indexToRenderer.length - 1; i >= 0; i--) {
						if (this._indexToRenderer[i]) this.freeRendererByIndex(i);
					}
				}
				this._dataProviderChanged = true;
				this.invalidateProperties();
				break;
			}
		}
		this.invalidateSize();
		this.invalidateDisplayList();
	}

	private itemAddedHandler(items: unknown[], index: number): void {
		for (let i = 0; i < items.length; i++) this.itemAdded(items[i], index + i);
		this.resetRenderersIndices();
	}

	private itemRemovedHandler(items: unknown[], location: number): void {
		for (let i = items.length - 1; i >= 0; i--) this.itemRemoved(items[i], location + i);
		this.resetRenderersIndices();
	}

	private itemUpdatedHandler(item: unknown, location: number): void {
		if (this._renderersBeingUpdated) return;
		const renderer = this._indexToRenderer[location];
		if (renderer) this.updateRenderer(renderer, location, item);
	}

	// ── Item add / remove ───────────────────────────────────────────────

	protected itemAdded(item: unknown, index: number): void {
		this.layout?.elementAdded(index);
		if (this.layout?.useVirtualLayout) {
			this._indexToRenderer.splice(index, 0, undefined);
			return;
		}
		const renderer = this.createVirtualRenderer(item);
		this._indexToRenderer.splice(index, 0, renderer);
		if (renderer) {
			this.updateRenderer(renderer, index, item);
			if (this._createNewRendererFlag) {
				this._createNewRendererFlag = false;
				this.rendererAdded(renderer, index, item);
			}
		}
	}

	protected itemRemoved(item: unknown, index: number): void {
		this.layout?.elementRemoved(index);
		const oldRenderer = this._indexToRenderer[index];
		if (this._indexToRenderer.length > index) this._indexToRenderer.splice(index, 1);
		if (oldRenderer) {
			if (this.layout?.useVirtualLayout) {
				this.doFreeRenderer(oldRenderer);
			} else {
				this.rendererRemoved(oldRenderer, index, item);
				this.removeChild(oldRenderer);
			}
		}
	}

	// ── Renderer creation / pooling ─────────────────────────────────────

	private createVirtualRenderer(item: unknown): ItemRenderer {
		const rendererClass = this.itemToRendererClass(item);
		const pool = this._freeRenderers.get(rendererClass);
		if (pool && pool.length > 0) {
			const renderer = pool.pop()!;
			renderer.visible = true;
			this.invalidateDisplayList();
			return renderer;
		}
		this._createNewRendererFlag = true;
		return this.createOneRenderer(rendererClass);
	}

	private createOneRenderer(rendererClass: new () => ItemRenderer): ItemRenderer {
		const renderer = new rendererClass();
		this._rendererToClass.set(renderer, rendererClass);
		if (this._itemRendererSkinName) this.setItemRenderSkinName(renderer, this._itemRendererSkinName);
		this.addChild(renderer);
		return renderer;
	}

	private doFreeRenderer(renderer: ItemRenderer): void {
		const cls = this._rendererToClass.get(renderer);
		if (!cls) return;
		let pool = this._freeRenderers.get(cls);
		if (!pool) {
			pool = [];
			this._freeRenderers.set(cls, pool);
		}
		pool.push(renderer);
		renderer.visible = false;
	}

	private freeRendererByIndex(index: number): void {
		const renderer = this._indexToRenderer[index];
		if (renderer) {
			delete this._indexToRenderer[index];
			this.doFreeRenderer(renderer);
		}
	}

	// ── Renderer lifecycle ──────────────────────────────────────────────

	updateRenderer(renderer: ItemRenderer, itemIndex: number, data: unknown): ItemRenderer {
		this._renderersBeingUpdated = true;
		renderer.itemIndex = itemIndex;
		if (renderer.parent === this) {
			this.setChildIndex(renderer, itemIndex);
		}
		renderer.data = data;
		this._renderersBeingUpdated = false;
		return renderer;
	}

	protected rendererAdded(_renderer: ItemRenderer, _index: number, _item: unknown): void {}
	protected rendererRemoved(_renderer: ItemRenderer, _index: number, _item: unknown): void {}

	// ── Private helpers ─────────────────────────────────────────────────

	private itemToRendererClass(item: unknown): new () => ItemRenderer {
		let cls: (new () => ItemRenderer) | undefined;
		if (this._itemRendererFunction) cls = this._itemRendererFunction(item);
		if (!cls) cls = this._itemRenderer;
		if (!cls) cls = ItemRenderer;
		return cls;
	}

	private createRenderers(): void {
		if (!this._dataProvider) return;
		const len = this._dataProvider.length;
		for (let i = 0; i < len; i++) {
			const item = this._dataProvider.getItemAt(i);
			const cls = this.itemToRendererClass(item);
			const renderer = this.createOneRenderer(cls);
			this._indexToRenderer[i] = renderer;
			this.updateRenderer(renderer, i, item);
			this.rendererAdded(renderer, i, item);
		}
	}

	private removeAllRenderers(): void {
		for (let i = 0; i < this._indexToRenderer.length; i++) {
			const renderer = this._indexToRenderer[i];
			if (renderer) {
				this.rendererRemoved(renderer, renderer.itemIndex, renderer.data);
				this.removeChild(renderer);
			}
		}
		this._indexToRenderer = [];
		if (this._cleanFreeRenderer) {
			for (const pool of this._freeRenderers.values()) {
				for (const renderer of pool) {
					this.rendererRemoved(renderer, renderer.itemIndex, renderer.data);
					this.removeChild(renderer);
				}
			}
			this._freeRenderers.clear();
			this._rendererToClass.clear();
			this._cleanFreeRenderer = false;
		}
	}

	private resetRenderersIndices(): void {
		const map = this._indexToRenderer;
		if (map.length === 0) return;
		for (let i = 0; i < map.length; i++) {
			if (map[i]) map[i]!.itemIndex = i;
		}
	}

	// ── Virtual layout typical size ─────────────────────────────────────

	private ensureTypicalLayoutElement(): void {
		if (this._typicalLayoutRect) return;
		if (this._dataProvider && this._dataProvider.length > 0) {
			this._typicalItem = this._dataProvider.getItemAt(0);
			this.measureRendererSize();
		}
	}

	private measureRendererSize(): void {
		if (this._typicalItem === undefined) {
			this.setTypicalLayoutRect(undefined);
			return;
		}
		const renderer = this.createVirtualRenderer(this._typicalItem);
		this.updateRenderer(renderer, 0, this._typicalItem);
		renderer.validateNow();
		const b = new Rectangle();
		renderer.getPreferredBounds(b);
		const rect = new Rectangle(0, 0, b.width, b.height);
		if (this.layout?.useVirtualLayout) {
			if (this._createNewRendererFlag) this.rendererAdded(renderer, 0, this._typicalItem);
			this.doFreeRenderer(renderer);
		} else {
			this.removeChild(renderer);
		}
		this.setTypicalLayoutRect(rect);
		this._createNewRendererFlag = false;
	}

	private setTypicalLayoutRect(rect: Rectangle | undefined): void {
		this._typicalLayoutRect = rect;
		if (this.layout) {
			if (rect) this.layout.setTypicalSize(rect.width, rect.height);
			else this.layout.setTypicalSize(0, 0);
		}
	}

	private setItemRenderSkinName(renderer: ItemRenderer, skinName: SkinName): void {
		if (!renderer.skinNameExplicitlySet) {
			renderer.skinName = skinName;
			renderer.skinNameExplicitlySet = false;
		}
	}

	private applyItemRendererSkinName(): void {
		const skinName = this._itemRendererSkinName;
		for (const renderer of this._indexToRenderer) {
			if (renderer) this.setItemRenderSkinName(renderer, skinName);
		}
		for (const pool of this._freeRenderers.values()) {
			for (const renderer of pool) this.setItemRenderSkinName(renderer, skinName);
		}
	}
}
