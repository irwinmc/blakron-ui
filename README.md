# @blakron/ui

UI component framework for the Blakron game engine. Migrated from Egret EUI, rewritten in modern TypeScript with clean class inheritance — no namespace hacks, no prototype manipulation.

## Installation

```bash
pnpm add @blakron/ui
```

Requires `@blakron/core` as a peer dependency.

## Quick Start

```ts
import { Group, Component, BasicLayout, Theme, setTheme } from '@blakron/ui';

// Load theme (maps component class names to skin class names)
const theme = new Theme('resource/default.thm.js');
setTheme(theme);

// Create a container with absolute layout
const group = new Group();
group.layout = new BasicLayout();
group.width = 400;
group.height = 300;

// Add a skinnable component
const btn = new MyButton();
btn.left = 20;
btn.top = 20;
group.addChild(btn);
```

## Architecture

Every UI component holds a `UIState` instance that manages the layout lifecycle. `Group` and `Component` delegate all layout calls to it — no mixin, no prototype copying.

```
Group / Component
  └── ui: UIState        ← layout state + invalidation logic
        └── owner: IUIOwner  ← back-reference to the DisplayObject
```

### Layout cycle

Property changes are batched and applied on the next animation frame:

```
invalidateProperties / invalidateSize / invalidateDisplayList
  → Validator queues the component
  → requestAnimationFrame tick
  → validateProperties  (shallow → deep,  commitProperties)
  → validateSize        (deep → shallow,  measure)
  → validateDisplayList (shallow → deep,  updateDisplayList)
```

### Skin system

```ts
// EXML compiler generates skin classes like this:
class MyButtonSkin extends Skin {
	skinParts = ['labelDisplay', 'iconDisplay'];
	// ...children set up in constructor
}

// Component picks up the skin via Theme or explicit assignment
btn.skinName = MyButtonSkin;
// or
btn.skinName = 'MyButtonSkin'; // resolved from globalThis
```

## Key Classes

| Class         | Description                                                             |
| ------------- | ----------------------------------------------------------------------- |
| `Group`       | Base container. Holds a `LayoutBase` for child positioning.             |
| `Component`   | Base for skinnable components. Manages skin lifecycle and view states.  |
| `Skin`        | Base for all skins. Holds visual children and exposes named skin parts. |
| `UIState`     | Layout state engine. Shared logic for all UI components.                |
| `Theme`       | Maps component class names to default skin class names.                 |
| `BasicLayout` | Absolute (constraint-based) layout.                                     |
| `Validator`   | Deferred invalidation/validation scheduler.                             |

## Layouts

| Layout             | Description                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `BasicLayout`      | Positions children using `left`/`right`/`top`/`bottom`/`horizontalCenter`/`verticalCenter` and `percentWidth`/`percentHeight`. |
| `VerticalLayout`   | Linear vertical arrangement with gap, padding, alignment, percent sizes, and virtual layout support.                           |
| `HorizontalLayout` | Linear horizontal arrangement with gap, padding, alignment, percent sizes, and virtual layout support.                         |
| `TileLayout`       | Grid arrangement with configurable orientation, column/row counts, justification, and virtual layout support.                  |

## Constraint Properties

All UI components support these layout constraint properties:

```ts
component.left = 20; // pixels from parent left edge
component.right = 20; // pixels from parent right edge
component.top = 10; // pixels from parent top edge
component.bottom = 10; // pixels from parent bottom edge
component.horizontalCenter = 0; // offset from horizontal center
component.verticalCenter = 0; // offset from vertical center
component.percentWidth = 50; // 50% of parent width
component.percentHeight = 100; // 100% of parent height
```

## View States

Components expose a `currentState` property. Skins define `states` that apply overrides when the state changes:

```ts
import { State, SetProperty } from '@blakron/ui';

class MyButtonSkin extends Skin {
	states = [
		new State('up', []),
		new State('down', [new SetProperty('bg', 'alpha', 0.8)]),
		new State('disabled', [new SetProperty('bg', 'alpha', 0.4)]),
	];
}
```

## Differences from Egret EUI

|                | Egret EUI                   | @blakron/ui                        |
| -------------- | --------------------------- | ---------------------------------- |
| Namespace      | `eui.*` global              | ES Module named exports            |
| Component base | `namespace` + `mixin`       | Standard class inheritance         |
| Layout state   | Prototype-injected          | `UIState` delegation               |
| EXML runtime   | Built-in parser             | Compile-time only (`@blakron/cli`) |
| `thisObject`   | Required in event listeners | Not needed — use arrow functions   |
| i18n           | Built-in                    | Not supported                      |
