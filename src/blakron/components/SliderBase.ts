import { TouchEvent, Point } from '@blakron/core';
import { Range } from './Range.js';
import { Direction } from '../core/Direction.js';

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
	private _thumb?: TouchEvent['currentTarget'];
	private _track?: TouchEvent['currentTarget'];
	private _pendingValue = 0;
	private _isDragging = false;
	private _touchOffsetX = 0;
	private _touchOffsetY = 0;

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

	public get thumb(): TouchEvent['currentTarget'] | undefined {
		return this._thumb;
	}

	public set thumb(value: TouchEvent['currentTarget'] | undefined) {
		if (this._thumb === value) return;
		this._removeThumbListeners();
		this._thumb = value;
		this._addThumbListeners();
	}

	public get track(): TouchEvent['currentTarget'] | undefined {
		return this._track;
	}

	public set track(value: TouchEvent['currentTarget'] | undefined) {
		if (this._track === value) return;
		this._removeTrackListeners();
		this._track = value;
		this._addTrackListeners();
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
		if (!this._thumb) return;

		const thumbObj = this._thumb as unknown as { x: number; y: number; width: number; height: number };
		if (!thumbObj) return;

		const range = this.maximum - this.minimum;
		const ratio = range > 0 ? (this.value - this.minimum) / range : 0;

		if (this._direction === Direction.LTR) {
			thumbObj.x = ratio * (this.width - thumbObj.width);
		} else if (this._direction === Direction.RTL) {
			thumbObj.x = (1 - ratio) * (this.width - thumbObj.width);
		} else if (this._direction === Direction.TTB) {
			thumbObj.y = ratio * (this.height - thumbObj.height);
		} else {
			thumbObj.y = (1 - ratio) * (this.height - thumbObj.height);
		}
	}

	// ── Private methods ───────────────────────────────────────────────────

	private _addThumbListeners(): void {
		if (!this._thumb) return;
		const t = this._thumb as unknown as {
			addEventListener: (type: string, listener: (e: TouchEvent) => void) => void;
		};
		t.addEventListener(TouchEvent.TOUCH_BEGIN, this._onThumbDown);
	}

	private _removeThumbListeners(): void {
		if (!this._thumb) return;
		const t = this._thumb as unknown as {
			removeEventListener: (type: string, listener: (e: TouchEvent) => void) => void;
		};
		t.removeEventListener(TouchEvent.TOUCH_BEGIN, this._onThumbDown);
	}

	private _addTrackListeners(): void {
		if (!this._track) return;
		const t = this._track as unknown as {
			addEventListener: (type: string, listener: (e: TouchEvent) => void) => void;
		};
		t.addEventListener(TouchEvent.TOUCH_BEGIN, this._onTrackDown);
	}

	private _removeTrackListeners(): void {
		if (!this._track) return;
		const t = this._track as unknown as {
			removeEventListener: (type: string, listener: (e: TouchEvent) => void) => void;
		};
		t.removeEventListener(TouchEvent.TOUCH_BEGIN, this._onTrackDown);
	}

	private _onThumbDown = (e: TouchEvent): void => {
		e.stopPropagation();
		this._isDragging = true;
		const stage = (
			this as unknown as {
				stage: {
					addEventListener: (type: string, listener: (e: TouchEvent) => void) => void;
					removeEventListener: (type: string, listener: (e: TouchEvent) => void) => void;
				};
			}
		).stage;
		if (stage) {
			stage.addEventListener(TouchEvent.TOUCH_MOVE, this._onThumbMove);
			stage.addEventListener(TouchEvent.TOUCH_END, this._onThumbUp);
		}

		const thumbObj = this._thumb as unknown as { width: number; height: number; x: number; y: number };
		if (thumbObj) {
			this._touchOffsetX = e.stageX - thumbObj.x - thumbObj.width / 2;
			this._touchOffsetY = e.stageY - thumbObj.y - thumbObj.height / 2;
		}
	};

	private _onThumbMove = (e: TouchEvent): void => {
		if (!this._isDragging) return;
		this._updateValueFromPosition(e.stageX, e.stageY);
	};

	private _onThumbUp = (_e: TouchEvent): void => {
		this._isDragging = false;
		const stage = (
			this as unknown as {
				stage: {
					addEventListener: (type: string, listener: (e: TouchEvent) => void) => void;
					removeEventListener: (type: string, listener: (e: TouchEvent) => void) => void;
				};
			}
		).stage;
		if (stage) {
			stage.removeEventListener(TouchEvent.TOUCH_MOVE, this._onThumbMove);
			stage.removeEventListener(TouchEvent.TOUCH_END, this._onThumbUp);
		}
	};

	private _onTrackDown = (e: TouchEvent): void => {
		e.stopPropagation();
		this._updateValueFromPosition(e.stageX, e.stageY);
	};

	private _updateValueFromPosition(stageX: number, stageY: number): void {
		const trackObj = this._track as unknown as {
			width: number;
			height: number;
			x: number;
			y: number;
		};
		if (!trackObj) return;

		let range: number;
		let position: number;

		const pt = new Point();
		const thisPt = (this as unknown as { globalToLocal: (x: number, y: number, r?: Point) => Point }).globalToLocal(
			stageX,
			stageY,
			pt,
		);

		if (this._direction === Direction.LTR || this._direction === Direction.RTL) {
			range = this.width;
			position = thisPt.x;
		} else {
			range = this.height;
			position = thisPt.y;
		}

		if (range <= 0) return;

		let ratio = position / range;
		ratio = Math.max(0, Math.min(1, ratio));

		if (this._direction === Direction.RTL || this._direction === Direction.BTT) {
			ratio = 1 - ratio;
		}

		const newValue = this.minimum + ratio * (this.maximum - this.minimum);
		this.setValuePending(newValue);
	}
}
