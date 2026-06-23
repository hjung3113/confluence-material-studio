# Editor Boundaries

## Layer Ownership

`packages/core` owns deterministic product logic:

- document model
- migrations
- HTML import
- Markdown import
- sanitization
- export adapters
- compatibility rules
- asset normalization
- editability classification
- document mutations such as duplicate, delete, reorder, text edit, and theme token updates

`packages/app` owns UI:

- section navigator
- live canvas
- inspector
- command bar
- preview panes
- export dialogs
- undo/redo presentation and history orchestration
- import review, editability badges, editable target selection, and theme controls

`packages/test-harness` owns verification helpers:

- fixture rendering
- screenshot capture
- visual diff helpers
- export artifact checks
- built-bundle boundary checks
- real-browser smoke flows

The current MVP uses both built-asset smoke verification and a Chrome browser smoke harness. Browser smoke stays focused on deterministic desktop editor behavior: import review, canvas selection, editability evidence, constrained document controls, theme token edits, sanitizer import, lazy export evidence, and runtime asset boundaries.

## Package Entry Boundaries

`packages/core` exposes package subpaths for consumers:

- `@htmleditor/core`: full Node-capable core surface
- `@htmleditor/core/browser`: browser-safe import/edit/render APIs and types for the app initial path
- `@htmleditor/core/export`: export adapters and schema-heavy export flow

`packages/app` must import browser-initial behavior from `@htmleditor/core/browser`. It must lazy-load `@htmleditor/core/export` only when the operator opens export evidence. App configuration must not alias these package specifiers back to `../core/src` because that bypasses package export contracts and can accidentally pull Node/schema-heavy modules into the browser entry graph.

The browser subpath uses the browser-safe sanitizer implementation. Node/full-core callers can use the `sanitize-html` backed sanitizer, but that dependency must not leak into the initial app bundle.

## Dependency Rules

- `core` must not depend on React.
- `core` must not depend on UI state.
- `core` must not perform network calls in MVP.
- `app` must call `core` APIs rather than reimplement parser/export logic.
- `test-harness` may depend on browser automation tooling.
- `app` must not use GrapesJS output as the persisted document or export source.
- runtime-generated output must not depend on external CDN or network resources.

## Canvas Boundary

GrapesJS is an app-layer canvas adapter behind `packages/app/src/editor/grapesAdapter.ts`.

The app lazy-loads the adapter after a canvas host exists. The initial app bundle must not contain GrapesJS runtime markers, default builder blocks, remote icon CSS, or telemetry setup. The adapter may render sanitized render-tree HTML, report selected node IDs, and forward constrained add/edit events into app/core document mutations. It must not expose the raw GrapesJS editor object to the rest of the app.

If the lazy canvas chunk fails to load, document controls remain available through the outline and inspector. This keeps `ProjectDoc` editing independent of the canvas library.

## Editor Mutation Rules

- UI edits produce explicit `ProjectDoc` mutations.
- Mutations update `renderTree` first when visual output changes.
- Semantic overlay may be updated after render tree changes.
- Standalone export must remain valid even if semantic overlay is incomplete.
- Imported raw HTML is never loaded directly into the canvas. The canvas receives sanitized render-tree HTML generated through core.
- Editability evidence distinguishes directly editable text, partially editable preserved structures, and preserved-only imported structures.
- Theme token edits update `ProjectDoc.themeTokens`; they are not canvas-only CSS patches.

## Undo and Redo

Undo/redo belongs to the app layer but records core-level document operations. Raw UI events should not be the persisted undo unit.

Undo/redo covers document mutations such as text edits, constrained block insertion, duplicate/delete/reorder, and theme token changes. Preview width changes are UI state and should not become document history.

## Asset Ownership

Core owns asset normalization and export asset references. App owns user interaction for selecting, replacing, and previewing assets.
