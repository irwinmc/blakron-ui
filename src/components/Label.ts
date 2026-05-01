import { Component } from './Component.js';
import { TextField } from '@blakron/core';
import type { IDisplayText } from '../core/IDisplayText.js';

/**
 * Label component for displaying text.
 * Wraps a TextField and integrates it with the UI component lifecycle.
 *
 * States: none (non-interactive visual element).
 */
export class Label extends Component implements IDisplayText {
	protected _textField: TextField;

	constructor(text?: string) {
		super();
		this._textField = new TextField();
		this.touchChildren = false;
		if (text) this.text = text;
	}

	// ── Lifecycle ───────────────────────────────────────────────────────

	override createChildren(): void {
		super.createChildren();
		this.addChild(this._textField);
	}

	// ── Text ────────────────────────────────────────────────────────────

	get text(): string {
		return this._textField.text;
	}

	set text(value: string) {
		if (this._textField.text === value) return;
		this._textField.text = value;
		this.invalidateSize();
		this.invalidateDisplayList();
	}

	// ── Font ────────────────────────────────────────────────────────────

	get fontFamily(): string {
		return this._textField.fontFamily;
	}

	set fontFamily(value: string) {
		if (this._textField.fontFamily !== value) {
			this._textField.fontFamily = value;
			this.invalidateSize();
		}
	}

	get size(): number {
		return this._textField.size;
	}

	set size(value: number) {
		if (this._textField.size !== value) {
			this._textField.size = value;
			this.invalidateSize();
		}
	}

	get bold(): boolean {
		return this._textField.bold;
	}

	set bold(value: boolean) {
		if (this._textField.bold !== value) {
			this._textField.bold = value;
			this.invalidateSize();
		}
	}

	get italic(): boolean {
		return this._textField.italic;
	}

	set italic(value: boolean) {
		if (this._textField.italic !== value) {
			this._textField.italic = value;
			this.invalidateSize();
		}
	}

	// ── Color ───────────────────────────────────────────────────────────

	get textColor(): number {
		return this._textField.textColor;
	}

	set textColor(value: number) {
		this._textField.textColor = value;
	}

	get strokeColor(): number {
		return this._textField.strokeColor;
	}

	set strokeColor(value: number) {
		this._textField.strokeColor = value;
	}

	get stroke(): number {
		return this._textField.stroke;
	}

	set stroke(value: number) {
		this._textField.stroke = value;
	}

	// ── Alignment ───────────────────────────────────────────────────────

	get textAlign(): string {
		return this._textField.textAlign;
	}

	set textAlign(value: string) {
		if (this._textField.textAlign !== value) {
			this._textField.textAlign = value as any;
			this.invalidateDisplayList();
		}
	}

	get verticalAlign(): string {
		return this._textField.verticalAlign;
	}

	set verticalAlign(value: string) {
		if (this._textField.verticalAlign !== value) {
			this._textField.verticalAlign = value as any;
			this.invalidateDisplayList();
		}
	}

	// ── Layout ──────────────────────────────────────────────────────────

	get multiline(): boolean {
		return this._textField.multiline;
	}

	set multiline(value: boolean) {
		if (this._textField.multiline !== value) {
			this._textField.multiline = value;
			this.invalidateSize();
		}
	}

	get wordWrap(): boolean {
		return this._textField.wordWrap;
	}

	set wordWrap(value: boolean) {
		if (this._textField.wordWrap !== value) {
			this._textField.wordWrap = value;
			this.invalidateSize();
		}
	}

	get lineSpacing(): number {
		return this._textField.lineSpacing;
	}

	set lineSpacing(value: number) {
		if (this._textField.lineSpacing !== value) {
			this._textField.lineSpacing = value;
			this.invalidateSize();
		}
	}

	get maxChars(): number {
		return this._textField.maxChars;
	}

	set maxChars(value: number) {
		this._textField.maxChars = value;
	}

	get displayAsPassword(): boolean {
		return this._textField.displayAsPassword;
	}

	set displayAsPassword(value: boolean) {
		this._textField.displayAsPassword = value;
	}

	// ── Measurement ─────────────────────────────────────────────────────

	override measure(): void {
		this._textField.width = this.explicitWidth > 0 ? this.explicitWidth : 100000;
		this.setMeasuredSize(this._textField.textWidth, this._textField.textHeight);
	}

	override updateDisplayList(unscaledWidth: number, unscaledHeight: number): void {
		super.updateDisplayList(unscaledWidth, unscaledHeight);
		this._textField.width = unscaledWidth;
		this._textField.height = unscaledHeight;
	}
}
