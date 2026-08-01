# Changelog

All notable changes to `@blakron/ui` are documented here.

---

## [1.0.2] — 2026-08-01

### Fixed

- **ProgressBar**: The thumb is now clipped via `scrollRect` instead of having its width overwritten, matching egret's `eui.ProgressBar.updateSkinDisplayList`. The port had implemented progress by directly setting `thumb.width = unscaledWidth * ratio`, which tied the thumb's size to the host's external width (ignoring the skin-defined width) and, as a side effect, repeatedly invalidated the layout during value changes — destabilising percent-width children (e.g. the `labelDisplay` Label) and causing their text to disappear once the value stopped changing. The thumb's size is now driven entirely by the skin/layout; `updateDisplayList` reads `thumb.width`/`thumb.height` and uses `scrollRect` to reveal only the progress portion. Handles all four directions (LTR/RTL/TTB/BTT).
- **Label**: `measure()` no longer leaks the temporary measurement width into the text field. Like egret's `Label.measure`, it now saves the text field's `$explicitWidth`, constrains it temporarily to measure wrapped dimensions, then restores the original value. Previously the field's `$explicitWidth` was left at the measurement value (`100000` when the label had no explicit width), which could corrupt line-wrapping for labels that rely on content-sized width (common in item renderers).
- **RadioButton / RadioButtonGroup**: Four high-severity deviations fixed. (1) RadioButton now defaults to `groupName = "radioGroup"` so that orphan radios still get mutual exclusion. (2) RadioButtonGroup now extends `EventDispatcher` and dispatches `Event.CHANGE` on interactive selection (via `buttonReleased`); programmatic `selected = true` syncs the group without dispatching CHANGE. (3) Group-level `enabled` is now supported — toggling it invalidates every member's state. (4) `selectedValue` getter falls back to the radio's `label` when `value` is empty, and the setter matches by either `value` or `label`. Additionally, `$setSelection` is now the single source of truth for selection changes (with a `fireChange` parameter), `selected = false` on the current selection clears the group's selection, and `$setSelected` bypasses the setter to avoid recursion (replacing the previous `_settingSelection` re-entry guard flag).
- **SliderBase / HSlider / VSlider**: Four high-severity deviations fixed. (1) `Event.CHANGE` is now dispatched on interaction (thumb drag with `liveDragging`, track tap, and release when `liveDragging` is false). (2) `UIEvent.CHANGE_START` and `CHANGE_END` bracket the drag lifecycle. (3) Default `maximum` is now 10 (was 100), matching egret. (4) `HSlider` and `VSlider` now override `pointToValue` and `updateSkinDisplayList` to position the thumb using the track's layout bounds (`trackWidth − thumbWidth`) instead of the slider's own `width`/`height`, which mispositioned the thumb whenever the track was inset or differed from the slider bounds. Added `liveDragging` (default true) and `pendingValue` properties.
- **ListBase**: Added `requireSelection` property (default false). When true, `commitSelection` refuses to deselect to −1 if there is data (restoring the previous selection), and enabling it with no selection auto-selects index 0. Enables "always-one-selected" semantics needed by TabBar.
- **Scroller**: Scrolling no longer triggers false taps on child components. The viewport now registers capture-phase listeners for `TOUCH_TAP` and `TOUCH_END`; when a scroll gesture is detected (touch moves beyond threshold), the upcoming tap is swallowed via `stopPropagation` so List items and other children don't receive a spurious click.

### Tests

- Added `test/ProgressBar.test.ts` (14 cases): value clamping + `change` dispatch, `ratio` (including non-zero minimum and `range <= 0`), `labelDisplay` default format + `labelFunction`, and the `scrollRect` thumb-clipping contract for all four directions.
- Added `test/Label.test.ts` (2 cases): `measure()` leaves no side effect on the text field's `$explicitWidth`.
- Added `test/RadioButton.test.ts` (9 cases): default groupName mutual exclusion, group CHANGE dispatch (interactive vs programmatic), group `enabled` propagation, `selectedValue` label fallback, programmatic deselect clears group selection, addInstance adopts pre-selected radio.
- Added `test/Slider.test.ts` (9 cases): default maximum=10, `liveDragging` default, CHANGE dispatch (track tap / value-change guard), CHANGE_START/CHANGE_END lifecycle, `liveDragging=false` defers commit to release, `pointToValue` uses track bounds.
- Added `test/Scroller.test.ts` (2 cases): tap swallowed when touch moves beyond threshold, tap not swallowed when within threshold.
- Added 5 cases to `test/ListBase.test.ts` for `requireSelection`.
- Total test count: 101 → 128.

---

## [1.0.1] — 2026-07-28

### Fixed

- **RadioButton**: Clicking a RadioButton no longer leaves the group with zero selection. `Button.buttonReleased` mutated `_selected` directly (`this._selected = !this._selected`), bypassing the (polymorphic) `selected` setter, so `RadioButton`'s override — which calls `group.notifySelected(this)` to deselect the other radios in the same `groupName` — was never invoked. The symptom was that `groupName` had no effect: selecting one radio did not deselect the others. `buttonReleased` now routes through the setter (`this.selected = !this.selected`), matching egret's `eui.ToggleButton.buttonReleased`. Since the `selected` setter already calls `invalidateState()`, the redundant `invalidateState()` was moved out of the toggle branch into the non-toggle `else` branch.
- **RadioButton**: Tapping an already-selected RadioButton now keeps it selected instead of deselecting it (standard radio semantics: once any radio in a group is selected it cannot be tapped back to empty). `RadioButton` overrides `buttonReleased` to early-return when `enabled === false || selected === true`, mirroring egret's `eui.RadioButton.buttonReleased`.

### Tests

- Added regression coverage in `test/SkinAlignment.test.ts` for the RadioButton group contract (3 new cases): (1) basic mutual exclusion via the `selected` setter, (2) mutual exclusion through the real `buttonReleased()` click path — the case that was silently green before the setter fix, (3) tapping a selected radio does not deselect it. (8 → 11 tests in this file.)

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
