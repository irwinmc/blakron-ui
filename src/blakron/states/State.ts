import type { IOverride } from './IOverride.js';

/**
 * Defines a view state for a skin.
 *
 * A state has a name (e.g. "up", "down", "disabled") and a list
 * of overrides that are applied when the state becomes active and
 * removed when it becomes inactive.
 */
export class State {
	/**
	 * The name of this state.
	 */
	name: string;

	/**
	 * The list of overrides to apply when this state is active.
	 */
	overrides: IOverride[];

	constructor(name: string, overrides: IOverride[] = []) {
		this.name = name;
		this.overrides = overrides;
	}
}
