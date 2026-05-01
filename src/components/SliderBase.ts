import { TouchEvent, Point } from '@blakron/core';
import { Range } from './Range.js';
import { Direction } from '../core/Direction.js';
import { PropertyEvent } from '../events/PropertyEvent.js';

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
	// ── Internal state ──────────────────────────────────────────────────

	private _direction: string = Direction.LTR;
	private _directionChanged = false;

	private _thumb: TouchEvent['currentTarget'] | null = null;
	private _track: TouchEvent['currentTarget'] | null = null;

	private _pendingValue = 0;
	private _isDragging = false;
	private _touchOffsetX = 0;
	private _touchOffsetY = 0;

	// ── direction ───────────────────────────────────────────────────────

	get direction(): string {
		return this._direction;
	}
	set direction(value: string) {
		if (this._direction === value) return;
		this._direction = value;
		this._directionChanged = true;
		this.invalidateProperties();
		this.invalidateSize();
		this.invalidateDisplayList();
	}

	// ── Skin parts ──────────────────────────────────────────────────────

	/** The draggable thumb. */
	get thumb(): TouchEvent['currentTarget'] | null {
		return this._thumb;
	}
	set thumb(value: TouchEvent['currentTarget'] | null) {
		if (this._thumb === value) return;
		this.removeThumbListeners();
		this._thumb = value;
		this.addThumbListeners();
	}

	/** The track area. Clicking it jumps the value. */
	get track(): TouchEvent['currentTarget'] | null {
		return this._track;
	}
	set track(value: TouchEvent['currentTarget'] | null) {
		if (this._track === value) return;
		this.removeTrackListeners();
		this._track = value;
		this.addTrackListeners();
	}

	// ── commitProperties ────────────────────────────────────────────────

	override commitProperties(): void {
		if (this._directionChanged) {
			this._directionChanged = false;
		}
		super.commitProperties();
	}

	override measure(): void {
		super.measure();
	}

	// ── Touch handlers ──────────────────────────────────────────────────

	private addThumbListeners(): void {
		if (!this._thumb) return;
		const t = this._thumb as unknown as { addEventListener: Function };
		t.addEventListener(TouchEvent.TOUCH_BEGIN, this._onThumbDown);
	}

	private removeThumbListeners(): void {
		if (!this._thumb) return;
		const t = this._thumb as unknown as { removeEventListener: Function };
		t.removeEventListener(TouchEvent.TOUCH_BEGIN, this._onThumbDown);
	}

	private addTrackListeners(): void {
		if (!this._track) return;
		const t = this._track as unknown as { addEventListener: Function };
		t.addEventListener(TouchEvent.TOUCH_BEGIN, this._onTrackDown);
	}

	private removeTrackListeners(): void {
		if (!this._track) return;
		const t = this._track as unknown as { removeEventListener: Function };
		t.removeEventListener(TouchEvent.TOUCH_BEGIN, this._onTrackDown);
	}

	// ── Thumb drag ──────────────────────────────────────────────────────

	private _onThumbDown = (e: TouchEvent): void => {
		e.stopPropagation();
		this._isDragging = true;
		const stage = (this as unknown as { stage: { addEventListener: Function; removeEventListener: Function } })
			.stage;
		if (stage) {
			stage.addEventListener(TouchEvent.TOUCH_MOVE, this._onThumbMove);
			stage.addEventListener(TouchEvent.TOUCH_END, this._onThumbUp);
		}

		// Calculate offset from thumb center to touch point
		const thumbObj = this._thumb as unknown as { width: number; height: number; x: number; y: number };
		if (thumbObj) {
			this._touchOffsetX = e.stageX - thumbObj.x - thumbObj.width / 2;
			this._touchOffsetY = e.stageY - thumbObj.y - thumbObj.height / 2;
		}
	};

	private _onThumbMove = (e: TouchEvent): void => {
		if (!this._isDragging) return;
		this.updateValueFromPosition(e.stageX, e.stageY);
	};

	private _onThumbUp = (_e: TouchEvent): void => {
		this._isDragging = false;
		const stage = (this as unknown as { stage: { addEventListener: Function; removeEventListener: Function } })
			.stage;
		if (stage) {
			stage.removeEventListener(TouchEvent.TOUCH_MOVE, this._onThumbMove);
			stage.removeEventListener(TouchEvent.TOUCH_END, this._onThumbUp);
		}
	};

	// ── Track click ─────────────────────────────────────────────────────

	private _onTrackDown = (e: TouchEvent): void => {
		e.stopPropagation();
		this.updateValueFromPosition(e.stageX, e.stageY);
	};

	// ── Position → value ────────────────────────────────────────────────

	private updateValueFromPosition(stageX: number, stageY: number): void {
		const trackObj = this._track as unknown as {
			width: number;
			height: number;
			x: number;
			y: number;
			getPreferredBounds?: (r: { x: number; y: number; width: number; height: number }) => void;
		};
		if (!trackObj) return;

		let range: number;
		let position: number;

		// Get track bounds in local coordinates
		const pt = new Point();
		// Convert stage coords to our local coords
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

	// ── updateSkinDisplayList ───────────────────────────────────────────

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
}
