import { ToggleButton } from './ToggleButton.js';

/**
 * Manages a group of mutually exclusive RadioButtons.
 * Only one radio button in a group can be selected at a time.
 */
export class RadioButtonGroup {
	// ── Instance fields ───────────────────────────────────────────────────

	private _radioButtons: RadioButton[] = [];
	private _selectedValue?: string | number;
	private _selectedRadioButton?: RadioButton;
	private _name: string;

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor(name = '') {
		this._name = name;
	}

	// ── Getters / Setters ─────────────────────────────────────────────────

	public get name(): string {
		return this._name;
	}

	public get numRadioButtons(): number {
		return this._radioButtons.length;
	}

	public get selectedValue(): string | number | undefined {
		return this._selectedValue;
	}

	public set selectedValue(value: string | number | undefined) {
		if (this._selectedValue === value) return;
		this._selectedValue = value;
		this._updateSelected();
	}

	public get selection(): RadioButton | undefined {
		return this._selectedRadioButton;
	}

	public set selection(value: RadioButton | undefined) {
		if (this._selectedRadioButton === value) return;
		this._selectedRadioButton = value;
		this._selectedValue = value?.value;
		for (const rb of this._radioButtons) {
			rb.selected = rb === value;
		}
	}

	// ── Public methods ────────────────────────────────────────────────────

	public addInstance(radioButton: RadioButton): void {
		if (this._radioButtons.indexOf(radioButton) !== -1) return;
		this._radioButtons.push(radioButton);
		if (this._selectedValue !== undefined && radioButton.value === this._selectedValue) {
			radioButton.selected = true;
			this._selectedRadioButton = radioButton;
		}
	}

	public removeInstance(radioButton: RadioButton): void {
		const idx = this._radioButtons.indexOf(radioButton);
		if (idx === -1) return;
		this._radioButtons.splice(idx, 1);
		if (this._selectedRadioButton === radioButton) {
			this._selectedRadioButton = undefined;
			this._selectedValue = undefined;
		}
	}

	public notifySelected(radioButton: RadioButton): void {
		this._selectedRadioButton = radioButton;
		this._selectedValue = radioButton.value;
		for (const rb of this._radioButtons) {
			if (rb !== radioButton) {
				rb.selected = false;
			}
		}
	}

	// ── Private methods ───────────────────────────────────────────────────

	private _updateSelected(): void {
		this._selectedRadioButton = undefined;
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
	// ── Instance fields ───────────────────────────────────────────────────

	private _groupName = '';
	private _group?: RadioButtonGroup;
	private _value: string | number = '';

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor() {
		super();
	}

	// ── Getters / Setters ─────────────────────────────────────────────────

	public get group(): RadioButtonGroup | undefined {
		return this._group;
	}

	public set group(value: RadioButtonGroup | undefined) {
		if (this._group === value) return;
		if (this._group) {
			this._group.removeInstance(this);
		}
		this._group = value;
		if (this._group) {
			this._group.addInstance(this);
		}
	}

	public get groupName(): string {
		return this._groupName;
	}

	public set groupName(value: string) {
		if (this._groupName === value) return;
		this._groupName = value;
		this.group = value ? getGroup(value) : undefined;
	}

	public get value(): string | number {
		return this._value;
	}

	public set value(val: string | number) {
		if (this._value === val) return;
		this._value = val;
	}

	public override get selected(): boolean {
		return super.selected;
	}

	public override set selected(value: boolean) {
		if (this.selected === value) return;
		super.selected = value;
		if (value && this._group) {
			this._group.notifySelected(this);
		}
	}

	protected override buttonReleased(): void {
		if (!this.enabled || this.selected) return;
		super.buttonReleased();
	}
}
