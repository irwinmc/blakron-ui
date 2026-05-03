import { type IEventDispatcher, Event } from '@blakron/core';
import { PropertyEvent } from '../events/PropertyEvent.js';

/**
 * Watcher monitors a property (or property chain) on a host object.
 * When the property changes (via {@link PropertyEvent}), the registered
 * handler is invoked with the new value.
 *
 * Create instances via the static {@link watch} method — do not use the
 * constructor directly.
 */
export class Watcher {
	// ── Static factory ──────────────────────────────────────────────────

	/**
	 * Creates and starts a Watcher for a property chain.
	 *
	 * ```ts
	 * // watches host.a.b.c
	 * Watcher.watch(host, ['a', 'b', 'c'], (value) => { ... }, this);
	 * ```
	 *
	 * @param host   Root object hosting the chain.  Must dispatch
	 *               `PropertyEvent.PROPERTY_CHANGE` when its bindable
	 *               properties change (i.e. implement `IEventDispatcher`).
	 * @param chain  Property names forming the chain, e.g. `['a','b','c']`.
	 * @param handler Called with the new leaf value whenever the chain changes.
	 * @param thisObject  `this` context for the handler.
	 * @returns The head Watcher, or `null` if `chain` is empty.
	 */
	static watch(
		host: IEventDispatcher | null,
		chain: string[],
		handler: ((value: unknown) => void) | null,
		thisObject: unknown,
	): Watcher | null {
		if (chain.length === 0) return null;
		const property = chain[0];
		const remaining = chain.slice(1);
		const next = remaining.length > 0 ? Watcher.watch(null, remaining, handler, thisObject) : null;
		const watcher = new Watcher(property, handler, thisObject, next);
		watcher.reset(host);
		return watcher;
	}

	// ── Instance fields ─────────────────────────────────────────────────

	private host: IEventDispatcher | null = null;
	private readonly property: string;
	private handler: ((value: unknown) => void) | null;
	private thisObject: unknown;
	private readonly next: Watcher | null;
	private isExecuting = false;

	// ── Constructor (use watch() instead) ───────────────────────────────

	constructor(
		property: string,
		handler: ((value: unknown) => void) | null,
		thisObject: unknown,
		next: Watcher | null,
	) {
		this.property = property;
		this.handler = handler;
		this.thisObject = thisObject;
		this.next = next;
	}

	// ── getValue ────────────────────────────────────────────────────────

	/** Returns the current value of the watched chain (or `undefined`). */
	getValue(): unknown {
		if (this.next) return this.next.getValue();
		return this.getHostPropertyValue();
	}

	// ── setHandler ──────────────────────────────────────────────────────

	/** Replaces the handler function propagated through the chain. */
	setHandler(handler: (value: unknown) => void, thisObject: unknown): void {
		this.handler = handler;
		this.thisObject = thisObject;
		if (this.next) this.next.setHandler(handler, thisObject);
	}

	// ── reset ───────────────────────────────────────────────────────────

	/**
	 * Re-points this watcher at a new host.
	 * Pass `null` to detach from the current host.
	 */
	reset(newHost: IEventDispatcher | null): void {
		// Detach from old host
		if (this.host) {
			this.host.removeEventListener(PropertyEvent.PROPERTY_CHANGE, this._onPropertyChange);
		}

		this.host = newHost;

		// Attach to new host
		if (newHost) {
			newHost.addEventListener(PropertyEvent.PROPERTY_CHANGE, this._onPropertyChange);
		}

		// Cascade: the next watcher observes the value of *this* property
		if (this.next) {
			this.next.reset(this.getHostPropertyValue() as IEventDispatcher | null);
		}
	}

	// ── unwatch ─────────────────────────────────────────────────────────

	/** Detaches this watcher and nullifies its handler. */
	unwatch(): void {
		this.reset(null);
		this.handler = null;
		if (this.next) this.next.handler = null;
	}

	// ── Privates ────────────────────────────────────────────────────────

	private getHostPropertyValue(): unknown {
		return this.host ? (this.host as unknown as Record<string, unknown>)[this.property] : undefined;
	}

	private _onPropertyChange = (e: Event): void => {
		const pe = e as PropertyEvent;
		if (pe.property !== this.property || this.isExecuting) return;
		try {
			this.isExecuting = true;
			if (this.next) {
				this.next.reset(this.getHostPropertyValue() as IEventDispatcher | null);
			}
			if (this.handler) {
				this.handler.call(this.thisObject, this.getValue());
			}
		} finally {
			this.isExecuting = false;
		}
	};
}
