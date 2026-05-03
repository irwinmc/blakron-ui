import { TextField, TextFieldType, Event } from '@blakron/core';
import type { IDisplayText } from '../core/IDisplayText.js';

/**
 * Editable text component with placeholder (prompt) support.
 * Wraps TextField in INPUT mode and adds prompt text behavior.
 *
 * Egret-compatible: eui.EditableText
 */
export class EditableText extends TextField implements IDisplayText {
	// ── Instance fields ───────────────────────────────────────────────────

	private _prompt = '';
	private _promptColor = 0x999999;
	private _userTextColor = 0xffffff;
	private _isShowingPrompt = false;
	private _isFocused = false;
	private _asPassword = false;

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor() {
		super();
		this.type = TextFieldType.INPUT;
		this.addEventListener(Event.FOCUS_IN, this._onFocusIn);
		this.addEventListener(Event.FOCUS_OUT, this._onFocusOut);
	}

	// ── Getters / Setters ─────────────────────────────────────────────────

	public get prompt(): string {
		return this._prompt;
	}

	public set prompt(value: string) {
		if (this._prompt === value) return;
		this._prompt = value;
		if (!this._isFocused && (!this.text || this.text === this._prompt)) {
			this._showPrompt();
		}
	}

	public get promptColor(): number {
		return this._promptColor;
	}

	public set promptColor(value: number) {
		this._promptColor = value;
		if (this._isShowingPrompt) {
			this.textColor = value;
		}
	}

	public override get text(): string {
		const t = super.text;
		return this._isShowingPrompt ? '' : t;
	}

	public override set text(value: string) {
		if (this._isShowingPrompt && value === this._prompt) return;
		this._isShowingPrompt = false;
		this.textColor = this._userTextColor;
		this.displayAsPassword = this._asPassword;
		super.text = value;
		if (!this._isFocused && (!value || value === '')) {
			this._showPrompt();
		}
	}

	public override get textColor(): number {
		return super.textColor;
	}

	public override set textColor(value: number) {
		if (!this._isShowingPrompt) {
			this._userTextColor = value;
		}
		super.textColor = value;
	}

	public override get displayAsPassword(): boolean {
		return super.displayAsPassword;
	}

	public override set displayAsPassword(value: boolean) {
		this._asPassword = value;
		if (!this._isShowingPrompt) {
			super.displayAsPassword = value;
		}
	}

	// ── Private methods ───────────────────────────────────────────────────

	private _showPrompt(): void {
		if (!this._prompt) return;
		this._isShowingPrompt = true;
		super.textColor = this._promptColor;
		super.displayAsPassword = false;
		super.text = this._prompt;
	}

	private _onFocusIn = (): void => {
		this._isFocused = true;
		if (this._isShowingPrompt) {
			this._isShowingPrompt = false;
			this.textColor = this._userTextColor;
			this.displayAsPassword = this._asPassword;
			super.text = '';
		}
	};

	private _onFocusOut = (): void => {
		this._isFocused = false;
		if (!super.text) {
			this._showPrompt();
		}
	};
}
