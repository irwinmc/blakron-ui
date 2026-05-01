import { LayoutBase } from './LayoutBase.js';
import { JustifyAlign } from './JustifyAlign.js';
import { ColumnAlign } from './ColumnAlign.js';
import { RowAlign } from './RowAlign.js';
import { TileOrientation } from './TileOrientation.js';
import type { ILayoutTarget } from './ILayoutTarget.js';
import type { IUIComponent } from '../core/IUIComponent.js';
import { Rectangle } from '@blakron/core';

const tmpBounds = new Rectangle();

/**
 * TileLayout arranges layout elements in columns and rows of equally-sized cells.
 *
 * Supports orientation (rows vs columns), requested column/row counts,
 * column/row alignment justification, percent size within cells, and virtual layout.
 */
export class TileLayout extends LayoutBase {
	// ── Gap ─────────────────────────────────────────────────────────────

	private _horizontalGap = 6;
	private explicitHorizontalGap = NaN;

	get horizontalGap(): number {
		return this._horizontalGap;
	}
	set horizontalGap(value: number) {
		value = +value;
		if (value === this._horizontalGap) return;
		this.explicitHorizontalGap = value;
		this._horizontalGap = value;
		this.invalidateTargetLayout();
	}

	private _verticalGap = 6;
	private explicitVerticalGap = NaN;

	get verticalGap(): number {
		return this._verticalGap;
	}
	set verticalGap(value: number) {
		value = +value;
		if (value === this._verticalGap) return;
		this.explicitVerticalGap = value;
		this._verticalGap = value;
		this.invalidateTargetLayout();
	}

	// ── Column / Row count ──────────────────────────────────────────────

	private _columnCount = -1;

	get columnCount(): number {
		return this._columnCount;
	}

	private _requestedColumnCount = 0;

	get requestedColumnCount(): number {
		return this._requestedColumnCount;
	}
	set requestedColumnCount(value: number) {
		value = +value || 0;
		if (this._requestedColumnCount === value) return;
		this._requestedColumnCount = value;
		this._columnCount = value;
		this.invalidateTargetLayout();
	}

	private _rowCount = -1;

	get rowCount(): number {
		return this._rowCount;
	}

	private _requestedRowCount = 0;

	get requestedRowCount(): number {
		return this._requestedRowCount;
	}
	set requestedRowCount(value: number) {
		value = +value || 0;
		if (this._requestedRowCount === value) return;
		this._requestedRowCount = value;
		this._rowCount = value;
		this.invalidateTargetLayout();
	}

	// ── Column width / Row height ───────────────────────────────────────

	private _columnWidth = NaN;
	private explicitColumnWidth = NaN;

	get columnWidth(): number {
		return this._columnWidth;
	}
	set columnWidth(value: number) {
		value = +value;
		if (value === this._columnWidth) return;
		this.explicitColumnWidth = value;
		this._columnWidth = value;
		this.invalidateTargetLayout();
	}

	private _rowHeight = NaN;
	private explicitRowHeight = NaN;

	get rowHeight(): number {
		return this._rowHeight;
	}
	set rowHeight(value: number) {
		value = +value;
		if (value === this._rowHeight) return;
		this.explicitRowHeight = value;
		this._rowHeight = value;
		this.invalidateTargetLayout();
	}

	// ── Padding ─────────────────────────────────────────────────────────

	private _paddingLeft = 0;
	private _paddingRight = 0;
	private _paddingTop = 0;
	private _paddingBottom = 0;

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

	// ── Alignment ───────────────────────────────────────────────────────

	private _horizontalAlign: string = JustifyAlign.JUSTIFY;

	get horizontalAlign(): string {
		return this._horizontalAlign;
	}
	set horizontalAlign(value: string) {
		if (this._horizontalAlign === value) return;
		this._horizontalAlign = value;
		this.invalidateTargetLayout();
	}

	private _verticalAlign: string = JustifyAlign.JUSTIFY;

	get verticalAlign(): string {
		return this._verticalAlign;
	}
	set verticalAlign(value: string) {
		if (this._verticalAlign === value) return;
		this._verticalAlign = value;
		this.invalidateTargetLayout();
	}

	// ── Column / Row alignment ──────────────────────────────────────────

	private _columnAlign: string = ColumnAlign.LEFT;

	get columnAlign(): string {
		return this._columnAlign;
	}
	set columnAlign(value: string) {
		if (this._columnAlign === value) return;
		this._columnAlign = value;
		this.invalidateTargetLayout();
	}

	private _rowAlign: string = RowAlign.TOP;

	get rowAlign(): string {
		return this._rowAlign;
	}
	set rowAlign(value: string) {
		if (this._rowAlign === value) return;
		this._rowAlign = value;
		this.invalidateTargetLayout();
	}

	// ── Orientation ─────────────────────────────────────────────────────

	private _orientation: string = TileOrientation.ROWS;

	get orientation(): string {
		return this._orientation;
	}
	set orientation(value: string) {
		if (this._orientation === value) return;
		this._orientation = value;
		this.invalidateTargetLayout();
	}

	// ── Invalidation helper ─────────────────────────────────────────────

	private invalidateTargetLayout(): void {
		if (this.target) {
			this.target.invalidateSize();
			this.target.invalidateDisplayList();
		}
	}

	// ── Max element size cache ──────────────────────────────────────────

	private maxElementWidth = 0;
	private maxElementHeight = 0;
	private startIndex = -1;
	private endIndex = -1;
	private indexInViewCalculated = false;

	private updateMaxElementSize(): void {
		if (!this.target) return;
		if (this._useVirtualLayout) {
			this.maxElementWidth = Math.max(this.maxElementWidth, this.typicalWidth);
			this.maxElementHeight = Math.max(this.maxElementHeight, this.typicalHeight);
			this.doUpdateMaxElementSize(this.startIndex, this.endIndex);
		} else {
			this.doUpdateMaxElementSize(0, this.target.numChildren - 1);
		}
	}

	private doUpdateMaxElementSize(startIdx: number, endIdx: number): void {
		let maxW = this.maxElementWidth;
		let maxH = this.maxElementHeight;
		if (startIdx !== -1 && endIdx !== -1) {
			for (let i = startIdx; i <= endIdx; i++) {
				const el = asLayoutElement(this.target!, i);
				if (!el || !el.includeInLayout) continue;
				el.getPreferredBounds(tmpBounds);
				maxW = Math.max(maxW, tmpBounds.width);
				maxH = Math.max(maxH, tmpBounds.height);
			}
		}
		this.maxElementWidth = maxW;
		this.maxElementHeight = maxH;
	}

	override clearVirtualLayoutCache(): void {
		super.clearVirtualLayoutCache();
		this.maxElementWidth = 0;
		this.maxElementHeight = 0;
	}

	// ── Calculate row and column ────────────────────────────────────────

	private calculateRowAndColumn(explicitWidth: number, explicitHeight: number): void {
		const target = this.target!;
		const hGap = isNaN(this._horizontalGap) ? 0 : this._horizontalGap;
		const vGap = isNaN(this._verticalGap) ? 0 : this._verticalGap;
		this._rowCount = this._columnCount = -1;

		let numElements = target.numChildren;
		for (let i = 0; i < target.numChildren; i++) {
			const el = asLayoutElement(target, i);
			if (el && !el.includeInLayout) numElements--;
		}

		if (numElements === 0) {
			this._rowCount = this._columnCount = 0;
			return;
		}

		if (isNaN(this.explicitColumnWidth) || isNaN(this.explicitRowHeight)) {
			this.updateMaxElementSize();
		}

		this._columnWidth = isNaN(this.explicitColumnWidth) ? this.maxElementWidth : this.explicitColumnWidth;
		this._rowHeight = isNaN(this.explicitRowHeight) ? this.maxElementHeight : this.explicitRowHeight;

		let itemWidth = this._columnWidth + hGap;
		if (itemWidth <= 0) itemWidth = 1;
		let itemHeight = this._rowHeight + vGap;
		if (itemHeight <= 0) itemHeight = 1;

		const orientedByColumns = this._orientation === TileOrientation.COLUMNS;
		const widthHasSet = !isNaN(explicitWidth);
		const heightHasSet = !isNaN(explicitHeight);

		if (this._requestedColumnCount > 0 || this._requestedRowCount > 0) {
			if (this._requestedRowCount > 0) this._rowCount = Math.min(this._requestedRowCount, numElements);
			if (this._requestedColumnCount > 0) this._columnCount = Math.min(this._requestedColumnCount, numElements);
		} else if (!widthHasSet && !heightHasSet) {
			const side = Math.sqrt(numElements * itemWidth * itemHeight);
			if (orientedByColumns) {
				this._rowCount = Math.max(1, Math.round(side / itemHeight));
			} else {
				this._columnCount = Math.max(1, Math.round(side / itemWidth));
			}
		} else if (widthHasSet && (!heightHasSet || !orientedByColumns)) {
			const targetWidth = Math.max(0, explicitWidth - this._paddingLeft - this._paddingRight);
			this._columnCount = Math.floor((targetWidth + hGap) / itemWidth);
			this._columnCount = Math.max(1, Math.min(this._columnCount, numElements));
		} else {
			const targetHeight = Math.max(0, explicitHeight - this._paddingTop - this._paddingBottom);
			this._rowCount = Math.floor((targetHeight + vGap) / itemHeight);
			this._rowCount = Math.max(1, Math.min(this._rowCount, numElements));
		}

		if (this._rowCount === -1) this._rowCount = Math.max(1, Math.ceil(numElements / this._columnCount));
		if (this._columnCount === -1) this._columnCount = Math.max(1, Math.ceil(numElements / this._rowCount));

		if (this._requestedColumnCount > 0 && this._requestedRowCount > 0) {
			if (this._orientation === TileOrientation.ROWS)
				this._rowCount = Math.max(1, Math.ceil(numElements / this._requestedColumnCount));
			else this._columnCount = Math.max(1, Math.ceil(numElements / this._requestedRowCount));
		}
	}

	// ── Measure ─────────────────────────────────────────────────────────

	override measure(): void {
		const target = this.target!;
		const savedColumnCount = this._columnCount;
		const savedRowCount = this._rowCount;
		const savedColumnWidth = this._columnWidth;
		const savedRowHeight = this._rowHeight;

		let measuredWidth = 0;
		let measuredHeight = 0;

		this.calculateRowAndColumn(target.explicitWidth, target.explicitHeight);

		const columnCount = this._requestedColumnCount > 0 ? this._requestedColumnCount : this._columnCount;
		const rowCount = this._requestedRowCount > 0 ? this._requestedRowCount : this._rowCount;
		const hGap = isNaN(this._horizontalGap) ? 0 : this._horizontalGap;
		const vGap = isNaN(this._verticalGap) ? 0 : this._verticalGap;

		if (columnCount > 0) {
			measuredWidth = columnCount * (this._columnWidth + hGap) - hGap;
		}
		if (rowCount > 0) {
			measuredHeight = rowCount * (this._rowHeight + vGap) - vGap;
		}

		const hPadding = this._paddingLeft + this._paddingRight;
		const vPadding = this._paddingTop + this._paddingBottom;
		target.setMeasuredSize(measuredWidth + hPadding, measuredHeight + vPadding);

		this._columnCount = savedColumnCount;
		this._rowCount = savedRowCount;
		this._columnWidth = savedColumnWidth;
		this._rowHeight = savedRowHeight;
	}

	// ── Scroll position changed (virtual) ──────────────────────────────

	override scrollPositionChanged(): void {
		if (this._useVirtualLayout) {
			const changed = this.getIndexInView();
			if (changed) {
				this.indexInViewCalculated = true;
				this.target?.invalidateDisplayList();
			}
		}
	}

	// ── Get index in view (virtual) ─────────────────────────────────────

	private getIndexInView(): boolean {
		const target = this.target;
		if (!target || target.numChildren === 0) {
			this.startIndex = this.endIndex = -1;
			return false;
		}

		const numElements = target.numChildren;
		if (!this._useVirtualLayout) {
			this.startIndex = 0;
			this.endIndex = numElements - 1;
			return false;
		}

		if (target.width === 0 || target.height === 0) {
			this.startIndex = this.endIndex = -1;
			return false;
		}

		const oldStartIndex = this.startIndex;
		const oldEndIndex = this.endIndex;
		const paddingL = this._paddingLeft;
		const paddingT = this._paddingTop;
		const hGap = isNaN(this._horizontalGap) ? 0 : this._horizontalGap;
		const vGap = isNaN(this._verticalGap) ? 0 : this._verticalGap;

		if (this._orientation === TileOrientation.COLUMNS) {
			const itemWidth = this._columnWidth + hGap;
			if (itemWidth <= 0) {
				this.startIndex = 0;
				this.endIndex = numElements - 1;
				return false;
			}
			const minVisibleX = target.scrollH ?? 0;
			const maxVisibleX = minVisibleX + target.width;
			let startColumn = Math.floor((minVisibleX - paddingL) / itemWidth);
			if (startColumn < 0) startColumn = 0;
			let endColumn = Math.ceil((maxVisibleX - paddingL) / itemWidth);
			if (endColumn < 0) endColumn = 0;
			this.startIndex = Math.min(numElements - 1, Math.max(0, startColumn * this._rowCount));
			this.endIndex = Math.min(numElements - 1, Math.max(0, endColumn * this._rowCount - 1));
		} else {
			const itemHeight = this._rowHeight + vGap;
			if (itemHeight <= 0) {
				this.startIndex = 0;
				this.endIndex = numElements - 1;
				return false;
			}
			const minVisibleY = target.scrollV ?? 0;
			const maxVisibleY = minVisibleY + target.height;
			let startRow = Math.floor((minVisibleY - paddingT) / itemHeight);
			if (startRow < 0) startRow = 0;
			let endRow = Math.ceil((maxVisibleY - paddingT) / itemHeight);
			if (endRow < 0) endRow = 0;
			this.startIndex = Math.min(numElements - 1, Math.max(0, startRow * this._columnCount));
			this.endIndex = Math.min(numElements - 1, Math.max(0, endRow * this._columnCount - 1));
		}

		return this.startIndex !== oldStartIndex || this.endIndex !== oldEndIndex;
	}

	// ── Adjust for justify ──────────────────────────────────────────────

	private adjustForJustify(width: number, height: number): void {
		const paddingL = this._paddingLeft;
		const paddingR = this._paddingRight;
		const paddingT = this._paddingTop;
		const paddingB = this._paddingBottom;

		const targetWidth = Math.max(0, width - paddingL - paddingR);
		const targetHeight = Math.max(0, height - paddingT - paddingB);

		if (!isNaN(this.explicitVerticalGap)) this._verticalGap = this.explicitVerticalGap;
		if (!isNaN(this.explicitHorizontalGap)) this._horizontalGap = this.explicitHorizontalGap;
		this._verticalGap = isNaN(this._verticalGap) ? 0 : this._verticalGap;
		this._horizontalGap = isNaN(this._horizontalGap) ? 0 : this._horizontalGap;

		const offsetY = targetHeight - this._rowHeight * this._rowCount;
		const offsetX = targetWidth - this._columnWidth * this._columnCount;

		if (offsetY > 0) {
			if (this._rowAlign === RowAlign.JUSTIFY_USING_GAP) {
				const gapCount = Math.max(1, this._rowCount - 1);
				this._verticalGap = offsetY / gapCount;
			} else if (this._rowAlign === RowAlign.JUSTIFY_USING_HEIGHT) {
				if (this._rowCount > 0) {
					this._rowHeight += (offsetY - (this._rowCount - 1) * this._verticalGap) / this._rowCount;
				}
			}
		}
		if (offsetX > 0) {
			if (this._columnAlign === ColumnAlign.JUSTIFY_USING_GAP) {
				const gapCount = Math.max(1, this._columnCount - 1);
				this._horizontalGap = offsetX / gapCount;
			} else if (this._columnAlign === ColumnAlign.JUSTIFY_USING_WIDTH) {
				if (this._columnCount > 0) {
					this._columnWidth += (offsetX - (this._columnCount - 1) * this._horizontalGap) / this._columnCount;
				}
			}
		}
	}

	// ── Size and position a single element within its cell ──────────────

	private sizeAndPositionElement(
		element: IUIComponent,
		cellX: number,
		cellY: number,
		cellWidth: number,
		cellHeight: number,
	): void {
		let elementWidth = NaN;
		let elementHeight = NaN;

		if (this._horizontalAlign === JustifyAlign.JUSTIFY) {
			elementWidth = cellWidth;
		} else if (!isNaN(element.percentWidth)) {
			elementWidth = cellWidth * element.percentWidth * 0.01;
		}

		if (this._verticalAlign === JustifyAlign.JUSTIFY) {
			elementHeight = cellHeight;
		} else if (!isNaN(element.percentHeight)) {
			elementHeight = cellHeight * element.percentHeight * 0.01;
		}

		element.setLayoutBoundsSize(Math.round(elementWidth), Math.round(elementHeight));

		let x = cellX;
		element.getLayoutBounds(tmpBounds);
		switch (this._horizontalAlign) {
			case 'right':
				x += cellWidth - tmpBounds.width;
				break;
			case 'center':
				x = cellX + (cellWidth - tmpBounds.width) / 2;
				break;
		}

		let y = cellY;
		switch (this._verticalAlign) {
			case 'bottom':
				y += cellHeight - tmpBounds.height;
				break;
			case 'middle':
				y += (cellHeight - tmpBounds.height) / 2;
				break;
		}

		element.setLayoutBoundsPosition(Math.round(x), Math.round(y));
	}

	// ── Update display list ─────────────────────────────────────────────

	override updateDisplayList(width: number, height: number): void {
		const target = this.target;
		if (!target) return;

		const paddingL = this._paddingLeft;
		const paddingR = this._paddingRight;
		const paddingT = this._paddingTop;
		const paddingB = this._paddingBottom;

		if (this.indexInViewCalculated) {
			this.indexInViewCalculated = false;
		} else {
			this.calculateRowAndColumn(width, height);
			if (this._rowCount === 0 || this._columnCount === 0) {
				target.setContentSize(paddingL + paddingR, paddingT + paddingB);
				return;
			}
			this.adjustForJustify(width, height);
			this.getIndexInView();
		}

		if (this._useVirtualLayout) {
			this.calculateRowAndColumn(width, height);
			this.adjustForJustify(width, height);
		}

		if (this.startIndex === -1 || this.endIndex === -1) {
			target.setContentSize(0, 0);
			return;
		}

		const endIdx = this.endIndex;

		const orientedByColumns = this._orientation === TileOrientation.COLUMNS;
		let index = this.startIndex;
		const hGap = isNaN(this._horizontalGap) ? 0 : this._horizontalGap;
		const vGap = isNaN(this._verticalGap) ? 0 : this._verticalGap;
		const rowCount = this._rowCount;
		const columnCount = this._columnCount;
		const columnWidth = this._columnWidth;
		const rowHeight = this._rowHeight;

		for (let i = this.startIndex; i <= endIdx; i++) {
			let el: IUIComponent | null;
			if (this._useVirtualLayout) {
				el = asLayoutElement(target, i);
			} else {
				el = asLayoutElement(target, i);
			}
			if (!el || !el.includeInLayout) {
				continue;
			}

			let columnIndex: number;
			let rowIndex: number;

			if (orientedByColumns) {
				columnIndex = Math.ceil((index + 1) / rowCount) - 1;
				rowIndex = Math.ceil((index + 1) % rowCount) - 1;
				if (rowIndex === -1) rowIndex = rowCount - 1;
			} else {
				columnIndex = Math.ceil((index + 1) % columnCount) - 1;
				if (columnIndex === -1) columnIndex = columnCount - 1;
				rowIndex = Math.ceil((index + 1) / columnCount) - 1;
			}

			let x: number;
			switch (this._horizontalAlign) {
				case 'right':
					x = width - (columnIndex + 1) * (columnWidth + hGap) + hGap - paddingR;
					break;
				case 'left':
					x = columnIndex * (columnWidth + hGap) + paddingL;
					break;
				default:
					x = columnIndex * (columnWidth + hGap) + paddingL;
			}

			let y: number;
			switch (this._verticalAlign) {
				case 'top':
					y = rowIndex * (rowHeight + vGap) + paddingT;
					break;
				case 'bottom':
					y = height - (rowIndex + 1) * (rowHeight + vGap) + vGap - paddingB;
					break;
				default:
					y = rowIndex * (rowHeight + vGap) + paddingT;
			}

			this.sizeAndPositionElement(el, x, y, columnWidth, rowHeight);
			index++;
		}

		const hPadding = paddingL + paddingR;
		const vPadding = paddingT + paddingB;
		const contentWidth = (columnWidth + hGap) * columnCount - hGap;
		const contentHeight = (rowHeight + vGap) * rowCount - vGap;
		target.setContentSize(contentWidth + hPadding, contentHeight + vPadding);
	}
}

// ── Helpers ─────────────────────────────────────────────────────────────

function asLayoutElement(target: ILayoutTarget, index: number): IUIComponent | null {
	const child = target.getChildAt(index);
	if (!child) return null;
	const el = child as unknown as IUIComponent;
	if (typeof el.getPreferredBounds === 'function') return el;
	return null;
}
