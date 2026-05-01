import { Sprite, Rectangle, Event, type DisplayObject } from '@blakron/core';
import { UIState, isUIComponent } from '../core/UIState.js';
import type { IUIOwner } from '../core/UIState.js';
import { BasicLayout } from '../layouts/BasicLayout.js';
import { getTheme } from '../core/Theme.js';
import type { IUIComponent } from '../core/IUIComponent.js';
import type { ILayoutTarget } from '../layouts/ILayoutTarget.js';
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
export class Component extends Sprite implements IUIComponent, ILayoutTarget, IUIOwner {
	readonly ui: UIState;

	private _hostComponentKey: string | undefined;
	private _skinName: string | (new () => Skin) | Skin | undefined;
	private _skin: Skin | undefined;
	private _enabled = true;
	private _explicitTouchEnabled = true;
	private _explicitTouchChildren = true;
	private _explicitState = '';
	private _stateIsDirty = false;

	skinNameExplicitlySet = false;

	constructor() {
		super();
		this.ui = new UIState(this);
		this.touchEnabled = true;
	}

	// ── Stage attachment ──────────────────────────────────────────────────

	override onAddToStage(stage: unknown, nestLevel: number): void {
		super.onAddToStage(stage as never, nestLevel);
		this.ui.onAddToStage();
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
	get skinName(): string | (new () => Skin) | Skin | undefined {
		return this._skinName;
	}
	set skinName(value: string | (new () => Skin) | Skin | undefined) {
		this.skinNameExplicitlySet = true;
		if (this._skinName === value) return;
		this._skinName = value;
		this._parseSkinName();
	}

	_applySkinName(skinName: string): void {
		this._skinName = skinName;
		this._parseSkinName();
	}

	private _parseSkinName(): void {
		const skinName = this._skinName;
		let skin: Skin | undefined;
		if (skinName) {
			if (typeof skinName === 'function') {
				skin = new (skinName as new () => Skin)();
			} else if (typeof skinName === 'string') {
				const clazz = (globalThis as Record<string, unknown>)[skinName] as (new () => Skin) | undefined;
				if (clazz) skin = new clazz();
			} else {
				skin = skinName as Skin;
			}
		}
		this._setSkin(skin);
	}

	// ── skin ──────────────────────────────────────────────────────────────

	get skin(): Skin | undefined {
		return this._skin;
	}

	protected setSkin(skin: Skin | undefined): void {
		this._setSkin(skin);
	}

	private _setSkin(skin: Skin | undefined): void {
		const oldSkin = this._skin;
		if (oldSkin) {
			for (const partName of oldSkin.skinParts) {
				if ((this as Record<string, unknown>)[partName]) this.setSkinPart(partName, undefined);
			}
			for (const child of oldSkin._elementsContent) {
				if (child.parent === this) this.removeChild(child);
			}
			oldSkin.hostComponent = undefined;
		}
		this._skin = skin;
		if (skin) {
			for (const partName of skin.skinParts) {
				const instance = skin.getPart(partName);
				if (instance) this.setSkinPart(partName, instance);
			}
			for (let i = skin._elementsContent.length - 1; i >= 0; i--) {
				this.addChildAt(skin._elementsContent[i], 0);
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

	// ── Touch interception ────────────────────────────────────────────────

	override set touchEnabled(value: boolean) {
		this._explicitTouchEnabled = value;
		if (this._enabled) super.touchEnabled = value;
	}

	override set touchChildren(value: boolean) {
		this._explicitTouchChildren = value;
		if (this._enabled) super.touchChildren = value;
	}

	// ── enabled ───────────────────────────────────────────────────────────

	get enabled(): boolean {
		return this._enabled;
	}
	set enabled(value: boolean) {
		value = !!value;
		if (this._enabled === value) return;
		this._enabled = value;
		if (value) {
			this.touchEnabled = this._explicitTouchEnabled;
			this.touchChildren = this._explicitTouchChildren;
		} else {
			this.touchEnabled = false;
			this.touchChildren = false;
		}
		this.invalidateState();
	}

	// ── View state ────────────────────────────────────────────────────────

	/**
	 * The current view state. Setting this explicitly overrides `getCurrentState()`.
	 * Set to `''` to revert to the computed state.
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
	 */
	protected getCurrentState(): string {
		return this._enabled ? '' : 'disabled';
	}

	// ── IUIOwner lifecycle ────────────────────────────────────────────────

	createChildren(): void {
		if (!this._skinName) {
			const theme = getTheme();
			if (theme) {
				const skinName = theme.getSkinName(this);
				if (skinName) this._applySkinName(skinName);
			}
		}
	}

	childrenCreated(): void {}

	commitProperties(): void {
		this.ui.onCommitProperties();
		if (this._stateIsDirty) {
			this._stateIsDirty = false;
			if (this._skin) this._skin.currentState = this.currentState;
		}
	}

	measure(): void {
		_basicLayout.target = this;
		_basicLayout.measure();
		_basicLayout.target = undefined;

		const skin = this._skin;
		if (!skin) return;

		const bounds = new Rectangle();
		this.getPreferredBounds(bounds);
		let mw = bounds.width;
		let mh = bounds.height;

		if (!isNaN(skin.width)) {
			mw = skin.width;
		} else {
			mw = Math.max(Math.min(mw, skin.maxWidth), skin.minWidth);
		}
		if (!isNaN(skin.height)) {
			mh = skin.height;
		} else {
			mh = Math.max(Math.min(mh, skin.maxHeight), skin.minHeight);
		}
		this.setMeasuredSize(mw, mh);
	}

	updateDisplayList(w: number, h: number): void {
		_basicLayout.target = this;
		_basicLayout.updateDisplayList(w, h);
		_basicLayout.target = undefined;
	}

	// ── ILayoutTarget ─────────────────────────────────────────────────────

	get numElements(): number {
		return this.numChildren;
	}

	get contentWidth(): number {
		return this.width;
	}

	get contentHeight(): number {
		return this.height;
	}

	get scrollH(): number {
		return 0;
	}
	set scrollH(_v: number) {
		/* no-op for Component */
	}

	get scrollV(): number {
		return 0;
	}
	set scrollV(_v: number) {
		/* no-op for Component */
	}

	getElementAt(index: number): DisplayObject | undefined {
		return this.getChildAt(index);
	}

	getVirtualElementAt(index: number): DisplayObject | undefined {
		return this.getChildAt(index);
	}

	setVirtualElementIndicesInView(_startIndex: number, _endIndex: number): void {
		/* no-op for Component */
	}

	setContentSize(_w: number, _h: number): void {}

	override childAdded(_child: unknown, _index: number): void {
		this.invalidateSize();
		this.invalidateDisplayList();
	}

	override childRemoved(_child: unknown, _index: number): void {
		this.invalidateSize();
		this.invalidateDisplayList();
	}

	// ── IUIComponent — delegated to UIState ───────────────────────────────

	get includeInLayout(): boolean {
		return this.ui.includeInLayout;
	}
	set includeInLayout(v: boolean) {
		this.ui.includeInLayout = v;
	}

	get left(): number | string {
		return this.ui.left;
	}
	set left(v: number | string) {
		this.ui.left = v;
	}

	get right(): number | string {
		return this.ui.right;
	}
	set right(v: number | string) {
		this.ui.right = v;
	}

	get top(): number | string {
		return this.ui.top;
	}
	set top(v: number | string) {
		this.ui.top = v;
	}

	get bottom(): number | string {
		return this.ui.bottom;
	}
	set bottom(v: number | string) {
		this.ui.bottom = v;
	}

	get horizontalCenter(): number | string {
		return this.ui.horizontalCenter;
	}
	set horizontalCenter(v: number | string) {
		this.ui.horizontalCenter = v;
	}

	get verticalCenter(): number | string {
		return this.ui.verticalCenter;
	}
	set verticalCenter(v: number | string) {
		this.ui.verticalCenter = v;
	}

	get percentWidth(): number {
		return this.ui.percentWidth;
	}
	set percentWidth(v: number) {
		this.ui.percentWidth = v;
	}

	get percentHeight(): number {
		return this.ui.percentHeight;
	}
	set percentHeight(v: number) {
		this.ui.percentHeight = v;
	}

	override get width(): number {
		return this.ui.getWidth();
	}
	override set width(v: number) {
		this.ui.setWidth(v);
	}

	override get height(): number {
		return this.ui.getHeight();
	}
	override set height(v: number) {
		this.ui.setHeight(v);
	}

	get minWidth(): number {
		return this.ui.minWidth;
	}
	set minWidth(v: number) {
		this.ui.minWidth = v;
	}

	get maxWidth(): number {
		return this.ui.maxWidth;
	}
	set maxWidth(v: number) {
		this.ui.maxWidth = v;
	}

	get minHeight(): number {
		return this.ui.minHeight;
	}
	set minHeight(v: number) {
		this.ui.minHeight = v;
	}

	get maxHeight(): number {
		return this.ui.maxHeight;
	}
	set maxHeight(v: number) {
		this.ui.maxHeight = v;
	}

	setMeasuredSize(w: number, h: number): void {
		this.ui.setMeasuredSize(w, h);
	}
	invalidateProperties(): void {
		this.ui.invalidateProperties();
	}
	validateProperties(): void {
		this.ui.validateProperties();
	}
	invalidateSize(): void {
		this.ui.invalidateSize();
	}
	validateSize(recursive?: boolean): void {
		this.ui.validateSize(recursive);
	}
	invalidateDisplayList(): void {
		this.ui.invalidateDisplayList();
	}
	validateDisplayList(): void {
		this.ui.validateDisplayList();
	}
	validateNow(): void {
		this.ui.validateNow();
	}
	setLayoutBoundsSize(lw: number, lh: number): void {
		this.ui.setLayoutBoundsSize(lw, lh);
	}
	setLayoutBoundsPosition(x: number, y: number): void {
		this.ui.setLayoutBoundsPosition(x, y);
	}
	getLayoutBounds(bounds: Rectangle): void {
		this.ui.getLayoutBounds(bounds);
	}
	getPreferredBounds(bounds: Rectangle): void {
		this.ui.getPreferredBounds(bounds);
	}
}

const _basicLayout = new BasicLayout();

export { isUIComponent };
