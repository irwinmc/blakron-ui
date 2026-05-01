import { Sprite, Rectangle, Event } from '@blakron/core';
import { UIComponentImpl, isUIComponent } from '../core/UIComponent.js';
import { BasicLayout } from '../layouts/BasicLayout.js';
import { getTheme } from '../core/Theme.js';
import type { IUIComponent } from '../core/IUIComponent.js';
import type { Skin } from './Skin.js';

/**
 * Base class for all skinnable UI components.
 *
 * Subclasses should:
 * 1. Override `getCurrentState()` to return the current view-state name.
 * 2. Override `partAdded()` to bind skin parts to component logic.
 * 3. Override `partRemoved()` to clean up skin part bindings.
 * 4. Override `createChildren()` to perform one-time initialization.
 */
export class Component extends Sprite implements IUIComponent {
	// UIComponent mixin declarations
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

	// ── Component state ───────────────────────────────────────────────────

	private _hostComponentKey: string | null = null;
	private _skinName: string | (new () => Skin) | Skin | null = null;
	private _skin: Skin | null = null;
	private _enabled = true;
	private _explicitState = '';
	private _stateIsDirty = false;

	/**
	 * @internal used by Theme to check if skinName was set explicitly
	 */
	skinNameExplicitlySet = false;

	constructor() {
		super();
		UIComponentImpl.call(this as never);
		this.touchEnabled = true;
	}

	// ── hostComponentKey ──────────────────────────────────────────────────

	/**
	 * Key used to look up the default skin in the active Theme.
	 * Defaults to the component's class name if not set.
	 */
	get hostComponentKey(): string {
		return this._hostComponentKey ?? (this.constructor as { name?: string }).name ?? '';
	}

	set hostComponentKey(value: string) {
		this._hostComponentKey = value;
	}

	// ── skinName ──────────────────────────────────────────────────────────

	/**
	 * Skin identifier. Can be:
	 * - A Skin subclass constructor
	 * - A Skin instance
	 * - A class name string (resolved via global scope)
	 */
	get skinName(): string | (new () => Skin) | Skin | null {
		return this._skinName;
	}

	set skinName(value: string | (new () => Skin) | Skin | null) {
		this.skinNameExplicitlySet = true;
		if (this._skinName === value) return;
		this._skinName = value;
		this._parseSkinName();
	}

	/**
	 * @internal Called by Theme when it resolves a default skin name.
	 */
	$applySkinName(skinName: string): void {
		this._skinName = skinName;
		this._parseSkinName();
	}

	private _parseSkinName(): void {
		const skinName = this._skinName;
		let skin: Skin | null = null;

		if (skinName) {
			if (typeof skinName === 'function') {
				// Constructor
				skin = new (skinName as new () => Skin)();
			} else if (typeof skinName === 'string') {
				// Class name string — look up in global scope
				const clazz = (globalThis as Record<string, unknown>)[skinName] as (new () => Skin) | undefined;
				if (clazz) skin = new clazz();
			} else {
				// Already a Skin instance
				skin = skinName as Skin;
			}
		}

		this._setSkin(skin);
	}

	// ── skin ──────────────────────────────────────────────────────────────

	get skin(): Skin | null {
		return this._skin;
	}

	protected setSkin(skin: Skin | null): void {
		this._setSkin(skin);
	}

	private _setSkin(skin: Skin | null): void {
		const oldSkin = this._skin;

		// Detach old skin
		if (oldSkin) {
			for (const partName of oldSkin.skinParts) {
				if ((this as Record<string, unknown>)[partName]) {
					this.setSkinPart(partName, null);
				}
			}
			for (const child of oldSkin.$elementsContent) {
				if (child.parent === this) this.removeChild(child);
			}
			oldSkin.hostComponent = null;
		}

		this._skin = skin;

		// Attach new skin
		if (skin) {
			for (const partName of skin.skinParts) {
				const instance = (skin as unknown as Record<string, unknown>)[partName];
				if (instance) this.setSkinPart(partName, instance);
			}
			// Add skin children in reverse so index 0 ends up at the bottom
			for (let i = skin.$elementsContent.length - 1; i >= 0; i--) {
				this.addChildAt(skin.$elementsContent[i], 0);
			}
			skin.hostComponent = this;
		}

		this.invalidateSize();
		this.invalidateDisplayList();
		this.dispatchEventWith(Event.COMPLETE);
	}

	// ── Skin parts ────────────────────────────────────────────────────────

	/**
	 * Bind a skin part instance to this component.
	 * Called automatically when a skin is attached.
	 */
	setSkinPart(partName: string, instance: unknown): void {
		const self = this as Record<string, unknown>;
		const old = self[partName];
		if (old) this.partRemoved(partName, old);
		self[partName] = instance;
		if (instance) this.partAdded(partName, instance);
	}

	/**
	 * Called when a skin part is added. Override to bind event listeners
	 * or apply cached property values to the part.
	 */
	protected partAdded(_partName: string, _instance: unknown): void {}

	/**
	 * Called when a skin part is removed. Override to clean up listeners
	 * and cached references.
	 */
	protected partRemoved(_partName: string, _instance: unknown): void {}

	// ── enabled ───────────────────────────────────────────────────────────

	get enabled(): boolean {
		return this._enabled;
	}
	set enabled(value: boolean) {
		value = !!value;
		if (this._enabled === value) return;
		this._enabled = value;
		this.touchEnabled = value;
		this.touchChildren = value;
		this.invalidateState();
	}

	// ── View state ────────────────────────────────────────────────────────

	/**
	 * The current view state. Setting this explicitly overrides `getCurrentState()`.
	 * Set to `''` or `null` to revert to the computed state.
	 */
	get currentState(): string {
		return this._explicitState || this.getCurrentState();
	}

	set currentState(value: string) {
		if (this._explicitState === value) return;
		this._explicitState = value;
		this.invalidateState();
	}

	/**
	 * Mark the view state as dirty so it will be re-applied on next commit.
	 */
	invalidateState(): void {
		if (this._stateIsDirty) return;
		this._stateIsDirty = true;
		this.invalidateProperties();
	}

	/**
	 * Return the current view-state name. Override in subclasses.
	 * Examples: `"up"`, `"down"`, `"disabled"`, `"selected"`.
	 */
	protected getCurrentState(): string {
		return this._enabled ? '' : 'disabled';
	}

	// ── UIComponent lifecycle overrides ───────────────────────────────────

	protected createChildren(): void {
		if (!this._skinName) {
			const theme = getTheme();
			if (theme) {
				const skinName = theme.getSkinName(this);
				if (skinName) this.$applySkinName(skinName);
			}
		}
	}

	protected commitProperties(): void {
		// Call UIComponentImpl's commitProperties (handles RESIZE / MOVE events)
		UIComponentImpl.prototype['commitProperties'].call(this);

		if (this._stateIsDirty) {
			this._stateIsDirty = false;
			if (this._skin) {
				this._skin.currentState = this.currentState;
			}
		}
	}

	protected measure(): void {
		// BasicLayout measurement for any direct children
		_basicLayout.measure.call({ $target: this } as never);

		const skin = this._skin;
		if (!skin) return;

		const v = this.$ui;
		const mwKey = 16; // K.measuredWidth
		const mhKey = 17; // K.measuredHeight

		if (!isNaN(skin.width)) {
			v[mwKey] = skin.width;
		} else {
			v[mwKey] = Math.max(Math.min(v[mwKey] as number, skin.maxWidth), skin.minWidth);
		}
		if (!isNaN(skin.height)) {
			v[mhKey] = skin.height;
		} else {
			v[mhKey] = Math.max(Math.min(v[mhKey] as number, skin.maxHeight), skin.minHeight);
		}
	}

	protected updateDisplayList(w: number, h: number): void {
		_basicLayout.updateDisplayList.call({ $target: this } as never, w, h);
	}

	protected _invalidateParentLayout(): void {
		const parent = this.parent;
		if (!parent || !this.$includeInLayout || !isUIComponent(parent)) return;
		parent.invalidateSize();
		parent.invalidateDisplayList();
	}

	// ── Child hooks ───────────────────────────────────────────────────────

	override childAdded(_child: unknown, _index: number): void {
		this.invalidateSize();
		this.invalidateDisplayList();
	}

	override childRemoved(_child: unknown, _index: number): void {
		this.invalidateSize();
		this.invalidateDisplayList();
	}
}

// Shared BasicLayout instance for Component measurement/layout
const _basicLayout = new BasicLayout();

// Apply UIComponentImpl mixin to Component
applyUIComponentMixin(Component);

function applyUIComponentMixin(TargetClass: typeof Component): void {
	const src = UIComponentImpl.prototype as unknown as Record<string, unknown>;
	const dst = TargetClass.prototype as unknown as Record<string, unknown>;
	for (const key of Object.getOwnPropertyNames(src)) {
		if (key === 'constructor') continue;
		// Don't overwrite methods the Component class explicitly defines
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
