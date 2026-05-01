import type { DisplayObject } from '@blakron/core';
import type { IUIComponent } from '../core/IUIComponent.js';

/**
 * Interface that layout algorithms require from their target container.
 * Both Group and Component implement this.
 */
export interface ILayoutTarget extends IUIComponent {
	readonly numChildren: number;
	getChildAt(index: number): DisplayObject | undefined;
	setMeasuredSize(w: number, h: number): void;
	setContentSize(w: number, h: number): void;
}
