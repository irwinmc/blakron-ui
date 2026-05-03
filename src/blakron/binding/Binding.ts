import { Watcher } from './Watcher.js';
import type { IEventDispatcher } from '@blakron/core';
import type { Skin } from '../components/Skin.js';

/**
 * Binding — static utility class for data binding.
 *
 * - `bindProperty(host, chain, target, prop)` — binds `host.chain` → `target.prop`
 * - `bindHandler(host, chain, handler, thisObject)` — calls `handler(value)` on change
 * - `bindProperties(host, templates, chainIndex, target, prop)` — template-string binding
 */
export class Binding {
	/**
	 * Binds a property chain on `host` to a target property.
	 *
	 * ```ts
	 * Binding.bindProperty(user, ['name'], label, 'text');
	 * // label.text === user.name; auto-updates when user dispatches PropertyChange
	 * ```
	 */
	static bindProperty(host: unknown, chain: string[], target: unknown, prop: string): Watcher | null {
		const watcher = Watcher.watch(host as IEventDispatcher | null, chain, null, null);
		if (watcher) {
			const assign = (value: unknown): void => {
				(target as Record<string, unknown>)[prop] = value;
			};
			watcher.setHandler(assign, null);
			assign(watcher.getValue());

			// Auto-register on Skin for cleanup
			if (host && typeof host === 'object' && '$watchers' in host) {
				const skin = host as unknown as Skin & { $watchers: Watcher[] };
				if (!skin.$watchers) skin.$watchers = [];
				skin.$watchers.push(watcher);
			}
		}
		return watcher;
	}

	/**
	 * Binds a property chain on `host` to a handler function.
	 *
	 * ```ts
	 * Binding.bindHandler(user, ['name'], (v) => console.log(v), null);
	 * ```
	 */
	static bindHandler(
		host: unknown,
		chain: string[],
		handler: (value: unknown) => void,
		thisObject: unknown,
	): Watcher | null {
		const watcher = Watcher.watch(host as IEventDispatcher | null, chain, handler, thisObject);
		if (watcher) {
			handler.call(thisObject, watcher.getValue());
		}
		return watcher;
	}

	/**
	 * Template-string binding used by EXML compiler.
	 *
	 * `templates` is a mixed array of literal strings and `Watcher` instances.
	 * `chainIndex` marks which entries are dynamic (property chains).
	 *
	 * The result is the string concatenation of all template values, written
	 * to `target[prop]`.
	 */
	static bindProperties(
		host: unknown,
		templates: unknown[],
		chainIndex: number[],
		target: unknown,
		prop: string,
	): Watcher | null {
		// Simple single-chain fast path
		if (templates.length === 1 && chainIndex.length === 1) {
			return Binding.bindProperty(host, (templates[0] as string).split('.'), target, prop);
		}

		const assign = (): void => {
			(target as Record<string, unknown>)[prop] = joinValues(templates);
		};

		let lastWatcher: Watcher | null = null;
		for (const index of chainIndex) {
			const element = templates[index];
			let watcher: Watcher | null = null;

			if (typeof element === 'string') {
				watcher = Watcher.watch(host as IEventDispatcher | null, element.split('.'), null, null);
			} else if (element instanceof Watcher) {
				watcher = element;
				watcher.reset(host as IEventDispatcher | null);
			}

			if (watcher) {
				templates[index] = watcher;
				watcher.setHandler(assign, null);

				if (host && typeof host === 'object' && '$watchers' in host) {
					const skin = host as unknown as Skin & { $watchers: Watcher[] };
					if (!skin.$watchers) skin.$watchers = [];
					skin.$watchers.push(watcher);
				}

				lastWatcher = watcher;
			}
		}

		assign();
		return lastWatcher;
	}
}

// ── Helpers ─────────────────────────────────────────────────────────

function joinValues(templates: unknown[]): string {
	let value: string = '';
	for (const item of templates) {
		value += item instanceof Watcher ? String(item.getValue() ?? '') : String(item);
	}
	return value;
}
