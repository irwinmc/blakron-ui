import { TouchEvent, Event } from '@blakron/core';
import { Component } from './Component.js';
import { List } from './List.js';
import { Scroller } from './Scroller.js';
import type { ArrayCollection } from '../collections/ArrayCollection.js';
import type { IDisplayText } from '../core/IDisplayText.js';
import type { Button } from './Button.js';
import type { Label } from './Label.js';

/**
 * ComboBox — a drop-down selection component.
 *
 * Displays a trigger button showing the currently selected item's label,
 * and a drop-down list that appears when the trigger is tapped.
 *
 * @skinPart labelDisplay — Label showing the selected item label
 * @skinPart button        — the trigger Button that toggles the drop-down
 * @skinPart dropDown      — the drop-down container (typically a Scroller or Group)
 * @skinPart list          — the List inside the drop-down for item selection
 *
 * States: `normal`, `open`, `disabled`.
 *
 * @defaultProperty dataProvider
 */
export class ComboBox extends Component implements IDisplayText {
	// ── Instance fields ───────────────────────────────────────────────────

	public labelDisplay?: Label;
	public button?: Button;
	public dropDown?: Scroller;
	public list?: List;

	private _dataProvider?: ArrayCollection;
	private _selectedIndex = -1;
	private _selectedItem: unknown;
	private _labelField = 'label';
	private _labelFunction?: (item: unknown) => string;
	private _isOpen = false;
	private _prompt = '';

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor() {
		super();
		this.touchChildren = true;
	}

	// ── Getters / Setters ─────────────────────────────────────────────────

	/** The data provider for the drop-down list items. */
	public get dataProvider(): ArrayCollection | undefined {
		return this._dataProvider;
	}

	public set dataProvider(value: ArrayCollection | undefined) {
		if (this._dataProvider === value) return;
		this._dataProvider = value;
		if (this.list) {
			this.list.dataProvider = value;
		}
		this.invalidateProperties();
	}

	/** Index of the currently selected item, or -1 if nothing is selected. */
	public get selectedIndex(): number {
		return this._selectedIndex;
	}

	public set selectedIndex(value: number) {
		if (this._selectedIndex === value) return;
		this._selectedIndex = value;
		this._updateSelectedItem();
		this.invalidateState();
	}

	/** The currently selected data item. */
	public get selectedItem(): unknown {
		return this._selectedItem;
	}

	public set selectedItem(value: unknown) {
		if (this._selectedItem === value) return;
		this._selectedItem = value;
		if (this._dataProvider) {
			this._selectedIndex = this._dataProvider.getItemIndex(value);
		}
		this._updateLabel();
		this.invalidateState();
	}

	/** Whether the drop-down list is currently visible. */
	public get isOpen(): boolean {
		return this._isOpen;
	}

	public set isOpen(value: boolean) {
		if (this._isOpen === value) return;
		this._isOpen = value;
		this.invalidateState();
		if (this.dropDown) {
			this.dropDown.visible = value;
		}
	}

	/**
	 * The property name on data items to use as the label.
	 * Defaults to `'label'`. Used when `labelFunction` is not set.
	 */
	public get labelField(): string {
		return this._labelField;
	}

	public set labelField(value: string) {
		if (this._labelField === value) return;
		this._labelField = value;
		this._updateLabel();
	}

	/**
	 * A function that converts a data item to a display string.
	 * When set, this takes priority over `labelField`.
	 */
	public get labelFunction(): ((item: unknown) => string) | undefined {
		return this._labelFunction;
	}

	public set labelFunction(value: ((item: unknown) => string) | undefined) {
		if (this._labelFunction === value) return;
		this._labelFunction = value;
		this._updateLabel();
	}

	/** Placeholder text shown when no item is selected. */
	public get prompt(): string {
		return this._prompt;
	}

	public set prompt(value: string) {
		this._prompt = value;
		if (!this._selectedItem && this.labelDisplay) {
			this.labelDisplay.text = value;
		}
	}

	/** The displayed text (selected item label or prompt). */
	public get text(): string {
		if (this.labelDisplay) return this.labelDisplay.text;
		return this.itemToLabel(this._selectedItem);
	}

	public get textColor(): number {
		return this.labelDisplay?.textColor ?? 0;
	}

	public set textColor(value: number) {
		if (this.labelDisplay) {
			this.labelDisplay.textColor = value;
		}
	}

	// ── Override methods ──────────────────────────────────────────────────

	protected override getCurrentState(): string {
		if (!this.enabled) return 'disabled';
		if (this._isOpen) return 'open';
		return 'normal';
	}

	public override partAdded(partName: string, instance: unknown): void {
		super.partAdded(partName, instance);

		if (partName === 'labelDisplay' && instance === this.labelDisplay) {
			this._updateLabel();
		}

		if (partName === 'button' && instance instanceof Component) {
			instance.addEventListener(TouchEvent.TOUCH_TAP, this._onTriggerTap);
		}

		if (partName === 'list' && instance instanceof List) {
			instance.dataProvider = this._dataProvider;
			instance.addEventListener(Event.CHANGE, this._onListChange);
		}

		if (partName === 'dropDown' && instance instanceof Scroller) {
			instance.visible = this._isOpen;
		}
	}

	public override partRemoved(partName: string, instance: unknown): void {
		super.partRemoved(partName, instance);

		if (partName === 'button' && instance instanceof Component) {
			instance.removeEventListener(TouchEvent.TOUCH_TAP, this._onTriggerTap);
		}

		if (partName === 'list' && instance instanceof List) {
			instance.removeEventListener(Event.CHANGE, this._onListChange);
		}
	}

	public override commitProperties(): void {
		super.commitProperties();
		// Sync selectedIndex → list
		if (this.list && this.list.selectedIndex !== this._selectedIndex) {
			this.list.selectedIndex = this._selectedIndex;
		}
	}

	// ── Public methods ────────────────────────────────────────────────────

	/** Open the drop-down list. */
	public open(): void {
		this.isOpen = true;
	}

	/** Close the drop-down list. */
	public close(): void {
		this.isOpen = false;
	}

	/**
	 * Convert a data item to a label string using `labelFunction` or `labelField`.
	 */
	public itemToLabel(item: unknown): string {
		if (item == null) return '';
		if (this._labelFunction) return this._labelFunction(item);
		if (typeof item === 'string') return item;
		if (typeof item === 'number' || typeof item === 'boolean') return String(item);
		const obj = item as Record<string, unknown>;
		if (this._labelField && this._labelField in obj) {
			return String(obj[this._labelField]);
		}
		return String(item);
	}

	// ── Private methods ───────────────────────────────────────────────────

	private _updateSelectedItem(): void {
		if (this._dataProvider && this._selectedIndex >= 0 && this._selectedIndex < this._dataProvider.length) {
			this._selectedItem = this._dataProvider.getItemAt(this._selectedIndex);
		} else {
			this._selectedItem = undefined;
		}
		this._updateLabel();
		this.dispatchEventWith(Event.CHANGE);
	}

	private _updateLabel(): void {
		if (!this.labelDisplay) return;
		if (this._selectedItem != null) {
			this.labelDisplay.text = this.itemToLabel(this._selectedItem);
		} else {
			this.labelDisplay.text = this._prompt;
		}
	}

	private _onTriggerTap = (_e: Event): void => {
		this.isOpen = !this._isOpen;
	};

	private _onListChange = (_e: Event): void => {
		if (this.list) {
			this._selectedIndex = this.list.selectedIndex;
			this._updateSelectedItem();
		}
		// Close after selection
		this.close();
	};
}
