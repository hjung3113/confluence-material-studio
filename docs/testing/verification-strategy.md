# Verification Strategy

## Verification Layers

### Unit Tests

Required for:

- document model helpers
- sanitizer rules
- HTML import
- Markdown import
- export adapters
- compatibility rules

### Golden Tests

Required for:

- imported render tree snapshots
- semantic overlay snapshots
- export artifact snapshots
- compatibility report snapshots

### Visual Regression Tests

Required for:

- original HTML preview versus imported render tree preview
- standalone HTML export screenshot comparison
- Confluence-width fragment preview

Visual regression thresholds apply to fixture-defined surfaces, not to arbitrary imported HTML outside the supported subset.

### End-to-End Tests

Required flows:

- HTML import -> text edit -> theme edit -> standalone export
- Markdown import -> section reorder -> Confluence fragment export
- hostile HTML import -> sanitizer warnings -> safe export
- visual block import -> native mapping report with expected unmapped layout rules
- browser smoke -> import review -> editability evidence -> duplicate/delete/reorder -> undo/redo -> theme token edit -> export warning details
- browser smoke -> no external runtime asset requests and lazy canvas/export boundaries

## Current Verification Command

For the core MVP slices, run:

```bash
npm run verify
```

This command typechecks `packages/core` and runs the Vitest suite for document model, compatibility rules, sanitizer, import, and export behavior.

For a focused MVP smoke flow, run:

```bash
npm run smoke
```

This imports the supported HTML fixtures, Markdown outline fixture, hostile fixture, and Confluence-friendly fixture, then exports all four MVP artifacts and checks hostile sanitization plus Confluence macro/risk reporting.

For the app shell smoke flow, run:

```bash
npm run app:smoke
```

This builds `packages/app` and verifies the built editor shell includes source selection, section navigation, live canvas, inspector, export artifact markers, compatibility warning markers, and Confluence macro/risk markers. In restricted environments where local HTTP listen is unavailable, the harness validates built assets directly from disk.

It also verifies package and bundle boundaries:

- `@htmleditor/core`, `@htmleditor/core/browser`, and `@htmleditor/core/export` resolve through package exports.
- app config does not alias `@htmleditor/core` subpaths to `../core/src`.
- schema-heavy export markers such as `@atlaskit/adf-schema`, ProseMirror, `nodeFromJSON`, and `confluenceAdfDraft` stay out of the initial browser graph.
- Node-only sanitizer markers such as `sanitize-html` and `createRequire` stay out of the initial browser graph.
- GrapesJS runtime markers stay out of the initial browser graph and appear only in the lazy canvas graph.
- known external runtime/CDN URLs are absent from built JS.

For the real browser editor smoke flow, run:

```bash
npm run browser:smoke
```

This builds `packages/app`, serves the dist directory through a local static server, and drives Chrome through the actual app controls. It verifies sample canvas load, selection, text edit, editability badge/evidence, editable target selector when available, constrained block insertion, duplicate/delete/reorder, undo/redo, theme token updates, sanitized hostile import, import review evidence, export warning details, all four MVP artifacts, JSON parseability, `isConfluencePageBody: false`, lazy export chunk loading, and absence of external runtime asset requests.

Browser smoke is deterministic and desktop-only. Existing preview-width buttons remain part of the app surface, but this slice does not add mobile/tablet visual assertions.

## Sanitizer Verification

Sanitizer changes require focused tests plus the relevant smoke flow:

```bash
npm test --workspace @htmleditor/core -- sanitize-html.test.ts
npm run smoke
```

The sanitizer suite must cover the Node `sanitize-html` structural hardening path, browser-safe import behavior, inline handlers, scripts, active embeds, `srcset`, `javascript:` URLs, remote URLs, CSS `url(...)`, and CSS `@import` variants.

## Completion Rule

Work is not complete until relevant verification commands have been run and their results are recorded in the final status.

For editor freedom and library-boundary work, the minimum final gate is:

```bash
npm run browser:smoke
npm run verify
```
