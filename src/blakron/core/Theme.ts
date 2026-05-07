import { EventDispatcher, Event } from '@blakron/core';
import type { IThemeAdapter } from './IThemeAdapter.js';
import type { Component } from '../components/Component.js';

// Import all classes that skin code may reference (injected as __deps at runtime)
import { Skin } from '../components/Skin.js';
import { Group } from '../components/Group.js';
import { Rect } from '../components/Rect.js';
import { Image } from '../components/Image.js';
import { Label } from '../components/Label.js';
import { Button } from '../components/Button.js';
import { ToggleButton } from '../components/ToggleButton.js';
import { CheckBox } from '../components/CheckBox.js';
import { RadioButton } from '../components/RadioButton.js';
import { ProgressBar } from '../components/ProgressBar.js';
import { ViewStack } from '../components/ViewStack.js';
import { HScrollBar } from '../components/HScrollBar.js';
import { VScrollBar } from '../components/VScrollBar.js';
import { Scroller } from '../components/Scroller.js';
import { ItemRenderer } from '../components/ItemRenderer.js';
import { DataGroup } from '../components/DataGroup.js';
import { List } from '../components/List.js';
import { TabBar } from '../components/TabBar.js';
import { ToggleSwitch } from '../components/ToggleSwitch.js';
import { HSlider } from '../components/HSlider.js';
import { VSlider } from '../components/VSlider.js';
import { Panel } from '../components/Panel.js';
import { UILayer } from '../components/UILayer.js';
import { EditableText } from '../components/EditableText.js';
import { TextInput } from '../components/TextInput.js';
import { ComboBox } from '../components/ComboBox.js';
import { State } from '../states/State.js';
import { AddItems } from '../states/AddItems.js';
import { SetProperty } from '../states/SetProperty.js';
import { SetStateProperty } from '../states/SetStateProperty.js';
import { BasicLayout } from '../layouts/BasicLayout.js';
import { HorizontalLayout } from '../layouts/HorizontalLayout.js';
import { VerticalLayout } from '../layouts/VerticalLayout.js';
import { TileLayout } from '../layouts/TileLayout.js';
import { Binding } from '../binding/Binding.js';

/**
 * All classes available to skin gjs code at runtime.
 * This object is passed as `__deps` when evaluating skin factory functions.
 */
const SKIN_DEPS: Record<string, unknown> = {
	Skin,
	Group,
	Rect,
	Image,
	Label,
	Button,
	ToggleButton,
	CheckBox,
	RadioButton,
	ProgressBar,
	ViewStack,
	HScrollBar,
	VScrollBar,
	Scroller,
	ItemRenderer,
	DataGroup,
	List,
	TabBar,
	ToggleSwitch,
	HSlider,
	VSlider,
	Panel,
	UILayer,
	EditableText,
	TextInput,
	ComboBox,
	State,
	AddItems,
	SetProperty,
	SetStateProperty,
	BasicLayout,
	HorizontalLayout,
	VerticalLayout,
	TileLayout,
	Binding,
};

interface ThemeConfig {
	skins?: Record<string, string>;
	styles?: Record<string, unknown>;
	paths?: Record<string, unknown>;
	exmls?: Array<{ path: string; gjs?: string; className?: string; content?: string }>;
}

/**
 * Skin theme. Maps component class names to default skin class names.
 *
 * Usage:
 * ```ts
 * const theme = new Theme('resource/default.thm.js');
 * theme.addEventListener(Event.COMPLETE, () => { ... });
 * ```
 *
 * @event Event.COMPLETE  Dispatched when the theme config is loaded and all skins are registered.
 */
export class Theme extends EventDispatcher {
	// ── Instance fields ───────────────────────────────────────────────────

	private _configURL: string;
	private _initialized: boolean;
	private _skinMap: Record<string, string> = {};
	private _styles: Record<string, unknown> = {};
	private _delayList: Component[] = [];
	private _adapter?: IThemeAdapter;

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor(configURL: string, adapter?: IThemeAdapter) {
		super();
		this._configURL = configURL;
		this._initialized = !configURL;
		this._adapter = adapter;
		console.log(`[Theme] Created, configURL: ${configURL || '(none)'}`);
		if (configURL) this._load(configURL);
	}

	// ── Public methods ────────────────────────────────────────────────────

	/**
	 * Map a default skin class name for a host component class name.
	 * @param hostComponentKey  e.g. "eui.Button" or "app.MyButton"
	 * @param skinName          e.g. "skins.ButtonSkin"
	 */
	public mapSkin(hostComponentKey: string, skinName: string): void {
		if (!hostComponentKey || !skinName) return;
		this._skinMap[hostComponentKey] = skinName;
	}

	/**
	 * Look up the default skin name for a component instance.
	 * Search order: hostComponentKey → class name → parent class names up to Component.
	 */
	public getSkinName(client: Component): string {
		if (!this._initialized) {
			if (!this._delayList.includes(client)) this._delayList.push(client);
			return '';
		}
		return this._skinMap[client.hostComponentKey] ?? this._findSkinName(client);
	}

	public getStyleConfig(style: string): unknown {
		return this._styles[style];
	}

	// ── Private methods ───────────────────────────────────────────────────

	private _load(url: string): void {
		console.log(`[Theme] Loading: ${url}`);
		const adapter = this._adapter ?? _defaultThemeAdapter;
		adapter.getTheme(
			url,
			data => {
				console.log(`[Theme] Fetched OK, data length: ${typeof data === 'string' ? data.length : 'object'}`);
				this._onConfigLoaded(data);
			},
			err => {
				console.error('[Theme] Failed to load theme:', url, err);
			},
		);
	}

	private _onConfigLoaded(raw: unknown): void {
		let data: ThemeConfig;
		if (typeof raw === 'string') {
			try {
				data = JSON.parse(raw);
			} catch {
				console.error('[Theme] Invalid JSON in theme config');
				return;
			}
		} else {
			data = raw as ThemeConfig;
		}

		if (data.skins) {
			const keys = Object.keys(data.skins);
			console.log(`[Theme] Loaded ${keys.length} skin mapping(s)`);
			for (const [key, val] of Object.entries(data.skins)) {
				if (!this._skinMap[key]) this.mapSkin(key, val);
			}
		}

		if (data.styles) this._styles = data.styles;

		// Load skin code from exmls entries (gjs policy)
		if (data.exmls && data.exmls.length > 0) {
			const first = data.exmls[0] as Record<string, unknown>;
			if (first['gjs']) {
				let loaded = 0;
				let failed = 0;
				for (const exml of data.exmls) {
					const item = exml as Record<string, unknown>;
					const gjs = item['gjs'] as string;
					const className = item['className'] as string;
					const funcName = className.split('.').pop()!;
					try {
						// gjs code expects a `__deps` variable with all UI classes.
						// It defines a factory function (e.g. createButtonSkin) and we
						// append a return statement to retrieve it.
						const fn = new Function('__deps', gjs + `\nreturn create${funcName};`);
						const factory = fn(SKIN_DEPS);
						if (typeof factory === 'function') {
							(globalThis as Record<string, unknown>)[className] = factory;
							loaded++;
						} else {
							console.warn(`[Theme] Skin factory not a function: ${className}`);
							failed++;
						}
					} catch (e) {
						console.error(`[Theme] Failed to load skin: ${className}`, e);
						failed++;
					}
				}
				console.log(`[Theme] Registered ${loaded} skin(s)${failed > 0 ? `, ${failed} failed` : ''}`);
			}
		}

		this._onLoaded();
	}

	private _onLoaded(): void {
		this._initialized = true;
		console.log(`[Theme] Initialized, ${this._delayList.length} component(s) waiting for skin`);
		this._handleDelayList();
		this.dispatchEventWith(Event.COMPLETE);
	}

	private _handleDelayList(): void {
		const list = this._delayList;
		for (const client of list) {
			if (!client.skinNameExplicitlySet) {
				const skinName = this.getSkinName(client);
				if (skinName) {
					client._applySkinName(skinName);
				}
			}
		}
		list.length = 0;
	}

	private _findSkinName(proto: unknown): string {
		if (!proto || proto === Object.prototype) return '';
		const ctor = (proto as { constructor?: { name?: string } }).constructor;
		const key = ctor?.name;
		if (!key || key === 'Component') return '';
		const name = this._skinMap[key];
		if (name) return name;
		return this._findSkinName(Object.getPrototypeOf(proto));
	}
}

// ── Default theme adapter (fetch via XHR) ─────────────────────────────────────

const _defaultThemeAdapter: IThemeAdapter = {
	getTheme(url, onSuccess, onError) {
		const xhr = new XMLHttpRequest();
		xhr.open('GET', url);
		xhr.responseType = 'text';
		xhr.onload = () => onSuccess(xhr.responseText);
		xhr.onerror = () => onError(new Error(`Failed to load: ${url}`));
		xhr.send();
	},
};

// ── Global theme registry ─────────────────────────────────────────────────────

let _currentTheme: Theme | undefined;

/**
 * Register the active theme. Called automatically by Theme constructor when a stage is provided.
 */
export function setTheme(theme: Theme): void {
	_currentTheme = theme;
}

/**
 * Get the currently active theme, if any.
 */
export function getTheme(): Theme | undefined {
	return _currentTheme;
}
