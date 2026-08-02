import { TouchEvent, Point, DisplayObject, Event } from '@blakron/core';
import { Range } from './Range.js';
import { Direction } from '../core/Direction.js';
import { UIEvent } from '../events/UIEvent.js';

/**
 * SliderBase — abstract base for slider components.
 *
 * Extends {@link Range} with thumb-drag interaction.
 * Subclasses ({@link HSlider}, {@link VSlider}) set the direction.
 *
 * Expected skin parts:
 * - `thumb` — the draggable handle
 * - `track` — (optional) the track area, clicking it jumps the thumb
 *
 * @defaultProperty value
 */
export class SliderBase extends Range {
	// ── Instance fields ───────────────────────────────────────────────────

	private _direction = Direction.LTR;
	private _directionChanged = false;
	private _thumb?: DisplayObject;
	private _track?: DisplayObject;
	private _pendingValue = 0;
	private _liveDragging = true;
	private _isDragging = false;
	private _touchOffsetX = 0;
	private _touchOffsetY = 0;

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor() {
		super();
		this.maximum = 10;
	}

	// ── Getters / Setters ─────────────────────────────────────────────────

	public get direction(): string {
		return this._direction;
	}

	public set direction(value: string) {
		if (this._direction === value) return;
		this._direction = value;
		this._directionChanged = true;
		this.invalidateProperties();
		this.invalidateSize();
		this.invalidateDisplayList();
	}

	public get thumb(): DisplayObject | undefined {
		return this._thumb;
	}

	public set thumb(value: DisplayObject | undefined) {
		if (this._thumb === value) return;
		this._removeThumbListeners();
		this._thumb = value;
		this._addThumbListeners();
	}

	public get track(): DisplayObject | undefined {
		return this._track;
	}

	public set track(value: DisplayObject | undefined) {
		if (this._track === value) return;
		this._removeTrackListeners();
		this._track = value;
		this._addTrackListeners();
	}

	/** Whether `value` updates live during drag (default true). If false, value commits on release. */
	public get liveDragging(): boolean {
		return this._liveDragging;
	}

	public set liveDragging(value: boolean) {
		this._liveDragging = value;
	}

	/** The not-yet-committed value during interaction (egret parity). */
	public get pendingValue(): number {
		return this._pendingValue;
	}

	public set pendingValue(value: number) {
		this._pendingValue = value;
		this.invalidateDisplayList();
	}

	// ── Override methods ──────────────────────────────────────────────────

	public override commitProperties(): void {
		if (this._directionChanged) {
			this._directionChanged = false;
		}
		super.commitProperties();
	}

	public override measure(): void {
		super.measure();
	}

	protected override updateSkinDisplayList(): void {
		super.updateSkinDisplayList();
	}

	/**
	 * Converts a track-local position to a value. Override in subclasses
	 * to use track bounds (egret's HSlider/VSlider override this).
	 */
	protected pointToValue(x: number, y: number): number {
		return this.minimum;
	}

	// ── Private methods ───────────────────────────────────────────────────

	private _addThumbListeners(): void {
		if (!this._thumb) return;
		this._thumb.addEventListener(TouchEvent.TOUCH_BEGIN, this._onThumbDown);
	}

	private _removeThumbListeners(): void {
		if (!this._thumb) return;
		this._thumb.removeEventListener(TouchEvent.TOUCH_BEGIN, this._onThumbDown);
	}

	private _addTrackListeners(): void {
		if (!this._track) return;
		this._track.addEventListener(TouchEvent.TOUCH_BEGIN, this._onTrackDown);
	}

	private _removeTrackListeners(): void {
		if (!this._track) return;
		this._track.removeEventListener(TouchEvent.TOUCH_BEGIN, this._onTrackDown);
	}

	private _onThumbDown = (e: TouchEvent): void => {
		e.stopPropagation();
		this._isDragging = true;
		this._pendingValue = this.value;
		const stage = this.stage;
		if (stage) {
			stage.addEventListener(TouchEvent.TOUCH_MOVE, this._onThumbMove);
			stage.addEventListener(TouchEvent.TOUCH_END, this._onThumbUp);
		}
		UIEvent.dispatchUIEvent(this, UIEvent.CHANGE_START);
	};

	private _onThumbMove = (e: TouchEvent): void => {
		if (!this._isDragging || !this._track) return;
		const newValue = this._positionToValue(e.stageX, e.stageY);
		if (newValue !== this._pendingValue) {
			if (this._liveDragging) {
				this._pendingValue = newValue;
				this.value = newValue;
				this.dispatchEventWith(Event.CHANGE);
			} else {
				this._pendingValue = newValue;
				this.invalidateDisplayList();
			}
		}
	};

	private _onThumbUp = (_e: TouchEvent): void => {
		this._isDragging = false;
		const stage = this.stage;
		if (stage) {
			stage.removeEventListener(TouchEvent.TOUCH_MOVE, this._onThumbMove);
			stage.removeEventListener(TouchEvent.TOUCH_END, this._onThumbUp);
		}
		UIEvent.dispatchUIEvent(this, UIEvent.CHANGE_END);
		if (!this._liveDragging && this.value !== this._pendingValue) {
			this.value = this._pendingValue;
			this.dispatchEventWith(Event.CHANGE);
		}
	};

	private _onTrackDown = (e: TouchEvent): void => {
		e.stopPropagation();
		this._pendingValue = this.value;
		const newValue = this._positionToValue(e.stageX, e.stageY);
		if (this.value !== newValue) {
			this.value = newValue;
			this.dispatchEventWith(Event.CHANGE);
		}
	};

	private _positionToValue(stageX: number, stageY: number): number {
		if (!this._track) return this.minimum;
		const pt = this._track.globalToLocal(stageX, stageY, new Point());
		return this.nearestValidValue(this.pointToValue(pt.x, pt.y), this.snapInterval);
	}
}
