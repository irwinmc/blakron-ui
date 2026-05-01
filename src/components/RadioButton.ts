import { ToggleButton } from './ToggleButton.js';
import { Event } from '@blakron/core';

/**
 * Manages a group of mutually exclusive RadioButtons.
 * Only one radio button in a group can be selected at a time.
 */
export class RadioButtonGroup {
	private _radioButtons: RadioButton[] = [];
	private _selectedValue: string | number | null = null;
	private _selectedRadioButton: RadioButton | null = null;
	private _name: string;

	constructor(name: string = '') {
		this._name = name;
	}

	get name(): string {
		return this._name;
	}

	get numRadioButtons(): number {
		return this._radioButtons.length;
	}

	get selectedValue(): string | number | null {
		return this._selectedValue;
	}

	set selectedValue(value: string | number | null) {
		if (this._selectedValue === value) return;
		this._selectedValue = value;
		this.updateSelected();
	}

	get selection(): RadioButton | null {
		return this._selectedRadioButton;
	}

	set selection(value: RadioButton | null) {
		if (this._selectedRadioButton === value) return;
		this._selectedRadioButton = value;
		this._selectedValue = value ? value.value : null;
		for (const rb of this._radioButtons) {
			rb.selected = rb === value;
		}
	}

	/** Add a RadioButton to this group. */
	addInstance(radioButton: RadioButton): void {
		if (this._radioButtons.indexOf(radioButton) !== -1) return;
		this._radioButtons.push(radioButton);
		// If this radio's value matches the current selection, select it
		if (this._selectedValue != null && radioButton.value === this._selectedValue) {
			radioButton.selected = true;
			this._selectedRadioButton = radioButton;
		}
	}

	/** Remove a RadioButton from this group. */
	removeInstance(radioButton: RadioButton): void {
		const idx = this._radioButtons.indexOf(radioButton);
		if (idx === -1) return;
		this._radioButtons.splice(idx, 1);
		if (this._selectedRadioButton === radioButton) {
			this._selectedRadioButton = null;
			this._selectedValue = null;
		}
	}

	/** Called by a RadioButton when it gets selected. */
	notifySelected(radioButton: RadioButton): void {
		this._selectedRadioButton = radioButton;
		this._selectedValue = radioButton.value;
		for (const rb of this._radioButtons) {
			if (rb !== radioButton) {
				rb.selected = false;
			}
		}
	}

	private updateSelected(): void {
		this._selectedRadioButton = null;
		for (const rb of this._radioButtons) {
			if (rb.value === this._selectedValue) {
				this._selectedRadioButton = rb;
				rb.selected = true;
			} else {
				rb.selected = false;
			}
		}
	}
}

// ── Global registry for named groups ─────────────────────────────────────

const _groups: Record<string, RadioButtonGroup> = {};

function getGroup(name: string): RadioButtonGroup {
	if (!_groups[name]) {
		_groups[name] = new RadioButtonGroup(name);
	}
	return _groups[name];
}

// ── RadioButton Component ────────────────────────────────────────────────

/**
 * RadioButton component — a toggle button that belongs to a mutually exclusive group.
 * Only one radio button per group can be selected at a time.
 *
 * States: same as Button (`up`, `down`, `disabled`, `upAndSelected`, `downAndSelected`, `disabledAndSelected`).
 */
export class RadioButton extends ToggleButton {
	private _groupName: string = '';
	private _group: RadioButtonGroup | null = null;
	private _value: string | number = '';

	constructor() {
		super();
	}

	get group(): RadioButtonGroup | null {
		return this._group;
	}

	set group(value: RadioButtonGroup | null) {
		if (this._group === value) return;
		if (this._group) {
			this._group.removeInstance(this);
		}
		this._group = value;
		if (this._group) {
			this._group.addInstance(this);
		}
	}

	get groupName(): string {
		return this._groupName;
	}

	set groupName(value: string) {
		if (this._groupName === value) return;
		this._groupName = value;
		this.group = value ? getGroup(value) : null;
	}

	get value(): string | number {
		return this._value;
	}

	set value(val: string | number) {
		if (this._value === val) return;
		this._value = val;
	}

	// When a RadioButton is selected, notify the group for mutual exclusion
	override get selected(): boolean {
		return super.selected;
	}

	override set selected(value: boolean) {
		if (this.selected === value) return;
		super.selected = value;
		if (value && this._group) {
			this._group.notifySelected(this);
		}
	}
}
