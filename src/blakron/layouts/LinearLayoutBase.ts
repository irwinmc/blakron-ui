import { LayoutBase } from './LayoutBase.js';
import type { ILayoutTarget } from './ILayoutTarget.js';
import type { IUIComponent } from '../core/IUIComponent.js';

/**
 * Internal info for percent-based layout calculation.
 */
interface ChildInfo {
	layoutElement: IUIComponent;
	size: number;
	percent: number;
	min: number;
	max: number;
}

/**
 * Base class for HorizontalLayout and VerticalLayout.
 * Provides common properties: gap, padding, horizontalAlign, verticalAlign,
 * virtual layout caching, and percent-size distribution.
 */
export abstract class LinearLayoutBase extends LayoutBase {
	// ── Alignment ───────────────────────────────────────────────────────

	protected _horizontalAlign: string = 'left';

	get horizontalAlign(): string {
		return this._horizontalAlign;
	}
	set horizontalAlign(value: string) {
		if (this._horizontalAlign === value) return;
		this._horizontalAlign = value;
		if (this.target) this.target.invalidateDisplayList();
	}

	protected _verticalAlign: string = 'top';

	get verticalAlign(): string {
		return this._verticalAlign;
	}
	set verticalAlign(value: string) {
		if (this._verticalAlign === value) return;
		this._verticalAlign = value;
		if (this.target) this.target.invalidateDisplayList();
	}

	// ── Gap ─────────────────────────────────────────────────────────────

	protected _gap = 6;

	get gap(): number {
		return this._gap;
	}
	set gap(value: number) {
		value = +value || 0;
		if (this._gap === value) return;
		this._gap = value;
		this.invalidateTargetLayout();
	}

	// ── Padding ─────────────────────────────────────────────────────────

	protected _paddingLeft = 0;
	protected _paddingRight = 0;
	protected _paddingTop = 0;
	protected _paddingBottom = 0;

	get paddingLeft(): number {
		return this._paddingLeft;
	}
	set paddingLeft(value: number) {
		value = +value || 0;
		if (this._paddingLeft === value) return;
		this._paddingLeft = value;
		this.invalidateTargetLayout();
	}

	get paddingRight(): number {
		return this._paddingRight;
	}
	set paddingRight(value: number) {
		value = +value || 0;
		if (this._paddingRight === value) return;
		this._paddingRight = value;
		this.invalidateTargetLayout();
	}

	get paddingTop(): number {
		return this._paddingTop;
	}
	set paddingTop(value: number) {
		value = +value || 0;
		if (this._paddingTop === value) return;
		this._paddingTop = value;
		this.invalidateTargetLayout();
	}

	get paddingBottom(): number {
		return this._paddingBottom;
	}
	set paddingBottom(value: number) {
		value = +value || 0;
		if (this._paddingBottom === value) return;
		this._paddingBottom = value;
		this.invalidateTargetLayout();
	}

	// ── Invalidation helper ─────────────────────────────────────────────

	protected invalidateTargetLayout(): void {
		const target = this.target;
		if (target) {
			target.invalidateSize();
			target.invalidateDisplayList();
		}
	}

	// ── Virtual layout support ──────────────────────────────────────────

	protected elementSizeTable: number[] = [];
	protected maxElementSize = 0;
	protected startIndex = -1;
	protected endIndex = -1;
	protected indexInViewCalculated = false;

	override clearVirtualLayoutCache(): void {
		if (!this._useVirtualLayout) return;
		this.elementSizeTable = [];
		this.maxElementSize = 0;
	}

	override elementRemoved(index: number): void {
		if (!this._useVirtualLayout) return;
		super.elementRemoved(index);
		this.elementSizeTable.splice(index, 1);
	}

	/** Get the starting position of the element at the given index. */
	protected getStartPosition(_index: number): number {
		return 0;
	}

	/** Get the size of the element at the given index. */
	protected getElementSize(_index: number): number {
		return 0;
	}

	/** Get the total size of all cached elements. */
	protected getElementTotalSize(): number {
		return 0;
	}

	/**
	 * Binary search to find the element index at a given position.
	 */
	protected findIndexAt(x: number, i0: number, i1: number): number {
		const index = ((i0 + i1) * 0.5) | 0;
		const elementX = this.getStartPosition(index);
		const elementWidth = this.getElementSize(index);
		if (x >= elementX && x < elementX + elementWidth + this._gap) return index;
		else if (i0 === i1) return -1;
		else if (x < elementX) return this.findIndexAt(x, i0, Math.max(i0, index - 1));
		else return this.findIndexAt(x, Math.min(index + 1, i1), i1);
	}

	/** Check if the visible index range has changed. */
	protected getIndexInView(): boolean {
		return false;
	}

	override scrollPositionChanged(): void {
		super.scrollPositionChanged();
		if (this._useVirtualLayout) {
			const changed = this.getIndexInView();
			if (changed) {
				this.indexInViewCalculated = true;
				this.target?.invalidateDisplayList();
			}
		}
	}

	// ── Measure / updateDisplayList dispatch ────────────────────────────

	override measure(): void {
		if (!this.target) return;
		if (this._useVirtualLayout) {
			this.measureVirtual();
		} else {
			this.measureReal();
		}
	}

	override updateDisplayList(width: number, height: number): void {
		const target = this.target;
		if (!target) return;

		if (target.numChildren === 0) {
			target.setContentSize(
				Math.ceil(this._paddingLeft + this._paddingRight),
				Math.ceil(this._paddingTop + this._paddingBottom),
			);
			return;
		}

		if (this._useVirtualLayout) {
			this.updateDisplayListVirtual(width, height);
		} else {
			this.updateDisplayListReal(width, height);
		}
	}

	protected measureReal(): void {
		// override in subclass
	}

	protected measureVirtual(): void {
		// override in subclass
	}

	protected updateDisplayListReal(_width: number, _height: number): void {
		// override in subclass
	}

	protected updateDisplayListVirtual(_width: number, _height: number): void {
		// override in subclass
	}

	// ── Percent-size distribution ───────────────────────────────────────

	/**
	 * Distribute available space among percent-sized children,
	 * respecting min/max constraints.
	 */
	protected flexChildrenProportionally(
		spaceForChildren: number,
		spaceToDistribute: number,
		totalPercent: number,
		childInfoArray: ChildInfo[],
	): void {
		let numElements = childInfoArray.length;
		let done: boolean;

		do {
			done = true;

			let unused = spaceToDistribute - (spaceForChildren * totalPercent) / 100;
			if (unused > 0) spaceToDistribute -= unused;
			else unused = 0;

			const spacePerPercent = spaceToDistribute / totalPercent;

			for (let i = 0; i < numElements; i++) {
				const childInfo = childInfoArray[i];
				const size = childInfo.percent * spacePerPercent;

				if (size < childInfo.min) {
					const min = childInfo.min;
					childInfo.size = min;
					childInfoArray[i] = childInfoArray[--numElements];
					childInfoArray[numElements] = childInfo;
					totalPercent -= childInfo.percent;
					if (unused >= min) {
						unused -= min;
					} else {
						spaceToDistribute -= min - unused;
						unused = 0;
					}
					done = false;
					break;
				} else if (size > childInfo.max) {
					const max = childInfo.max;
					childInfo.size = max;
					childInfoArray[i] = childInfoArray[--numElements];
					childInfoArray[numElements] = childInfo;
					totalPercent -= childInfo.percent;
					if (unused >= max) {
						unused -= max;
					} else {
						spaceToDistribute -= max - unused;
						unused = 0;
					}
					done = false;
					break;
				} else {
					childInfo.size = size;
				}
			}
		} while (!done);
	}
}
