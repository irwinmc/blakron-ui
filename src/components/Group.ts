import { Sprite, Rectangle } from '@blakron/core';
import { UIComponentImpl, isUIComponent } from '../core/UIComponent.js';
import type { LayoutBase } from '../layouts/LayoutBase.js';
import type { IUIComponent } from '../core/IUIComponent.js';

/**
 * Group is the base container for UI components.
 * It participates in the invalidation/validation layout cycle and
 * delegates child positioning to a pluggable LayoutBase instance.
 *
 * Extends Sprite (which extends DisplayObjectContainer) so it can hold
 * display children, while UIComponentImpl provides the layout contract.
 */
export class Group extends Sprite implements IUIComponent {
	// Re-declare all IUIComponent members — they are mixed in from UIComponentImpl
	// via the prototype copy in the constructor.
	declare $ui: Record<number, number | boolean>;
	declare $includeInLayout: boolean;
	declare nestLevel: number;

	declare includeInLayout: boolean;
	declare left: number | string;
	declare right: number | string;
	declare top: number | string;
	declare bottom: number | string;
	declare horizontalCenter: number | string;
	declare verticalCenter: number | string;
	declare percentWidth: number;
	declare percentHeight: number;
	declare explicitWidth: number;
	declare explicitHeight: number;
	declare minWidth: number;
	declare maxWidth: number;
	declare minHeight: number;
	declare maxHeight: number;
	declare setMeasuredSize: (w: number, h: number) => void;
	declare invalidateProperties: () => void;
	declare validateProperties: () => void;
	declare invalidateSize: () => void;
	declare validateSize: (recursive?: boolean) => void;
	declare invalidateDisplayList: () => void;
	declare validateDisplayList: () => void;
	declare validateNow: () => void;
	declare setLayoutBoundsSize: (lw: number, lh: number) => void;
	declare setLayoutBoundsPosition: (x: number, y: number) => void;
	declare getLayoutBounds: (bounds: Rectangle) => void;
	declare getPreferredBounds: (bounds: Rectangle) => void;

	private _layout: LayoutBase | null = null;
	private _contentWidth = 0;
	private _contentHeight = 0;

	constructor() {
		super();
		// Apply UIComponent mixin
		UIComponentImpl.call(this as never);
	}

	// ── Layout ────────────────────────────────────────────────────────────

	get layout(): LayoutBase | null {
		return this._layout;
	}
	set layout(value: LayoutBase | null) {
		if (this._layout === value) return;
		if (this._layout) this._layout.target = null;
		this._layout = value;
		if (value) value.target = this;
		this.invalidateSize();
		this.invalidateDisplayList();
	}

	get contentWidth(): number {
		return this._contentWidth;
	}
	get contentHeight(): number {
		return this._contentHeight;
	}

	setContentSize(w: number, h: number): void {
		this._contentWidth = w;
		this._contentHeight = h;
	}

	// ── UIComponent overrides ─────────────────────────────────────────────

	protected measure(): void {
		if (this._layout) {
			this._layout.measure();
		} else {
			this.setMeasuredSize(0, 0);
		}
	}

	protected updateDisplayList(w: number, h: number): void {
		if (this._layout) {
			this._layout.updateDisplayList(w, h);
		}
	}

	// ── Child change hooks ────────────────────────────────────────────────

	override childAdded(child: unknown, index: number): void {
		super.childAdded(child as never, index);
		this.invalidateSize();
		this.invalidateDisplayList();
		if (this._layout) this._layout.elementAdded(index);
	}

	override childRemoved(child: unknown, index: number): void {
		super.childRemoved(child as never, index);
		this.invalidateSize();
		this.invalidateDisplayList();
		if (this._layout) this._layout.elementRemoved(index);
	}
}

// Apply UIComponentImpl prototype methods to Group
applyUIComponentMixin(Group);

function applyUIComponentMixin(TargetClass: typeof Group): void {
	const src = UIComponentImpl.prototype as unknown as Record<string, unknown>;
	const dst = TargetClass.prototype as unknown as Record<string, unknown>;
	for (const key of Object.getOwnPropertyNames(src)) {
		if (key === 'constructor') continue;
		if (dst[key] !== undefined && !isEmptyFn(dst, key)) continue;
		const desc = Object.getOwnPropertyDescriptor(src, key)!;
		Object.defineProperty(dst, key, desc);
	}
	dst.$super = Sprite.prototype;
}

function isEmptyFn(proto: Record<string, unknown>, key: string): boolean {
	if (typeof proto[key] !== 'function') return false;
	const body = String(proto[key]);
	const start = body.indexOf('{');
	const end = body.lastIndexOf('}');
	return body.substring(start + 1, end).trim() === '';
}
