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
	// ── Instance fields ───────────────────────────────────────────────────

	private _selectedIndex = -1;
	private _selectedChild?: DisplayObject;

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor() {
		super();
	}

	// ── Getters / Setters ─────────────────────────────────────────────────

	public get selectedIndex(): number {
		return this._selectedIndex;
	}

	public set selectedIndex(value: number) {
		value = +value | 0;
		if (this._selectedIndex === value) return;
		this._commitSelection(value);
		this.dispatchEventWith(Event.CHANGE);
	}

	public get selectedChild(): DisplayObject | undefined {
		const index = this.selectedIndex;
		if (index >= 0 && index < this.numChildren) return this.getChildAt(index);
		return undefined;
	}

	public set selectedChild(value: DisplayObject | undefined) {
		if (!value) {
			this.selectedIndex = -1;
			return;
		}
		const index = this.getChildIndex(value);
		if (index >= 0 && index < this.numChildren) {
			this.selectedIndex = index;
		}
	}

	// ── Override methods ──────────────────────────────────────────────────

	public override updateDisplayList(unscaledWidth: number, unscaledHeight: number): void {
		super.updateDisplayList(unscaledWidth, unscaledHeight);

		if (this._selectedChild) {
			this._selectedChild.width = unscaledWidth;
			this._selectedChild.height = unscaledHeight;
		}
	}

	public override measure(): void {
		if (this._selectedChild) {
			this.setMeasuredSize(this._selectedChild.width, this._selectedChild.height);
		} else {
			this.setMeasuredSize(0, 0);
		}
	}

	public override childAdded(child: unknown, index: number): void {
		super.childAdded(child, index);
		const displayChild = child as DisplayObject;
		this._showOrHide(displayChild, false);
		if (this._selectedIndex === -1) {
			this._commitSelection(index);
		} else if (index <= this._selectedIndex) {
			this._selectedIndex++;
		}
	}

	public override childRemoved(child: unknown, index: number): void {
		super.childRemoved(child, index);
		const displayChild = child as DisplayObject;
		this._showOrHide(displayChild, true);

		if (index === this._selectedIndex) {
			if (this.numChildren > 0) {
				this._commitSelection(0);
			} else {
				this._selectedChild = undefined;
				this._selectedIndex = -1;
			}
		} else if (index < this._selectedIndex) {
			this._selectedIndex--;
		} else {
			if (this._selectedChild === child) {
				this._selectedChild = undefined;
			}
		}
		this.invalidateSize();
		this.invalidateDisplayList();
	}

	// ── Private methods ───────────────────────────────────────────────────

	private _commitSelection(newIndex: number): void {
		if (newIndex >= 0 && newIndex < this.numChildren) {
			this._selectedIndex = newIndex;
			if (this._selectedChild) {
				this._showOrHide(this._selectedChild, false);
			}
			this._selectedChild = this.getChildAt(newIndex);
			if (this._selectedChild) {
				this._showOrHide(this._selectedChild, true);
			}
		} else {
			if (this._selectedChild) {
				this._showOrHide(this._selectedChild, false);
			}
			this._selectedChild = undefined;
			this._selectedIndex = -1;
		}
		this.invalidateSize();
		this.invalidateDisplayList();
	}

	private _showOrHide(child: DisplayObject, visible: boolean): void {
		child.visible = visible;
		if (isUIComponent(child)) {
			child.includeInLayout = visible;
		}
	}
}
