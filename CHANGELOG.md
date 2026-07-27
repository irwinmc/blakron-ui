# Changelog

All notable changes to `@blakron/ui` are documented here.

---

## [1.0.0] — 2026-07-28

First stable release. From this version forward the public API surface (exports from `src/index.ts`) is committed to backward-compatible evolution per semver.

### Fixed

- **ListBase / List / TabBar**: Restored the `Event.CHANGE` dispatch contract that was missing from the Blakron port. Egret's `ListBase.commitSelection` dispatches `Event.CHANGE` when selection changes due to **user interaction** (tapping an item), but **not** when changed programmatically (`selectedIndex = x`). Blakron had dropped this entire mechanism — `ListBase` had no `dispatchChangeAfterSelection` flag, `commitSelection` never dispatched `Event.CHANGE`, and the `List`/`TabBar` tap handlers set `selectedIndex` via the plain setter. This silently broke any consumer listening for `Event.CHANGE` on a List, including `ComboBox`'s drop-down selection. Added `setSelectedIndex(value, dispatchChangeEvent)` and a `_dispatchChangeAfterSelection` flag mirroring egret; `List`/`TabBar` tap handlers now call `setSelectedIndex(idx, true)`.
- **ListBase**: `commitSelection` now deselects the previous item (`itemSelected(oldIndex, false)`) before selecting the new one. Previously only the new item's renderer was marked `selected = true`, so switching selection left the old renderer visually highlighted. Egret's `commitSelection` (L586-589) always did both.
- **ListBase**: `commitSelection` now also dispatches a `PropertyEvent` for `selectedItem` (in addition to `selectedIndex`). Egret dispatches both (L597-598); binding/watcher consumers keyed on `selectedItem` were not being notified.
- **ComboBox**: Tapping the component now toggles the drop-down. `_onTriggerTap` was previously bound only when the skin declared a `button` skin part, but the standard `ComboBoxSkin` has no `button` — the whole component is the trigger. The constructor now registers a component-level `TOUCH_TAP` listener that toggles `isOpen`, while ignoring taps that land inside the open `dropDown` (so selecting a list item does not re-close it).
- **ComboBox**: `selectedItem` setter now routes through `selectedIndex` (via `dataProvider.getItemIndex`) so it dispatches `Event.CHANGE` and keeps `_selectedIndex`/`_selectedItem` consistent. Previously it set `_selectedItem` directly without dispatching CHANGE and could leave `_selectedIndex = -1` alongside a set `_selectedItem`.

### Added

- **EventMap type-safety across all UI components**: `Component`, `Group`, and `Skin` now declare typed event maps so `addEventListener` infers the concrete event subclass instead of falling back to `Event`. This mirrors the pattern core established in 1.0.2 (`DisplayObjectEvents`). New exported interfaces: `ComponentEvents` (extends `DisplayObjectEvents`, adds `PropertyEvent` + `UIEvent` types), `GroupEvents` (adds `CollectionEvent` + `ItemTapEvent`), `SkinEvents`. Listeners like `list.addEventListener(PropertyEvent.PROPERTY_CHANGE, e => e.property)` are now fully typed with no `as` cast.

### Tests

- Added `test/ListBase.test.ts` (5 cases) covering user-vs-programmatic CHANGE dispatch, PropertyEvent for both `selectedIndex`/`selectedItem`, previous-item deselection, and selectedIndex clamping.
- Added `test/ComboBox.test.ts` (8 cases) covering trigger-tap toggling, open/close + dropDown visibility, selection via `selectedIndex`/`selectedItem`, `itemToLabel` (labelField/labelFunction/primitives), and the not-in-provider clearing path.
- Added `test/EventMapOverride.test.ts` (4 cases) pinning the runtime contract of the `addEventListener`/`removeEventListener` overrides on `Component` and `Group` (register, fire, remove, no-op removal).
- Added `test/Binding.test.ts` (7 cases) covering `bindProperty` (initial write, change sync, multi-hop chain), `bindHandler` (immediate + subsequent), and `bindProperties` (single-chain + multi-part template concatenation).
- Added `test/Range.test.ts` (7 cases) covering value clamping (incl. max<=min) and `nearestValidValue` snap math (integer interval, interval=0, non-zero minimum, fractional interval).
- Added `test/Skin.test.ts` (10 cases) covering `hasState`, `getPart`, `elementsContent`, `currentState` transitions (override apply/remove, same-state no-op, empty-states no-op), and `hostComponent` PropertyEvent dispatch.
- Total test count: 35 → 76.

### Build

- **package.json**: Bumped to `1.0.0`. Added `author`, `repository`, refined `description`/`keywords`. Aligned `exports` with core/game (dropped the `require` entry — ESM-only). Changed `prepublishOnly` to `npm run clean && npm run build` so `npm publish` always ships a freshly built `dist/`.

### Notes

- This release consolidates the stabilization work shipped across 0.1.0–0.4.8. The 1.0.0 line commits the full egret-EUI-compatible component set (31 standard components + the `ComboBox` extension) plus the skin/layout/binding/state/collection infrastructure to backward-compatible evolution.
- `BitmapLabel` (egret's `eui.BitmapLabel`, a UI-wrapper around `egret.BitmapText`) is **not** ported in this release. It will be considered for a future minor version if there is demand.
