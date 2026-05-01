import { Group } from './Group.js';
import { Component } from './Component.js';
import { Event, DisplayObject } from '@blakron/core';

/**
 * ViewStack component that shows only one child at a time, determined by `selectedIndex`.
 *
 * All children are kept but only the active one is visible.
 * This is useful for tab-based navigation, wizard-style flows, etc.
 *
 * States: none (container component, delegates state to children).
 */
export class ViewStack extends Group {
	private _selectedIndex = 0;

	constructor() {
		super();
	}

	// ── Selected Index ──────────────────────────────────────────────────

	get selectedIndex(): number {
		return this._selectedIndex;
	}

	set selectedIndex(value: number) {
		if (this._selectedIndex === value) return;
		this._selectedIndex = value;
		this.invalidateDisplayList();
		this.dispatchEventWith(Event.CHANGE);
	}

	// ── Rendering ───────────────────────────────────────────────────────

	override updateDisplayList(unscaledWidth: number, unscaledHeight: number): void {
		super.updateDisplayList(unscaledWidth, unscaledHeight);

		const n = this.numChildren;
		for (let i = 0; i < n; i++) {
			const child = this.getChildAt(i)!;
			child.visible = i === this._selectedIndex;
			if (child.visible) {
				child.width = unscaledWidth;
				child.height = unscaledHeight;
			}
		}
	}

	// ── Measurement ─────────────────────────────────────────────────────

	override measure(): void {
		const selectedChild = this.getChildAt(this._selectedIndex);
		if (selectedChild) {
			this.setMeasuredSize(selectedChild.width, selectedChild.height);
		} else {
			this.setMeasuredSize(0, 0);
		}
	}

	// ── Child management ────────────────────────────────────────────────

	override addChildAt(child: DisplayObject, index: number): DisplayObject {
		const result = super.addChildAt(child, index);
		child.visible = index === this._selectedIndex;
		this.invalidateSize();
		return result;
	}

	override removeChildAt(index: number): DisplayObject | undefined {
		const result = super.removeChildAt(index);
		// Adjust selectedIndex if needed
		if (this._selectedIndex >= this.numChildren) {
			this._selectedIndex = Math.max(0, this.numChildren - 1);
		}
		this.invalidateSize();
		this.invalidateDisplayList();
		return result;
	}
}
