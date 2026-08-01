import { Event } from '@blakron/core';
import { DataGroup } from './DataGroup.js';
import { CollectionEvent, CollectionEventKind } from '../events/CollectionEvent.js';
import { PropertyEvent } from '../events/PropertyEvent.js';

/**
 * ListBase extends DataGroup with selection support.
 *
 * Maintains a `selectedIndex` and tracks the currently selected renderer.
 * Subclasses (e.g. List) add touch interaction.
 */
export class ListBase extends DataGroup {
	// ── Instance fields ───────────────────────────────────────────────────

	private _selectedIndex = -1;
	private _previousSelectedIndex = -1;
	private _selectedIndexChanged = false;
	private _dispatchChangeAfterSelection = false;
	private _requireSelection = false;
	private _requireSelectionChanged = false;

	// ── Getters / Setters ─────────────────────────────────────────────────

	public get selectedIndex(): number {
		return this._selectedIndex;
	}

	public set selectedIndex(value: number) {
		this.setSelectedIndex(value, false);
	}

	public get selectedItem(): unknown {
		if (this._selectedIndex < 0 || !this.dataProvider) return undefined;
		return this.dataProvider.getItemAt(this._selectedIndex);
	}

	public set selectedItem(value: unknown) {
		if (!this.dataProvider) {
			this.selectedIndex = -1;
			return;
		}
		this.selectedIndex = this.dataProvider.getItemIndex(value);
	}

	/**
	 * If `true`, the list always keeps an item selected (defaults to the first).
	 * Setting this to true when no item is selected selects index 0.
	 */
	public get requireSelection(): boolean {
		return this._requireSelection;
	}

	public set requireSelection(value: boolean) {
		if (this._requireSelection === value) return;
		this._requireSelection = value;
		this._requireSelectionChanged = true;
		this.invalidateProperties();
	}

	// ── Override methods ──────────────────────────────────────────────────

	public override commitProperties(): void {
		if (this._requireSelectionChanged) {
			this._requireSelectionChanged = false;
			if (this._requireSelection && this._selectedIndex === -1 && this.dataProvider && this.dataProvider.length > 0) {
				this.setSelectedIndex(0, false);
			}
		}
		if (this._selectedIndexChanged) {
			this._selectedIndexChanged = false;
			this.commitSelection();
		}
		super.commitProperties();
	}

	protected override onCollectionChange(event: CollectionEvent): void {
		const kind = event.kind;
		const location = event.location ?? -1;

		if (this._selectedIndex === -1) {
			super.onCollectionChange(event);
			return;
		}

		switch (kind) {
			case CollectionEventKind.ADD: {
				if (location <= this._selectedIndex) {
					this._selectedIndex++;
					PropertyEvent.dispatchPropertyEvent(this, 'selectedIndex');
				}
				break;
			}
			case CollectionEventKind.REMOVE: {
				if (location < this._selectedIndex) {
					this._selectedIndex--;
					PropertyEvent.dispatchPropertyEvent(this, 'selectedIndex');
				} else if (location === this._selectedIndex) {
					this._selectedIndex = -1;
					PropertyEvent.dispatchPropertyEvent(this, 'selectedIndex');
				}
				break;
			}
			case CollectionEventKind.MOVE: {
				// handled by oldLocation / newLocation in full impl
				break;
			}
			case CollectionEventKind.RESET:
			case CollectionEventKind.REFRESH: {
				this._selectedIndex = -1;
				PropertyEvent.dispatchPropertyEvent(this, 'selectedIndex');
				break;
			}
		}

		super.onCollectionChange(event);
	}

	// ── Protected methods ─────────────────────────────────────────────────

	protected setSelectedIndex(value: number, dispatchChangeEvent = false): void {
		if (this._selectedIndex === value) return;
		if (dispatchChangeEvent) {
			this._dispatchChangeAfterSelection = true;
		}
		this._previousSelectedIndex = this._selectedIndex;
		this._selectedIndex = value;
		this._selectedIndexChanged = true;
		this.invalidateProperties();
	}

	protected commitSelection(): boolean {
		const maxIndex = this.dataProvider ? this.dataProvider.length - 1 : -1;
		if (this._selectedIndex < -1) this._selectedIndex = -1;
		if (this._selectedIndex > maxIndex) this._selectedIndex = maxIndex;

		// requireSelection: refuse to deselect when there is data.
		if (this._requireSelection && this._selectedIndex === -1 && this.dataProvider && this.dataProvider.length > 0) {
			this._selectedIndex = this._previousSelectedIndex;
			this._dispatchChangeAfterSelection = false;
			return false;
		}

		if (this._previousSelectedIndex !== this._selectedIndex) {
			this.itemSelected(this._previousSelectedIndex, false);
		}
		if (this._selectedIndex >= 0) {
			this.itemSelected(this._selectedIndex, true);
		}

		if (this._dispatchChangeAfterSelection) {
			this._dispatchChangeAfterSelection = false;
			this.dispatchEventWith(Event.CHANGE);
		}
		PropertyEvent.dispatchPropertyEvent(this, 'selectedIndex');
		PropertyEvent.dispatchPropertyEvent(this, 'selectedItem');
		return true;
	}

	/**
	 * Called when an item is selected or deselected.
	 * Override to update renderer visual state.
	 */
	protected itemSelected(index: number, selected: boolean): void {
		const renderer = this.getRendererAt(index);
		if (renderer) renderer.selected = selected;
	}
}
