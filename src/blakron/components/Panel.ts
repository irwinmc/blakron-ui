import { DisplayObject, TouchEvent, Event } from '@blakron/core';
import { Component } from './Component.js';
import { Button } from './Button.js';
import { UIEvent } from '../events/UIEvent.js';
import type { IDisplayText } from '../core/IDisplayText.js';

/**
 * Panel — a skinnable container with an optional title bar, close button, and drag area.
 *
 * Skin parts:
 * - `titleDisplay`  — IDisplayText for the panel title
 * - `closeButton`   — Button that dispatches UIEvent.CLOSING when tapped
 * - `moveArea`      — DisplayObject used as the drag handle
 *
 * Events:
 * - `UIEvent.CLOSING` — dispatched (bubbles, cancelable) when closeButton is tapped
 *
 * @defaultProperty elementsContent
 */
export class Panel extends Component {
	// ── title ─────────────────────────────────────────────────────────────────

	private _title = '';
	private _titleChanged = false;

	get title(): string {
		return this._title;
	}
	set title(value: string) {
		if (this._title === value) return;
		this._title = value;
		this._titleChanged = true;
		this.invalidateProperties();
	}

	// ── Skin parts ────────────────────────────────────────────────────────────

	private _titleDisplay: IDisplayText | undefined;

	get titleDisplay(): IDisplayText | undefined {
		return this._titleDisplay;
	}
	set titleDisplay(value: IDisplayText | undefined) {
		if (this._titleDisplay === value) return;
		this._titleDisplay = value;
		if (value && this._title) value.text = this._title;
	}

	/** Close button skin part. Tapping it dispatches UIEvent.CLOSING. */
	closeButton?: Button;

	/** Drag handle skin part. Dragging it moves the panel. */
	moveArea?: DisplayObject;

	// ── Drag state ────────────────────────────────────────────────────────────

	private _dragStartX = 0;
	private _dragStartY = 0;
	private _panelStartX = 0;
	private _panelStartY = 0;

	// ── commitProperties ──────────────────────────────────────────────────────

	override commitProperties(): void {
		super.commitProperties();
		if (this._titleChanged) {
			this._titleChanged = false;
			if (this._titleDisplay) this._titleDisplay.text = this._title;
		}
	}

	// ── Skin part lifecycle ───────────────────────────────────────────────────

	protected override partAdded(partName: string, instance: unknown): void {
		super.partAdded(partName, instance);
		if (instance instanceof Button && partName === 'closeButton') {
			this.closeButton = instance;
			instance.addEventListener(TouchEvent.TOUCH_TAP, this._onCloseButtonTap);
		} else if (instance instanceof DisplayObject && partName === 'moveArea') {
			this.moveArea = instance;
			instance.addEventListener(TouchEvent.TOUCH_BEGIN, this._onMoveAreaTouchBegin);
		}
	}

	protected override partRemoved(partName: string, instance: unknown): void {
		super.partRemoved(partName, instance);
		if (instance instanceof Button && partName === 'closeButton') {
			instance.removeEventListener(TouchEvent.TOUCH_TAP, this._onCloseButtonTap);
			this.closeButton = undefined;
		} else if (instance instanceof DisplayObject && partName === 'moveArea') {
			instance.removeEventListener(TouchEvent.TOUCH_BEGIN, this._onMoveAreaTouchBegin);
			this.moveArea = undefined;
		}
	}

	// ── Close ─────────────────────────────────────────────────────────────────

	/**
	 * Close the panel by removing it from its parent.
	 * Called automatically after UIEvent.CLOSING if not cancelled.
	 */
	public close(): void {
		if (this.parent) this.parent.removeChild(this);
	}

	// ── Private ───────────────────────────────────────────────────────────────

	private _onCloseButtonTap = (): void => {
		if (UIEvent.dispatchUIEvent(this, UIEvent.CLOSING, true, true)) {
			this.close();
		}
	};

	private _onMoveAreaTouchBegin = (e: Event): void => {
		const te = e as TouchEvent;
		this._dragStartX = te.stageX;
		this._dragStartY = te.stageY;
		this._panelStartX = this.x;
		this._panelStartY = this.y;
		const stage = this.stage;
		if (stage) {
			stage.addEventListener(TouchEvent.TOUCH_MOVE, this._onMoveAreaTouchMove);
			stage.addEventListener(TouchEvent.TOUCH_END, this._onMoveAreaTouchEnd);
		}
	};

	private _onMoveAreaTouchMove = (e: Event): void => {
		const te = e as TouchEvent;
		this.x = this._panelStartX + (te.stageX - this._dragStartX);
		this.y = this._panelStartY + (te.stageY - this._dragStartY);
	};

	private _onMoveAreaTouchEnd = (): void => {
		const stage = this.stage;
		if (stage) {
			stage.removeEventListener(TouchEvent.TOUCH_MOVE, this._onMoveAreaTouchMove);
			stage.removeEventListener(TouchEvent.TOUCH_END, this._onMoveAreaTouchEnd);
		}
	};
}
