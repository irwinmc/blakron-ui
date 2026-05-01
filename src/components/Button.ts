import { Component } from './Component.js';
import { Event, TouchEvent } from '@blakron/core';
import type { IDisplayText } from '../core/IDisplayText.js';

/**
 * Button component with label, icon, and state management.
 *
 * States: `up`, `down`, `disabled`, `upAndSelected`, `downAndSelected`, `disabledAndSelected`.
 * Dispatches `Event.CHANGE` and `'click'` on tap (when enabled).
 */
export class Button extends Component implements IDisplayText {
	private _label: string = '';
	private _icon: string | null = null;
	private _selected = false;
	private _toggle = false;
	private _autoRepeat = false;
	private _pressed = false;
	private _stickyHighlighting = false;

	/** Skin part: label display element (set by skin or manually). */
	labelDisplay: IDisplayText | null = null;

	/** Skin part: icon display element (set by skin or manually). */
	iconDisplay: import('../components/Image.js').Image | null = null;

	constructor() {
		super();
		this.touchChildren = true;
		this.addEventListener(TouchEvent.TOUCH_BEGIN, this._onTouchBegin);
		this.addEventListener(TouchEvent.TOUCH_END, this._onTouchEnd);
		this.addEventListener(TouchEvent.TOUCH_TAP, this._onTouchTap);
		this.addEventListener(TouchEvent.TOUCH_RELEASE_OUTSIDE, this._onTouchReleaseOutside);
	}

	// ── Label ───────────────────────────────────────────────────────────

	get label(): string {
		return this._label;
	}

	set label(value: string) {
		if (this._label === value) return;
		this._label = value;
		if (this.labelDisplay) {
			this.labelDisplay.text = value;
		}
	}

	// ── Text (IDisplayText) ─────────────────────────────────────────────

	get text(): string {
		return this._label;
	}

	// ── Icon ────────────────────────────────────────────────────────────

	get icon(): string | null {
		return this._icon;
	}

	set icon(value: string | null) {
		if (this._icon === value) return;
		this._icon = value;
		if (this.iconDisplay) {
			this.iconDisplay.source = value;
		}
	}

	// ── Selected ────────────────────────────────────────────────────────

	get selected(): boolean {
		return this._selected;
	}

	set selected(value: boolean) {
		if (this._selected === value) return;
		this._selected = value;
		this.invalidateState();
	}

	// ── Toggle ──────────────────────────────────────────────────────────

	get toggle(): boolean {
		return this._toggle;
	}

	set toggle(value: boolean) {
		this._toggle = value;
	}

	// ── AutoRepeat ──────────────────────────────────────────────────────

	get autoRepeat(): boolean {
		return this._autoRepeat;
	}

	set autoRepeat(value: boolean) {
		this._autoRepeat = value;
	}

	// ── Pressed (read-only) ─────────────────────────────────────────────

	get pressed(): boolean {
		return this._pressed;
	}

	// ── Enabled ─────────────────────────────────────────────────────────

	override set enabled(value: boolean) {
		if (this.enabled === value) return;
		super.enabled = value;
		this.invalidateState();
		this.touchEnabled = value;
	}

	// ── State ───────────────────────────────────────────────────────────

	override getCurrentState(): string {
		if (!this.enabled) {
			return this._selected ? 'disabledAndSelected' : 'disabled';
		}
		if (this._selected) {
			if (this._pressed || this._stickyHighlighting) return 'downAndSelected';
			return 'upAndSelected';
		}
		if (this._pressed) return 'down';
		return 'up';
	}

	// ── Skin part injection ─────────────────────────────────────────────

	override partAdded(partName: string, instance: any): void {
		super.partAdded(partName, instance);
		if (instance === this.labelDisplay) {
			this.labelDisplay!.text = this._label;
		}
		if (instance === this.iconDisplay) {
			if (this._icon) this.iconDisplay!.source = this._icon;
		}
	}

	// ── Event handlers ──────────────────────────────────────────────────

	private _onTouchBegin = (e: Event): void => {
		if (!this.enabled) return;
		e.stopPropagation();
		this._pressed = true;
		this._stickyHighlighting = false;
		this.invalidateState();
	};

	private _onTouchEnd = (e: Event): void => {
		this._pressed = false;
		this.invalidateState();
	};

	private _onTouchTap = (e: Event): void => {
		if (!this.enabled) return;

		if (this._toggle) {
			this._selected = !this._selected;
			this._stickyHighlighting = this._selected;
		}

		this.invalidateState();
		this.dispatchEventWith(Event.CHANGE);
		this.dispatchEventWith('click');
	};

	private _onTouchReleaseOutside = (_e: Event): void => {
		this._pressed = false;
		this._stickyHighlighting = false;
		this.invalidateState();
	};
}
