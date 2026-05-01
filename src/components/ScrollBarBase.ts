import { Component } from './Component.js';
import type { IViewport } from '../core/IViewport.js';
import type { IUIComponent } from '../core/IUIComponent.js';
import { PropertyEvent } from '../events/PropertyEvent.js';
import { Event, type IEventDispatcher } from '@blakron/core';

/**
 * Base class for scroll bars.
 *
 * Connects to an IViewport and positions a `thumb` skin part based on the
 * viewport's scroll position relative to its content size.
 *
 * @skinPart thumb — the draggable thumb indicator.
 */
export class ScrollBarBase extends Component {
	/** [SkinPart] The thumb display object. */
	thumb?: IUIComponent;

	private _viewport: IViewport | undefined;

	/** Whether the scrollbar auto-hides when not needed. */
	autoVisibility = true;

	// ── viewport ────────────────────────────────────────────────────────

	get viewport(): IViewport | undefined {
		return this._viewport;
	}
	set viewport(value: IViewport | undefined) {
		if (value === this._viewport) return;
		const vp = this._viewport;
		if (vp) {
			const d = vp as unknown as IEventDispatcher;
			d.removeEventListener(PropertyEvent.PROPERTY_CHANGE, this._onPropChange);
			d.removeEventListener(Event.RESIZE, this._onResize);
		}
		this._viewport = value;
		if (value) {
			const d = value as unknown as IEventDispatcher;
			d.addEventListener(PropertyEvent.PROPERTY_CHANGE, this._onPropChange);
			d.addEventListener(Event.RESIZE, this._onResize);
		}
		this.invalidateDisplayList();
	}

	private _onPropChange = (e: Event): void => {
		this.onPropertyChanged(e as PropertyEvent);
	};

	private _onResize = (_e: Event): void => {
		this.invalidateDisplayList();
	};

	/**
	 * Called when viewport properties (scrollH, scrollV, contentWidth, etc.) change.
	 * Override in subclasses to react.
	 */
	protected onPropertyChanged(_event: PropertyEvent): void {}
}
