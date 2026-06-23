# Browser Library Boundary Hardening Design

Date: 2026-06-23
Status: approved for planning after review

## Purpose

Harden the current canvas-first MVP by using existing open-source libraries with stricter boundaries. The next slice must reduce browser bundle risk from schema-heavy Confluence ADF validation, domesticate GrapesJS runtime defaults, and preserve the core-backed export contract.

This is not a mobile/tablet feature slice. Existing preview-width behavior may remain as a compatibility surface, but new mobile/tablet polish, assertions, and layout work are out of scope.

## Current Problem

The app currently imports `exportProject()` from `@htmleditor/core` during initial app load. Through the core barrel, that path reaches `exportNativeMappingReport()`, `buildConfluenceAdfDraft()`, and `@atlaskit/adf-schema`. This pulls schema and ProseMirror-related code into the initial browser bundle even before the user opens the export drawer.

GrapesJS is correctly wrapped as an app-layer canvas adapter, but its runtime defaults are not fully constrained. The adapter disables storage, panels, default blocks, canvas scripts, and style sectors, but the config should also explicitly disable telemetry and remote icon CSS.

## Scope

Implement one library-boundary hardening slice:

- Keep `packages/core` authoritative for import, sanitization, document editing, render-tree HTML, compatibility, and export artifacts.
- Keep `exportProject()` behavior intact for core tests and non-browser callers unless a deliberate contract change is planned later.
- Stop importing schema-heavy export code on the app's initial render path.
- Load the export path only when the export drawer/export action is requested.
- Configure GrapesJS with no telemetry and no remote icon CSS.
- Update smoke checks so the initial app bundle rejects schema-heavy and remote-runtime markers.
- Keep browser smoke focused on desktop editor behavior and export evidence.

## Non-Goals

- No mobile or tablet feature development.
- No mobile layout polish.
- No Confluence publish/update integration.
- No attachment upload.
- No verified Confluence storage-format or ADF page-body output.
- No new claim that `native-mapping-report.json` is publishable.
- No GrapesJS default blocks, panels, style manager, layer manager, arbitrary traits, remote asset widgets, or generic website-builder features.
- No export path using GrapesJS `getHtml()` or `getCss()`.
- No rich text editor integration.
- No callout title/body subfield editing.
- No block taxonomy expansion until divider semantics and ADF mapping expectations are clarified.

## Architecture

### App Initial Path

The app initial path should import only browser-safe core capabilities:

- import HTML/Markdown
- edit selected text
- insert constrained material blocks
- render sanitized render-tree HTML for the canvas
- read core types

It should not statically import `exportProject()` if that import keeps `@atlaskit/adf-schema` reachable from the initial bundle.

### Export Path

The export action should lazy-load the export module. The app should expose an async export flow such as `exportCurrentProjectAsync(state)` or an equivalent UI-level lazy import.

The export drawer behavior remains the same from the user's perspective:

- It still shows the four MVP artifacts:
  - `standalone.html`
  - `confluence-fragment.html`
  - `compatibility-report.json`
  - `native-mapping-report.json`
- `native-mapping-report.json` still reports `isConfluencePageBody: false`.
- If `confluenceAdfDraft` remains present after lazy export, it must stay nested inside the report as evidence only.

### Core Boundary

This slice should prefer the least disruptive boundary change:

- Preserve `exportProject()` as the synchronous core export entry point for now.
- Avoid leaking Atlaskit runtime dependencies into app initial load.
- Remove vendor runtime imports from pure document types where practical, replacing them with a vendor-neutral JSON shape if needed.

A later slice may split ADF validation into a separate adapter package or subpath. That broader split is allowed only after the lazy browser boundary is stable.

### GrapesJS Boundary

GrapesJS remains an implementation detail of `packages/app/src/editor/grapesAdapter.ts`.

The adapter config must explicitly set:

- `telemetry: false`
- no remote `cssIcons`
- no default panels
- no default blocks
- no canvas scripts
- no style-manager sectors
- storage disabled

The app must continue to treat GrapesJS as a canvas adapter, not as the source of truth for export.

## Tests And Verification

Required tests:

- App model test for the async export flow: export still returns all four artifacts and preserves `isConfluencePageBody: false`.
- GrapesJS adapter test: config disables telemetry and remote icon CSS while keeping constrained blocks only.
- App smoke: built initial bundle must not contain:
  - `@atlaskit/adf-schema`
  - `prosemirror`
  - `nodeFromJSON`
  - `confluenceAdfDraft`
  - `https://app.grapesjs.com`
  - `https://cdnjs.cloudflare.com`
- Browser smoke: desktop flow still verifies sample load, selection, text edit, constrained block insertion, sanitized import, export drawer, four artifacts, JSON parsing, and `isConfluencePageBody: false`.

Verification commands:

```bash
npm run verify
npm run browser:smoke
```

`npm run verify` remains the baseline gate. `npm run browser:smoke` is required for this visual editor/library-boundary slice because it proves the lazy export path works in a real browser.

## Subagent Workflow

Use subagents after the implementation plan is written:

- Worker A: app/core import surface and lazy export flow.
- Worker B: GrapesJS configuration hardening and adapter tests.
- Worker C: smoke and browser-smoke marker updates.
- Spec reviewer: compare changed behavior against this design and the plan.
- Code quality reviewer: adversarial review for export-contract drift, Confluence promise leakage, and accidental builder-mode exposure.

Workers must use disjoint write scopes where possible. No worker may revert unrelated local changes or commit untracked local-only directories.

## Risks

- If lazy export is implemented at the wrong layer, Vite may still include schema-heavy code in the initial chunk.
- Existing smoke tests currently expect ADF markers in the app bundle, so tests must be updated deliberately rather than weakened accidentally.
- Removing Atlaskit type references from document types can cause broad type churn. Keep that change narrow.
- GrapesJS config names should be verified against the installed version rather than guessed.

## Acceptance Criteria

- Initial app bundle no longer contains the forbidden schema-heavy or remote-runtime markers listed above.
- Export drawer still works after lazy loading.
- Core-backed export contract remains intact.
- UI copy still frames native mapping as a report/plan, not a publishable Confluence page body.
- No mobile/tablet feature work is added.
- `npm run verify` passes.
- `npm run browser:smoke` passes or any environment-specific blocker is documented with exact failure output.
