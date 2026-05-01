import type { IOverride } from './IOverride.js';
import type { Component } from '../components/Component.js';
import type { Skin } from '../components/Skin.js';

/**
 * Sets a property on a skin object when a state becomes active,
 * and restores the previous value when the state is deactivated.
 */
export class SetProperty implements IOverride {
	/**
	 * The id of the target object in the skin (empty string = the skin itself).
	 */
	target: string;
	/**
	 * The property name to set.
	 */
	name: string;
	/**
	 * The value to set when the state is active.
	 */
	value: unknown;

	private _oldValue: unknown = undefined;
	private _applied = false;

	constructor(target: string, name: string, value: unknown) {
		this.target = target;
		this.name = name;
		this.value = value;
	}

	apply(_host: Component, skin: Skin): void {
		const obj = this._resolve(skin);
		if (!obj) return;
		const rec = obj as Record<string, unknown>;
		this._oldValue = rec[this.name];
		rec[this.name] = this.value;
		this._applied = true;
	}

	remove(_host: Component, skin: Skin): void {
		if (!this._applied) return;
		const obj = this._resolve(skin);
		if (!obj) return;
		(obj as Record<string, unknown>)[this.name] = this._oldValue;
		this._applied = false;
	}

	private _resolve(skin: Skin): unknown {
		if (!this.target) return skin;
		return (skin as unknown as Record<string, unknown>)[this.target];
	}
}
