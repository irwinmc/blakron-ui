import { Component } from './Component.js';
import type { IDisplayText } from '../core/IDisplayText.js';

/**
 * Panel — a skinnable container with an optional title bar.
 *
 * Expected skin parts:
 * - `titleDisplay` — an `IDisplayText` for the panel title
 * - `contentGroup` — a `Group` that holds the panel content
 *
 * @defaultProperty elementsContent
 */
export class Panel extends Component {
	// ── title ───────────────────────────────────────────────────────────

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

	// ── Skin parts ──────────────────────────────────────────────────────

	private _titleDisplay: IDisplayText | null = null;

	get titleDisplay(): IDisplayText | null {
		return this._titleDisplay;
	}
	set titleDisplay(value: IDisplayText | null) {
		if (this._titleDisplay === value) return;
		this._titleDisplay = value;
		if (value && this._title) {
			value.text = this._title;
		}
	}

	// ── commitProperties ────────────────────────────────────────────────

	override commitProperties(): void {
		super.commitProperties();
		if (this._titleChanged) {
			this._titleChanged = false;
			if (this._titleDisplay) {
				this._titleDisplay.text = this._title;
			}
		}
	}
}
