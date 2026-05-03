import { Group } from './Group.js';

/**
 * UILayer — a top-level UI container typically used as the root layer.
 *
 * Unlike a regular Group, UILayer disables scroll clipping by default
 * and acts as a z-order layer for UI elements (e.g. popup layer, tooltip layer).
 *
 * @defaultProperty elementsContent
 */
export class UILayer extends Group {
	// UILayer is intentionally minimal — it's a semantic marker
	// for the layout system and EXML tooling. Subclasses or
	// EXML skins add specific behavior (e.g. modal overlay, auto-sizing).
}
