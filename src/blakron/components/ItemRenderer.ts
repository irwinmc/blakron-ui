import { TouchEvent, Event } from '@blakron/core';
import { Component } from './Component.js';
import { PropertyEvent } from '../events/PropertyEvent.js';
import type { IItemRenderer } from '../core/IItemRenderer.js';

/**
 * Base class for item renderers used in data-driven containers
 * (DataGroup, List, TabBar…).
 *
 * States: `up` | `down` | `disabled` | `upAndSelected` | `downAndSelected`
 *
 * @skinPart iconDisplay  — optional IDisplayText or DisplayObject for an icon
 * @skinPart labelDisplay — optional IDisplayText for the item label
 */
export class ItemRenderer extends Component implements IItemRenderer {
	// ── Constructor ─────────────────────────────────────────────────────

	constructor() {
		super();
		this.addEventListener(TouchEvent.TOUCH_BEGIN, this._onTouchBegin);
	}

	// ── data ────────────────────────────────────────────────────────────

	private _data: unknown;

	/** The data object to render or edit. */
	get data(): unknown {
		return this._data;
	}
	set data(value: unknown) {
		if (this._data === value) return;
		this._data = value;
		PropertyEvent.dispatchPropertyEvent(this, 'data');
		this.dataChanged();
	}

	/** Called after `data` changes. Override to update the view. */
	protected dataChanged(): void {
		// override point
	}

	// ── selected ────────────────────────────────────────────────────────

	private _selected = false;

	/** Whether this item renderer is selected. */
	get selected(): boolean {
		return this._selected;
	}
	set selected(value: boolean) {
		if (this._selected === value) return;
		this._selected = value;
		this.invalidateState();
	}

	// ── itemIndex ───────────────────────────────────────────────────────

	/** The index of this item in the data provider. */
	itemIndex = -1;

	// ── Touch state machine ─────────────────────────────────────────────

	private _touchCaptured = false;

	private _onTouchBegin = (e: Event): void => {
		const te = e as TouchEvent;
		if (!this.stage) return;
		this.stage.addEventListener(TouchEvent.TOUCH_END, this._onStageTouchEnd);
		this.stage.addEventListener(TouchEvent.TOUCH_CANCEL, this._onStageTouchEnd);
		this._touchCaptured = true;
		this.invalidateState();
		te.updateAfterEvent();
	};

	private _onStageTouchEnd = (_e: Event): void => {
		const s = this.stage;
		if (s) {
			s.removeEventListener(TouchEvent.TOUCH_END, this._onStageTouchEnd);
			s.removeEventListener(TouchEvent.TOUCH_CANCEL, this._onStageTouchEnd);
		}
		this._touchCaptured = false;
		this.invalidateState();
	};

	// ── State ───────────────────────────────────────────────────────────

	protected override getCurrentState(): string {
		if (!this.enabled) return 'disabled';
		if (this._touchCaptured) return this._selected ? 'downAndSelected' : 'down';
		if (this._selected) {
			// Prefer "upAndSelected" if the skin supports it
			if (this.skin?.hasState('upAndSelected')) return 'upAndSelected';
			return 'down'; // fallback for minimal skins
		}
		return 'up';
	}
}
