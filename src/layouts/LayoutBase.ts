import { EventDispatcher } from '@blakron/core';
import type { ILayoutTarget } from './ILayoutTarget.js';

/**
 * Base class for all layout algorithms.
 * Subclasses must implement `measure()` and `updateDisplayList()`.
 */
export abstract class LayoutBase extends EventDispatcher {
	target: ILayoutTarget | null = null;

	// ── Virtual layout ────────────────────────────────────────────────────

	protected _useVirtualLayout = false;

	get useVirtualLayout(): boolean {
		return this._useVirtualLayout;
	}
	set useVirtualLayout(value: boolean) {
		value = !!value;
		if (this._useVirtualLayout === value) return;
		this._useVirtualLayout = value;
		this.dispatchEventWith('useVirtualLayoutChanged');
		if (!value) this.clearVirtualLayoutCache();
		if (this.target) this.target.invalidateDisplayList();
	}

	// ── Typical element size (for virtual layouts) ────────────────────────

	typicalWidth = 71;
	typicalHeight = 22;

	setTypicalSize(width: number, height: number): void {
		width = +width || 71;
		height = +height || 22;
		if (width !== this.typicalWidth || height !== this.typicalHeight) {
			this.typicalWidth = width;
			this.typicalHeight = height;
			this.target?.invalidateSize();
		}
	}

	// ── Hooks ─────────────────────────────────────────────────────────────

	scrollPositionChanged(): void {}
	clearVirtualLayoutCache(): void {}
	elementAdded(_index: number): void {}
	elementRemoved(_index: number): void {}
	getElementIndicesInView(): number[] {
		return [];
	}

	// ── Abstract ──────────────────────────────────────────────────────────

	abstract measure(): void;
	abstract updateDisplayList(width: number, height: number): void;
}
