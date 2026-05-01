import { DisplayObject, DisplayObjectContainer } from '@blakron/core';
import type { IOverride } from './IOverride.js';
import type { Component } from '../components/Component.js';
import type { Skin } from '../components/Skin.js';

/**
 * Adds a display object to a container when a state becomes active,
 * and removes it when the state is deactivated.
 */
export class AddItems implements IOverride {
	/**
	 * The id of the item in the skin to add.
	 */
	target: string;
	/**
	 * The id of the container in the skin to add the item to.
	 */
	destination: string;
	/**
	 * The index at which to insert the item. -1 means append.
	 */
	position: number;
	/**
	 * The property name on the destination that holds the child list.
	 */
	propertyName: string;

	constructor(target: string, destination: string, position = -1, propertyName = '') {
		this.target = target;
		this.destination = destination;
		this.position = position;
		this.propertyName = propertyName;
	}

	apply(_host: Component, skin: Skin): void {
		const item = skin.getPart(this.target);
		const dest = skin.getPart(this.destination);
		if (!(item instanceof DisplayObject) || !(dest instanceof DisplayObjectContainer)) return;

		if (this.position >= 0) {
			dest.addChildAt(item, this.position);
		} else {
			dest.addChild(item);
		}
	}

	remove(_host: Component, skin: Skin): void {
		const item = skin.getPart(this.target);
		const dest = skin.getPart(this.destination);
		if (!(item instanceof DisplayObject) || !(dest instanceof DisplayObjectContainer)) return;
		if (item.parent === dest) {
			dest.removeChild(item);
		}
	}
}
