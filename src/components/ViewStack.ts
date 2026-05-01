import { Group } from './Group.js';
import { Event, DisplayObject } from '@blakron/core';
import { isUIComponent } from '../core/UIState.js';

/**
 * ViewStack navigator container consisting of a collection of child containers
 * stacked on top of each other, where only one child at a time is visible.
 *
 * When a different child is selected, it appears to replace the old one because
 * it appears in the same location. However, the old child still exists; it is
 * just invisible and excluded from layout.
 *
 * States: none (container component).
 */
export class ViewStack extends Group {
	private _selectedIndex = -1;
	private _selectedChild: DisplayObject | null = null;

	constructor() {
		super();
	}

	// ── Selected Index ──────────────────────────────────────────────────

	get selectedIndex(): number {
		return this._selectedIndex;
	}

	set selectedIndex(value: number) {
		value = +value | 0;
		if (this._selectedIndex === value) return;
		this.commitSelection(value);
		this.dispatchEventWith(Event.CHANGE);
	}

	// ── Selected Child ──────────────────────────────────────────────────

	get selectedChild(): DisplayObject | null {
		const index = this.selectedIndex;
		if (index >= 0 && index < this.numChildren) return this.getChildAt(index) ?? null;
		return null;
	}

	set selectedChild(value: DisplayObject | null) {
		if (!value) {
			this.selectedIndex = -1;
			return;
		}
		const index = this.getChildIndex(value);
		if (index >= 0 && index < this.numChildren) {
			this.selectedIndex = index;
		}
	}

	// ── Selection commit ────────────────────────────────────────────────

	private commitSelection(newIndex: number): void {
		if (newIndex >= 0 && newIndex < this.numChildren) {
			this._selectedIndex = newIndex;
			if (this._selectedChild) {
				this.showOrHide(this._selectedChild, false);
			}
			this._selectedChild = this.getChildAt(newIndex) ?? null;
			if (this._selectedChild) {
				this.showOrHide(this._selectedChild, true);
			}
		} else {
			if (this._selectedChild) {
				this.showOrHide(this._selectedChild, false);
			}
			this._selectedChild = null;
			this._selectedIndex = -1;
		}
		this.invalidateSize();
		this.invalidateDisplayList();
	}

	/**
	 * Show or hide a child, also managing `includeInLayout`.
	 */
	private showOrHide(child: DisplayObject, visible: boolean): void {
		child.visible = visible;
		if (isUIComponent(child)) {
			child.includeInLayout = visible;
		}
	}

	// ── Rendering ───────────────────────────────────────────────────────

	override updateDisplayList(unscaledWidth: number, unscaledHeight: number): void {
		super.updateDisplayList(unscaledWidth, unscaledHeight);

		// Size the selected child to fill the ViewStack
		if (this._selectedChild) {
			this._selectedChild.width = unscaledWidth;
			this._selectedChild.height = unscaledHeight;
		}
	}

	// ── Measurement ─────────────────────────────────────────────────────

	override measure(): void {
		if (this._selectedChild) {
			this.setMeasuredSize(this._selectedChild.width, this._selectedChild.height);
		} else {
			this.setMeasuredSize(0, 0);
		}
	}

	// ── Child management ────────────────────────────────────────────────

	override childAdded(child: unknown, index: number): void {
		super.childAdded(child, index);
		const displayChild = child as DisplayObject;
		// Hide the new child by default
		this.showOrHide(displayChild, false);
		// Auto-select first child, or adjust index
		if (this._selectedIndex === -1) {
			this.commitSelection(index);
		} else if (index <= this._selectedIndex) {
			this._selectedIndex++;
		}
	}

	override childRemoved(child: unknown, index: number): void {
		super.childRemoved(child, index);
		const displayChild = child as DisplayObject;
		this.showOrHide(displayChild, true); // restore visibility

		if (index === this._selectedIndex) {
			// Currently selected child removed
			if (this.numChildren > 0) {
				this.commitSelection(0);
			} else {
				this._selectedChild = null;
				this._selectedIndex = -1;
			}
		} else if (index < this._selectedIndex) {
			this._selectedIndex--;
		} else {
			// Removed child is after the selected one, no index change needed
			// but we should clean up reference
			if (this._selectedChild === child) {
				this._selectedChild = null;
			}
		}
		this.invalidateSize();
		this.invalidateDisplayList();
	}
}
