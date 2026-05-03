import { Component } from './Component.js';
import { Event, TouchEvent, DisplayObject } from '@blakron/core';
import type { Texture } from '@blakron/core';
import type { IDisplayText } from '../core/IDisplayText.js';
import type { Image } from './Image.js';

/**
 * Button component with label, icon, and state management.
 *
 * States: `up`, `down`, `disabled`, `upAndSelected`, `downAndSelected`, `disabledAndSelected`.
 *
 * When the button is tapped (and enabled), it calls `buttonReleased()` which subclasses
 * can override. If `toggle` is true, the `selected` state is toggled automatically.
 */
export class Button extends Component implements IDisplayText {
	// ── Instance fields ───────────────────────────────────────────────────

	public labelDisplay?: IDisplayText;
	public iconDisplay?: Image;

	private _label = '';
	private _icon?: string | Texture;
	private _selected = false;
	private _toggle = false;
	private _autoRepeat = false;
	private _touchCaptured = false;
	private _stickyHighlighting = false;

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor() {
		super();
		this.touchChildren = false;
		this.addEventListener(TouchEvent.TOUCH_BEGIN, this._onTouchBegin);
	}

	// ── Getters / Setters ─────────────────────────────────────────────────

	public get label(): string {
		return this._label;
	}

	public set label(value: string) {
		this._label = value;
		if (this.labelDisplay) {
			this.labelDisplay.text = value;
		}
	}

	public get text(): string {
		return this._label;
	}

	public get icon(): string | Texture | undefined {
		return this._icon;
	}

	public set icon(value: string | Texture | undefined) {
		this._icon = value;
		if (this.iconDisplay) {
			this.iconDisplay.source = value;
		}
	}

	public get selected(): boolean {
		return this._selected;
	}

	public set selected(value: boolean) {
		if (this._selected === value) return;
		this._selected = value;
		this.invalidateState();
	}

	public get toggle(): boolean {
		return this._toggle;
	}

	public set toggle(value: boolean) {
		this._toggle = value;
	}

	public get autoRepeat(): boolean {
		return this._autoRepeat;
	}

	public set autoRepeat(value: boolean) {
		this._autoRepeat = value;
	}

	public get touchCaptured(): boolean {
		return this._touchCaptured;
	}

	public override get enabled(): boolean {
		return super.enabled;
	}

	public override set enabled(value: boolean) {
		if (this.enabled === value) return;
		super.enabled = value;
		this.invalidateState();
		this.touchEnabled = value;
	}

	// ── Override methods ──────────────────────────────────────────────────

	public override partAdded(partName: string, instance: unknown): void {
		super.partAdded(partName, instance);
		if (instance === this.labelDisplay) {
			this.labelDisplay!.text = this._label;
		}
		if (instance === this.iconDisplay) {
			this.iconDisplay!.source = this._icon;
		}
	}

	protected override getCurrentState(): string {
		if (!this.enabled) {
			return this._selected ? 'disabledAndSelected' : 'disabled';
		}
		if (this._selected) {
			if (this._touchCaptured || this._stickyHighlighting) return 'downAndSelected';
			return 'upAndSelected';
		}
		if (this._touchCaptured) return 'down';
		return 'up';
	}

	// ── Protected methods ─────────────────────────────────────────────────

	/**
	 * Called when the user taps the button (touch ends within the button bounds).
	 * Subclasses should override this to perform the button action.
	 * The base implementation handles toggle behavior.
	 */
	protected buttonReleased(): void {
		if (this._toggle) {
			this._selected = !this._selected;
			this._stickyHighlighting = this._selected;
		}
		this.invalidateState();
		this.dispatchEventWith(Event.CHANGE);
	}

	// ── Private methods ───────────────────────────────────────────────────

	private _onTouchBegin = (_e: Event): void => {
		if (!this.enabled) return;
		this._touchCaptured = true;
		this.invalidateState();
		const stage = this.stage;
		if (stage) {
			stage.addEventListener(TouchEvent.TOUCH_END, this._onStageTouchEnd);
			stage.addEventListener(TouchEvent.TOUCH_CANCEL, this._onTouchCancel);
		}
	};

	private _onStageTouchEnd = (e: Event): void => {
		const stage = this.stage;
		if (stage) {
			stage.removeEventListener(TouchEvent.TOUCH_END, this._onStageTouchEnd);
			stage.removeEventListener(TouchEvent.TOUCH_CANCEL, this._onTouchCancel);
		}
		const target = (e as TouchEvent).target;
		if (target instanceof DisplayObject && this.contains(target)) {
			this.buttonReleased();
		}
		this._touchCaptured = false;
		this.invalidateState();
	};

	private _onTouchCancel = (_e: Event): void => {
		const stage = this.stage;
		if (stage) {
			stage.removeEventListener(TouchEvent.TOUCH_END, this._onStageTouchEnd);
			stage.removeEventListener(TouchEvent.TOUCH_CANCEL, this._onTouchCancel);
		}
		this._touchCaptured = false;
		this.invalidateState();
	};
}
