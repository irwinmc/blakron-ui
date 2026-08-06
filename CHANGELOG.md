# Changelog

All notable changes to `@blakron/ui` are documented here.

---

## [1.0.8] — 2026-08-05

### Fixed

- **ComboBox: drop-down now renders above overlapping siblings** — opening the drop-down temporarily moves the ComboBox to the top of its parent's display-list so the list overlays other content instead of being buried behind neighbouring components. The original z-order is restored on close.
- **TextInput: tap-to-focus** — constructor now registers `TOUCH_BEGIN` on the component, forwarding to `textDisplay.setFocus()` so tapping anywhere in the input (including the prompt area) brings up the keyboard. The `promptDisplay` label is set to `touchEnabled = false` so it no longer blocks the tap.
- **HScrollBar / VScrollBar: proportional thumb sizing** — the scroll-bar thumb now scales proportionally to the visible-viewport fraction (`thumbWidth = scrollbarWidth * viewportWidth / contentWidth`), clamped between the skin-defined minimum and the scroll-bar's full extent. Previously the thumb always used its skin-defined size, which made it impossible to gauge visible-vs-total content ratio. The normal (non-edge) case now correctly calls `setLayoutBoundsSize(thumbWidth, NaN)` instead of `(NaN, NaN)`.
- **Scroller: show scroll bars on new gesture** — `_updateScrollBarVisibility()` is now called in `_onTouchBegin` alongside clearing the auto-hide timer, so scroll bars appear immediately when scrolling starts. The auto-hide timer now respects each scroll bar's `autoVisibility` flag.

### Tests

- ComboBox: 1 case (temporarily moves above sibling content while open).
- TextInput: 1 case (forwards a touch on the component to the editable skin part).

---

## [1.0.7] — 2026-08-05

### Changed

- **SliderBase: reuse scratch `Point` across frame** — replaced per-event `new Point()` allocations in `_onThumbDown` / `_positionToValue` (hot path: every touch move during drag) with an instance-level `_scratchPoint`. Removed dead `commitProperties` / `measure` / `updateSkinDisplayList` overrides and the never-read `_directionChanged` field.
- **Button: remove dead `_autoRepeat` property** — getter/setter existed but no code consumed the value. Simplified `partAdded` to compare `partName` instead of `instance === this.labelDisplay` (eliminates non-null assertions).
- **ListBase: clean up `adjustSelection` and `dataProviderRefreshed`** — removed identical if/else branches and premature `PropertyEvent` dispatch (silent adjustment per egret semantics, events deferred to `commitProperties`).


## [1.0.6] — 2026-08-05

### Fixed

- **Button: missing `hasState` guard in `getCurrentState`**: The selected-state layer (`upAndSelected`/`downAndSelected`/`disabledAndSelected`) was returned unconditionally without checking whether the skin exports those states, and without falling back to `down`/`disabled` when they are absent. A skin that omits the `AndSelected` variants would leave a selected button visually blank. Now matches egret `ToggleButton.getCurrentState` (L132-145): `hasState` guard + fallback.
- **SliderBase: thumb grab offset discarded on drag**: Touching the thumb immediately jumped it so the finger was at its centre instead of tracking from the exact grab point. Egret's `onThumbTouchBegin` computes a `clickOffset` in thumb-local space and subtracts it in `onStageTouchMove`; Blakron now does the same via `_touchOffsetX`/`_touchOffsetY`.
- **Scroller: missing `throwSpeed`, `CHANGE_START`/`CHANGE_END`, and auto-hide timer**: Three egret features were absent. (1) `throwSpeed` property now delegates to the underlying `TouchScroll.scrollFactor`. (2) `UIEvent.CHANGE_START` is dispatched once per scroll gesture when the touch exceeds the threshold; `UIEvent.CHANGE_END` fires when both horizontal and vertical throw animations have stopped. (3) A 200-ms `setTimeout` (matching egret's `autoHideTimer`) hides the scroll bars after the gesture ends.
- **ListBase: `adjustSelection` + deferred `selectedItem` + data-provider re-apply**: Collection mutations (`ADD`/`REMOVE`) now route through `adjustSelection`, which mutates the selection index silently (no event, no `itemSelected`) so that multiple operations within a single frame only produce one final commit. `selectedItem` setter no longer discards the item when `dataProvider` is `undefined` — it stores a pending item and resolves it in `commitProperties` once the data provider is available (egret `pendingSelectedItem`). `dataProviderRefreshed` re-applies `requireSelection` after `RESET`/`REFRESH`.

---

## [1.0.5] — 2026-08-03

### Fixed

- **Component (`enabled` / `touchEnabled` cycle completely broken)**: Three interdependent issues in the `enabled` setter and `touchEnabled` accessor:
  1. **`touchEnabled` getter always returned `undefined`**. Overriding only the setter on `Component.prototype` creates a JS accessor with `get: undefined`, which shadows the inherited `DisplayObject` getter. Every read of `.touchEnabled` on any Component subclass (Button, Label, TextInput, …) silently returned `undefined` instead of the real boolean.
  2. **`enabled = false` never disabled hit-testing**. The setter delegated to `this.touchEnabled = false`, but `Component`'s own `touchEnabled` setter contains a guard (`if (this._enabled) super.touchEnabled = value`) that skips the display-level write when the component is already disabled. The result: a disabled button still captured touches and blocked elements behind it — unlike egret, where disabled components are excluded from hit-testing.
  3. **disable → enable permanently broke touch**. The disable path clobbered `_explicitTouchEnabled` to `false`, and the re-enable path restored `$touchEnabled` from that corrupted value — leaving every Component subclass permanently non-touchable after a single disable/enable cycle.
  The fix matches egret's `$setEnabled`: the `enabled` setter now writes `touchEnabled` / `touchChildren` directly at the display-object level via `super.touchEnabled` / `super.touchChildren`, bypassing the guarded setters. Additionally, `touchEnabled` and `touchChildren` getters are now explicitly overridden to delegate to `super`, un-shadowing the parent accessor.
- **Skin factory: ES class constructors crash via `.call(this)`**: 1.0.4 fixed the EXML binding `this` context by switching from `new factory()` to `factory.call(this)`, but `call()` throws `TypeError` on genuine ES class constructors (the documented `skinName: (new () => Skin)` path). Now detects class constructors via `Function.prototype.toString()` and falls back to `new`.
- **Button: `selected` PropertyEvent never dispatched**: `selected` setter did not dispatch `PropertyEvent('selected')`, breaking data bindings (`{selected}`) on Buttons and ToggleButtons. Now dispatched after `_selected` is updated.
- **Button: redundant `touchEnabled` override after `enabled` setter fix**: The now-fixed `Component.enabled` setter handles `touchEnabled`/`touchChildren` at the display-object level. Button's own `this.touchEnabled = value` line was overwriting that with the user's new value regardless of pre-disable intent, so it has been removed.
- **Skin: `$watchers` / `unwatchAll` missing — watchers leaked on skin swap**: EXML-compiled bindings create `Watcher` instances that were never cleaned up when a skin was detached or replaced, causing memory leaks and stale callbacks firing on the wrong host. `Skin` now exposes a `$watchers` array and `unwatchAll()` method; `Component._setSkin` calls `oldSkin.unwatchAll()` before detaching the old skin.
- **EditableText: `text` PropertyEvent never dispatched**: `text` setter did not dispatch `PropertyEvent('text')`, so watchers/bindings on EditableText's text property were silent. Now dispatched after the internal `super.text = value` assignment.

### Tests

- Added `test/Enabled.test.ts` (30 cases): verifies `enabled` / `touchEnabled` / `touchChildren` cycle semantics for every Component subclass (Component, Button, Label, TextInput, Scroller, ItemRenderer) — initial state, disable-writes-display-touchEnabled, re-enable-restores, and preserves user's pre-disable intent for both `touchEnabled` and `touchChildren`.
- Total test count: 168 → 198.

---

## [1.0.4] — 2026-08-03

### Fixed

- **Scroller (viewport never added to display list)**: Assigning `scroller.viewport = group` registered the touch/property listeners and enabled scrolling on the viewport but never added it to the Scroller's display list, so the viewport (and any List/Group inside it) was completely invisible. Egret's `installViewport()` calls `this.addChildAt(viewport, 0)`; Blakron's setter now does the same, and the old viewport is removed (`removeChild`) with `scrollEnabled = false` reset.
- **Scroller (viewport never sized/positioned)**: `updateDisplayList` did not call `viewport.setLayoutBoundsSize(unscaledWidth, unscaledHeight)` / `setLayoutBoundsPosition(0, 0)`, so the viewport could end up unsized or mispositioned even after being added as a child. Egret's `Scroller.updateDisplayList` (reference L916-917) sizes the viewport to fill the Scroller and anchors it at (0,0); Blakron now matches.
- **Scroller (viewport orphaned on skin re-apply)**: Egret overrides `setSkin` to re-`addChildAt(viewport, 0)` after the skin (scroll bars) is applied so the viewport is never orphaned and sits beneath the bars. Blakron was missing this override; now added.
- **Scroller (static-object field)**: `private static readonly _vpBounds = new Rectangle()` was converted to a module-level constant, applying the same remedy as the HSlider/VSlider class-name-corruption fix from 1.0.3.
- **ItemRenderer (labelDisplay auto-sync)**: Added `partAdded`/`partRemoved`/`dataChanged` to auto-sync `labelDisplay.text = String(data)`, matching Egret's binding fallback. Previously the default ItemRenderer had no mechanism to push `data` into the label.
- **Label (_widthConstraint)**: Added `_widthConstraint` mechanism (`setLayoutBoundsSize` override + `measure` update) so that when a parent layout constrains the Label's width, the measured height correctly accounts for text wrapping. Matches Egret's Label L695-710.
- **Label (text PropertyEvent)**: `text` setter now dispatches `PropertyEvent('text')` for data binding.
- **Panel (elementsContent)**: Added missing `elementsContent` setter so that EXML-declared children of `<eui:Panel>` are added to the display list. Previously they were silently discarded because Panel (via Component) had no such setter.
- **Panel (drag includeInLayout)**: Dragging the moveArea now sets `includeInLayout = false` to prevent the parent layout from snapping the panel back.
- **ViewStack (ICollection)**: ViewStack now implements `ICollection` (`length`/`getItemAt`/`getItemIndex`), dispatches `CollectionEvent` on child add/remove, and dispatches `PropertyEvent('selectedIndex')`. Enables `<eui:TabBar dataProvider="{viewStack}"/>`.
- **TabBar (ViewStack binding)**: TabBar now detects ViewStack dataProviders and sets up bidirectional binding: TabBar CHANGE → ViewStack.selectedIndex, ViewStack PropertyChange → TabBar.selectedIndex.
- **ListBase (CHANGING event)**: `commitSelection` now dispatches `Event.CHANGING` (cancelable) before interactive selection changes, matching Egret. `preventDefault()` reverts the selection.
- **ListBase (updateRenderer selection sync)**: `updateRenderer` now calls `itemSelected` to sync the renderer's `selected` state when renderers are created/recycled (virtual layout).
- **TextInput (inputType)**: Added `inputType` property (proxies to `textDisplay.inputType`) for mobile keyboard type control.
- **ProgressBar (slideDuration)**: Added `slideDuration` (default 500ms) value-change slide animation using the internal `Animation` utility. Matches Egret's default behavior.

### Fixed (CLI)

- **EXML binding codegen**: `emitBinding` was passing the entire expression to `parseBindingTemplate`, which treated simple chains like `"data"` as literal text (no inner `{}`), silently dropping the binding. Now checks for inner `{` first; simple bindings always generate `Binding.bindProperty(...)`.
- **Skin factory `this` context**: `Component._parseSkinName` now calls skin factory functions via `.call(this)` instead of `new`, so `Binding.bindProperty(this, ...)` inside EXML factories correctly references the host component.

### Tests

- Added 3 cases to `test/Scroller.test.ts` for viewport display-list contract.
- Added 2 cases to `test/Label.test.ts` for `_widthConstraint` behavior.
- Total test count: 163 → 168.

---

## [1.0.3] — 2026-08-03

### Fixed

- **HSlider / VSlider (invisible)**: Both sliders rendered with no visible thumb/track because `Theme.getSkinName()` could not resolve their skin. The cause was a `private static readonly _bounds = new Rectangle()` field on each class: the Rollup/esbuild bundler rewrites a class that has a static initialiser holding an object literal by renaming it internally (e.g. `HSlider` → `_HSlider`), so `constructor.name` — which the framework uses as the default `hostComponentKey` for skin lookup — returned `"_HSlider"` instead of `"HSlider"`. With no matching entry in the theme, the skin was never loaded and the `thumb`/`track` skin parts were never bound. Replaced the shared static `Rectangle` with a local allocation in `pointToValue`/`updateSkinDisplayList`. `updateSkinDisplayList` was also simplified to position the thumb via direct `.x`/`.y` assignment instead of `setLayoutBoundsPosition`, and the now-dead thumb-positioning fallback in `SliderBase` was removed (positioning is fully owned by the `HSlider`/`VSlider` overrides).
- **SliderBase / HSlider / VSlider (thumb not following drag)**: While dragging the thumb in `liveDragging` mode the thumb visually stayed put even though `value` updated correctly. `updateSkinDisplayList` positioned the thumb off `pendingValue`, but the `liveDragging` branch of `_onThumbMove` only updated `value` (never `_pendingValue`), so the two diverged during a drag. The thumb is now positioned from `this.value` (always current), and `_pendingValue` is synced inside the `liveDragging` branch so both stay consistent.

### Tests

- Cleaned up `test/SkinAlignment.test.ts`: removed a duplicate RadioButton mutual-exclusion case (already covered by `RadioButton.test.ts` — "defaults to radioGroup"), and corrected an HSlider test name/comment that implied HSlider never dispatches `Event.CHANGE` (it does dispatch CHANGE on interaction after the Slider fix; only programmatic `value` sets dispatch `propertyChange` without CHANGE).
- Translated all remaining Chinese comments/descriptions in `test/SkinAlignment.test.ts` to English.

---

## [1.0.2] — 2026-08-01

### Fixed

- **ProgressBar**: The thumb is now clipped via `scrollRect` instead of having its width overwritten, matching egret's `eui.ProgressBar.updateSkinDisplayList`. The port had implemented progress by directly setting `thumb.width = unscaledWidth * ratio`, which tied the thumb's size to the host's external width (ignoring the skin-defined width) and, as a side effect, repeatedly invalidated the layout during value changes — destabilising percent-width children (e.g. the `labelDisplay` Label) and causing their text to disappear once the value stopped changing. The thumb's size is now driven entirely by the skin/layout; `updateDisplayList` reads `thumb.width`/`thumb.height` and uses `scrollRect` to reveal only the progress portion. Handles all four directions (LTR/RTL/TTB/BTT).
- **Label**: `measure()` no longer leaks the temporary measurement width into the text field. Like egret's `Label.measure`, it now saves the text field's `$explicitWidth`, constrains it temporarily to measure wrapped dimensions, then restores the original value. Previously the field's `$explicitWidth` was left at the measurement value (`100000` when the label had no explicit width), which could corrupt line-wrapping for labels that rely on content-sized width (common in item renderers).
- **RadioButton / RadioButtonGroup**: Four high-severity deviations fixed. (1) RadioButton now defaults to `groupName = "radioGroup"` so that orphan radios still get mutual exclusion. (2) RadioButtonGroup now extends `EventDispatcher` and dispatches `Event.CHANGE` on interactive selection (via `buttonReleased`); programmatic `selected = true` syncs the group without dispatching CHANGE. (3) Group-level `enabled` is now supported — toggling it invalidates every member's state. (4) `selectedValue` getter falls back to the radio's `label` when `value` is empty, and the setter matches by either `value` or `label`. Additionally, `$setSelection` is now the single source of truth for selection changes (with a `fireChange` parameter), `selected = false` on the current selection clears the group's selection, and `$setSelected` bypasses the setter to avoid recursion (replacing the previous `_settingSelection` re-entry guard flag).
- **SliderBase / HSlider / VSlider**: Four high-severity deviations fixed. (1) `Event.CHANGE` is now dispatched on interaction (thumb drag with `liveDragging`, track tap, and release when `liveDragging` is false). (2) `UIEvent.CHANGE_START` and `CHANGE_END` bracket the drag lifecycle. (3) Default `maximum` is now 10 (was 100), matching egret. (4) `HSlider` and `VSlider` now override `pointToValue` and `updateSkinDisplayList` to position the thumb using the track's layout bounds (`trackWidth − thumbWidth`) instead of the slider's own `width`/`height`, which mispositioned the thumb whenever the track was inset or differed from the slider bounds. Added `liveDragging` (default true) and `pendingValue` properties.
- **ListBase**: Added `requireSelection` property (default false). When true, `commitSelection` refuses to deselect to −1 if there is data (restoring the previous selection), and enabling it with no selection auto-selects index 0. Enables "always-one-selected" semantics needed by TabBar.
- **Scroller**: Scrolling no longer triggers false taps on child components. The viewport now registers capture-phase listeners for `TOUCH_TAP` and `TOUCH_END`; when a scroll gesture is detected (touch moves beyond threshold), the upcoming tap is swallowed via `stopPropagation` so List items and other children don't receive a spurious click.
- **TabBar**: Constructor now sets `requireSelection = true` (matching egret), so a tab is always selected once data is available. Previously all tabs could be deselected.

### Tests

- Added `test/ProgressBar.test.ts` (14 cases): value clamping + `change` dispatch, `ratio` (including non-zero minimum and `range <= 0`), `labelDisplay` default format + `labelFunction`, and the `scrollRect` thumb-clipping contract for all four directions.
- Added `test/Label.test.ts` (2 cases): `measure()` leaves no side effect on the text field's `$explicitWidth`.
- Added `test/RadioButton.test.ts` (9 cases): default groupName mutual exclusion, group CHANGE dispatch (interactive vs programmatic), group `enabled` propagation, `selectedValue` label fallback, programmatic deselect clears group selection, addInstance adopts pre-selected radio.
- Added `test/Slider.test.ts` (9 cases): default maximum=10, `liveDragging` default, CHANGE dispatch (track tap / value-change guard), CHANGE_START/CHANGE_END lifecycle, `liveDragging=false` defers commit to release, `pointToValue` uses track bounds.
- Added `test/Scroller.test.ts` (2 cases): tap swallowed when touch moves beyond threshold, tap not swallowed when within threshold.
- Added 5 cases to `test/ListBase.test.ts` for `requireSelection`.
- Added `test/TabBar.test.ts` (4 cases): requireSelection default, auto-select index 0, prevent deselect, switch tabs.
- Added `test/ViewStack.test.ts` (6 cases): child visibility switching, auto-select index 0, CHANGE dispatch, out-of-range clears, remove selected → index 0, index shift on remove.
- Added `test/ItemRenderer.test.ts` (9 cases): state machine (up/down/disabled/upAndSelected/downAndSelected), skin.hasState fallback, data propertyChange, selected invalidateState.
- Added `test/TextInput.test.ts` (12 cases): property caching before skin part, forwarding on partAdded, getCurrentState (normal/normalWithPrompt/disabled).
- Added `test/DataGroup.test.ts` (5 cases): renderer creation, data binding, renderer recycling on dataProvider change, item replace.
- Total test count: 101 → 164.

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
