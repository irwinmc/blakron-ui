import { Event } from '@blakron/core';
import { Component } from './Component.js';
import { EditableText } from './EditableText.js';
import { Label } from './Label.js';
import type { IDisplayText } from '../core/IDisplayText.js';

/**
 * Text input component with prompt (placeholder) and password support.
 *
 * Skin parts:
 * - `textDisplay`   — EditableText for actual input
 * - `promptDisplay` — Label shown when text is empty and unfocused
 *
 * States: `normal`, `disabled`, `normalWithPrompt`, `disabledWithPrompt`
 *
 * Egret-compatible: eui.TextInput
 */
export class TextInput extends Component implements IDisplayText {
	// ── Skin parts ────────────────────────────────────────────────────────────

	textDisplay?: EditableText;
	promptDisplay?: Label;

	// ── Cached values (applied when skin parts are added) ─────────────────────

	private _prompt = '';
	private _text = '';
	private _textColor?: number;
	private _displayAsPassword = false;
	private _maxChars = 0;
	private _restrict = '';
	private _isFocused = false;

	// ── prompt ────────────────────────────────────────────────────────────────

	get prompt(): string {
		return this.promptDisplay ? this.promptDisplay.text : this._prompt;
	}

	set prompt(value: string) {
		this._prompt = value;
		if (this.promptDisplay) this.promptDisplay.text = value;
		this.invalidateState();
	}

	// ── text ──────────────────────────────────────────────────────────────────

	get text(): string {
		return this.textDisplay ? this.textDisplay.text : this._text;
	}

	set text(value: string) {
		this._text = value;
		if (this.textDisplay) this.textDisplay.text = value;
		this.invalidateState();
	}

	// ── textColor ─────────────────────────────────────────────────────────────

	get textColor(): number {
		return this.textDisplay ? this.textDisplay.textColor : (this._textColor ?? 0xffffff);
	}

	set textColor(value: number) {
		this._textColor = value;
		if (this.textDisplay) this.textDisplay.textColor = value;
	}

	// ── displayAsPassword ─────────────────────────────────────────────────────

	get displayAsPassword(): boolean {
		return this.textDisplay ? this.textDisplay.displayAsPassword : this._displayAsPassword;
	}

	set displayAsPassword(value: boolean) {
		this._displayAsPassword = value;
		if (this.textDisplay) this.textDisplay.displayAsPassword = value;
	}

	// ── maxChars ──────────────────────────────────────────────────────────────

	get maxChars(): number {
		return this.textDisplay ? this.textDisplay.maxChars : this._maxChars;
	}

	set maxChars(value: number) {
		this._maxChars = value;
		if (this.textDisplay) this.textDisplay.maxChars = value;
	}

	// ── restrict ──────────────────────────────────────────────────────────────

	get restrict(): string {
		return this.textDisplay ? (this.textDisplay.restrict ?? '') : this._restrict;
	}

	set restrict(value: string) {
		this._restrict = value;
		if (this.textDisplay) this.textDisplay.restrict = value;
	}

	// ── State ─────────────────────────────────────────────────────────────────

	protected override getCurrentState(): string {
		const hasPrompt = !!this._prompt && !this._isFocused && !this.text;
		if (!this.enabled) {
			return hasPrompt && this.skin?.hasState('disabledWithPrompt') ? 'disabledWithPrompt' : 'disabled';
		}
		return hasPrompt && this.skin?.hasState('normalWithPrompt') ? 'normalWithPrompt' : 'normal';
	}

	// ── Skin part lifecycle ───────────────────────────────────────────────────

	protected override partAdded(partName: string, instance: unknown): void {
		super.partAdded(partName, instance);
		if (instance instanceof EditableText && partName === 'textDisplay') {
			this.textDisplay = instance;
			if (this._text) instance.text = this._text;
			if (this._textColor != null) instance.textColor = this._textColor;
			if (this._displayAsPassword) instance.displayAsPassword = true;
			if (this._maxChars) instance.maxChars = this._maxChars;
			if (this._restrict) instance.restrict = this._restrict;
			if (this._prompt) instance.prompt = this._prompt;
			instance.addEventListener(Event.FOCUS_IN, this._onFocusIn);
			instance.addEventListener(Event.FOCUS_OUT, this._onFocusOut);
		} else if (instance instanceof Label && partName === 'promptDisplay') {
			this.promptDisplay = instance;
			if (this._prompt) instance.text = this._prompt;
		}
	}

	protected override partRemoved(partName: string, instance: unknown): void {
		super.partRemoved(partName, instance);
		if (instance instanceof EditableText && partName === 'textDisplay') {
			this._text = instance.text;
			this._textColor = instance.textColor;
			this._displayAsPassword = instance.displayAsPassword;
			this._maxChars = instance.maxChars;
			this._restrict = instance.restrict ?? '';
			instance.removeEventListener(Event.FOCUS_IN, this._onFocusIn);
			instance.removeEventListener(Event.FOCUS_OUT, this._onFocusOut);
			this.textDisplay = undefined;
		} else if (instance instanceof Label && partName === 'promptDisplay') {
			this._prompt = instance.text;
			this.promptDisplay = undefined;
		}
	}

	// ── Private ───────────────────────────────────────────────────────────────

	private _onFocusIn = (): void => {
		this._isFocused = true;
		this.invalidateState();
	};

	private _onFocusOut = (): void => {
		this._isFocused = false;
		this.invalidateState();
	};
}
