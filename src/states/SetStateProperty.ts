import type { IOverride } from './IOverride.js';
import type { Component } from '../components/Component.js';
import type { Skin } from '../components/Skin.js';

/**
 * Sets a property on the host component (not the skin) when a state becomes active.
 * Restores the previous value when the state is deactivated.
 */
export class SetStateProperty implements IOverride {
	/**
	 * The property name on the host component to set.
	 */
	name: string;
	/**
	 * The value to set when the state is active.
	 */
	value: unknown;

	private _oldValue: unknown = undefined;
	private _applied = false;

	constructor(name: string, value: unknown) {
		this.name = name;
		this.value = value;
	}

	apply(host: Component, _skin: Skin): void {
		const rec = host as unknown as Record<string, unknown>;
		this._oldValue = rec[this.name];
		rec[this.name] = this.value;
		this._applied = true;
	}

	remove(host: Component, _skin: Skin): void {
		if (!this._applied) return;
		(host as unknown as Record<string, unknown>)[this.name] = this._oldValue;
		this._applied = false;
	}
}
