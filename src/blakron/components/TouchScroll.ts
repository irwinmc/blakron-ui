import { ticker, getTimer } from '@blakron/core';
import { Animation } from './Animation.js';

// ── Constants ──────────────────────────────────────────────────────────

/** Max number of historical velocity samples to keep. */
const MAX_VELOCITY_COUNT = 4;

/** Ease-out cubic for throw-to-boundary animations. */
function easeOut(ratio: number): number {
	const inv = ratio - 1.0;
	return inv * inv * inv + 1;
}

/**
 * Touch-scroll physics simulator.
 *
 * Records velocity while the user drags, then computes a target position
 * and easing duration for the "throw" phase when the finger is released.
 *
 * Usage:
 * 1. Call `start(touchPoint)` on touch-begin.
 * 2. Call `update(touchPoint, maxScroll, currentScroll)` on touch-move.
 * 3. Call `finish(currentScroll, maxScroll)` on touch-end.
 */
export class TouchScroll {
	private _updateFunction: (scrollPos: number) => void;
	private _endFunction: () => void;
	private _animation: Animation;

	// ── Scroll factor (adjustable throw speed) ──────────────────────────

	/** Adjustable throw speed multiplier. 0 disables throw animation. */
	scrollFactor = 1.0;

	/** Whether the content bounces when dragged past the edge. */
	bounces = true;

	// ── Internal state ──────────────────────────────────────────────────

	private _previousTime = 0;
	private _velocity = 0;
	private _previousVelocity: number[] = [];
	private _currentPosition = 0;
	private _previousPosition = 0;
	private _currentScrollPos = 0;
	private _maxScrollPos = 0;
	private _offsetPoint = 0;
	private _started = false;

	constructor(updateFunction: (scrollPos: number) => void, endFunction: () => void) {
		this._updateFunction = updateFunction;
		this._endFunction = endFunction;
		this._animation = new Animation(this.onScrollingUpdate, this);
		this._animation.easerFunction = easeOut;
	}

	/** Whether the throw animation is currently playing. */
	isPlaying(): boolean {
		return this._animation.isPlaying;
	}

	/** Stop any in-progress throw animation. */
	stop(): void {
		this._animation.stop();
		ticker.stopTick(this.onTick, this);
		this._started = false;
	}

	/** Whether `start()` has been called (and `finish()` not yet called). */
	isStarted(): boolean {
		return this._started;
	}

	// ── Touch lifecycle ─────────────────────────────────────────────────

	/** Begin tracking touch movement. */
	start(touchPoint: number): void {
		this._started = true;
		this._velocity = 0;
		this._previousVelocity.length = 0;
		this._previousTime = getTimer();
		this._previousPosition = this._currentPosition = touchPoint;
		this._offsetPoint = touchPoint;
		ticker.startTick(this.onTick, this);
	}

	/** Update current touch position and apply to scroll. */
	update(touchPoint: number, maxScrollValue: number, scrollValue: number): void {
		maxScrollValue = Math.max(maxScrollValue, 0);
		this._currentPosition = touchPoint;
		this._maxScrollPos = maxScrollValue;

		const disMove = this._offsetPoint - touchPoint;
		let scrollPos = disMove + scrollValue;
		this._offsetPoint = touchPoint;

		if (scrollPos < 0) {
			if (!this.bounces) {
				scrollPos = 0;
			} else {
				scrollPos -= disMove * 0.5;
			}
		}
		if (scrollPos > maxScrollValue) {
			if (!this.bounces) {
				scrollPos = maxScrollValue;
			} else {
				scrollPos -= disMove * 0.5;
			}
		}

		this._currentScrollPos = scrollPos;
		this._updateFunction(scrollPos);
	}

	/** Finish tracking and compute throw target. */
	finish(currentScrollPos: number, maxScrollPos: number): void {
		ticker.stopTick(this.onTick, this);
		this._started = false;

		// No throw animation — just snap back to bounds if out of range.
		if (currentScrollPos < 0 || currentScrollPos > maxScrollPos) {
			const posTo = Math.max(0, Math.min(maxScrollPos, currentScrollPos));
			this.throwTo(posTo, 300);
		} else {
			this._endFunction();
		}
	}

	// ── Tick callback (velocity tracking) ───────────────────────────────

	private onTick = (timeStamp: number): boolean => {
		const timeOffset = timeStamp - this._previousTime;
		if (timeOffset > 10) {
			const pv = this._previousVelocity;
			if (pv.length >= MAX_VELOCITY_COUNT) {
				pv.shift();
			}
			this._velocity = (this._currentPosition - this._previousPosition) / timeOffset;
			pv.push(this._velocity);
			this._previousTime = timeStamp;
			this._previousPosition = this._currentPosition;
		}
		return true;
	};

	// ── Throw animation helpers ─────────────────────────────────────────

	private throwTo(posTo: number, duration = 300): void {
		const hsp = this._currentScrollPos;
		if (Math.abs(hsp - posTo) < 0.5) {
			this._endFunction();
			return;
		}
		const anim = this._animation;
		anim.duration = duration;
		anim.from = hsp;
		anim.to = posTo;
		anim.play();
	}

	private onScrollingUpdate(animation: Animation): void {
		this._currentScrollPos = animation.currentValue;
		this._updateFunction(animation.currentValue);
	}
}
