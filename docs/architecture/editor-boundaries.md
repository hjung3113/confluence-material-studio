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

`packages/app` owns UI:

- section navigator
- live canvas
- inspector
- command bar
- preview panes
- export dialogs

`packages/test-harness` owns verification helpers:

- fixture rendering
- screenshot capture
- visual diff helpers
- export artifact checks

The current MVP harness starts with built-asset smoke verification because the local sandbox can block HTTP listen. Browser automation and screenshot diffing remain the next strengthening step once the app shell is stable in an environment that permits browser execution.

## Dependency Rules

- `core` must not depend on React.
- `core` must not depend on UI state.
- `core` must not perform network calls in MVP.
- `app` must call `core` APIs rather than reimplement parser/export logic.
- `test-harness` may depend on browser automation tooling.

## Editor Mutation Rules

- UI edits produce explicit `ProjectDoc` mutations.
- Mutations update `renderTree` first when visual output changes.
- Semantic overlay may be updated after render tree changes.
- Standalone export must remain valid even if semantic overlay is incomplete.

## Undo and Redo

Undo/redo belongs to the app layer but records core-level document operations. Raw UI events should not be the persisted undo unit.

## Asset Ownership

Core owns asset normalization and export asset references. App owns user interaction for selecting, replacing, and previewing assets.
