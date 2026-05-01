import { EventDispatcher, Event } from '@blakron/core';
import type { IThemeAdapter } from './IThemeAdapter.js';
import type { Component } from '../components/Component.js';

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
	private _configURL: string;
	private _initialized: boolean;
	private _skinMap: Record<string, string> = {};
	private _styles: Record<string, unknown> = {};
	private _delayList: Component[] = [];
	private _adapter: IThemeAdapter | null;

	constructor(configURL: string, adapter?: IThemeAdapter) {
		super();
		this._configURL = configURL;
		this._initialized = !configURL;
		this._adapter = adapter ?? null;
		if (configURL) this._load(configURL);
	}

	// ── Loading ───────────────────────────────────────────────────────────

	private _load(url: string): void {
		const adapter = this._adapter ?? defaultThemeAdapter;
		adapter.getTheme(
			url,
			data => this._onConfigLoaded(data),
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

		// Register skin mappings
		if (data.skins) {
			for (const [key, val] of Object.entries(data.skins)) {
				if (!this._skinMap[key]) this.mapSkin(key, val);
			}
		}

		if (data.styles) this._styles = data.styles;

		// gjs policy: skins are already registered via generateEUI at script load time.
		// path/content policies: not handled at runtime (compile-time only).

		this._onLoaded();
	}

	private _onLoaded(): void {
		this._initialized = true;
		this._handleDelayList();
		this.dispatchEventWith(Event.COMPLETE);
	}

	private _handleDelayList(): void {
		const list = this._delayList;
		for (const client of list) {
			if (!client.skinNameExplicitlySet) {
				const skinName = this.getSkinName(client);
				if (skinName) {
					client.$applySkinName(skinName);
				}
			}
		}
		list.length = 0;
	}

	// ── Public API ────────────────────────────────────────────────────────

	/**
	 * Map a default skin class name for a host component class name.
	 * @param hostComponentKey  e.g. "eui.Button" or "app.MyButton"
	 * @param skinName          e.g. "skins.ButtonSkin"
	 */
	mapSkin(hostComponentKey: string, skinName: string): void {
		if (!hostComponentKey || !skinName) return;
		this._skinMap[hostComponentKey] = skinName;
	}

	/**
	 * Look up the default skin name for a component instance.
	 * Search order: hostComponentKey → class name → parent class names up to Component.
	 */
	getSkinName(client: Component): string {
		if (!this._initialized) {
			if (!this._delayList.includes(client)) this._delayList.push(client);
			return '';
		}
		return this._skinMap[client.hostComponentKey] ?? this._findSkinName(client);
	}

	private _findSkinName(proto: unknown): string {
		if (!proto) return '';
		const key = (proto as Record<string, unknown>)['__class__'] as string | undefined;
		if (!key) return '';
		const name = this._skinMap[key];
		if (name || key === 'eui.Component') return name ?? '';
		return this._findSkinName(Object.getPrototypeOf(proto));
	}

	getStyleConfig(style: string): unknown {
		return this._styles[style];
	}
}

// ── Default theme adapter (fetch via XHR) ─────────────────────────────────────

const defaultThemeAdapter: IThemeAdapter = {
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

let _currentTheme: Theme | null = null;

/**
 * Register the active theme. Called automatically by Theme constructor when a stage is provided.
 */
export function setTheme(theme: Theme): void {
	_currentTheme = theme;
}

/**
 * Get the currently active theme, if any.
 */
export function getTheme(): Theme | null {
	return _currentTheme;
}
