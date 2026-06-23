# Editor Freedom And Library Boundaries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the app closer to a real constrained HTML material editor by adding editability evidence, core document controls, theme token editing, import risk review, stronger browser/package boundaries, and sanitizer hardening.

**Architecture:** `packages/core` remains the only owner of document mutations, sanitizer behavior, import/export, compatibility, and package entry contracts. `packages/app` renders UX state and calls core/browser APIs; GrapesJS remains a lazy app-layer canvas adapter, not the persistence/export source. `packages/test-harness` verifies bundle boundaries and browser smoke flows.

**Tech Stack:** TypeScript, npm workspaces, Vitest, Vite, GrapesJS, parse5, sanitize-html, @atlaskit/adf-schema, Playwright/Chrome smoke harness.

---

## Task 1: Core Editability And Document Mutations

**Files:**
- Modify: `packages/core/src/document/editOperations.ts`
- Modify: `packages/core/src/browser.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/test/document-edit-operations.test.ts`

- [ ] Write failing tests for:
  - selected node editability classification: `editable`, `partially-editable`, `preserved-only`
  - duplicate selected node with fresh node ids and trace entry
  - delete selected node without deleting the root document
  - move selected node up/down among siblings
  - update theme tokens with trace entry
- [ ] Run `npm test --workspace @htmleditor/core -- document-edit-operations.test.ts` and verify the new tests fail for missing exports/behavior.
- [ ] Implement minimal core APIs:
  - `getNodeEditability(doc, nodeId)`
  - `listEditableTextTargets(doc, nodeId)`
  - `duplicateNode(doc, input)`
  - `deleteNode(doc, input)`
  - `moveNode(doc, input)`
  - `updateThemeTokens(doc, input)`
- [ ] Re-run the focused core test until green.
- [ ] Run `npm test --workspace @htmleditor/core`.

## Task 2: App State History And UX Controls

**Files:**
- Modify: `packages/app/src/appModel.ts`
- Modify: `packages/app/src/main.ts`
- Modify: `packages/app/src/styles.css`
- Test: `packages/app/test/appModel.test.ts`

- [ ] Write failing app model tests for:
  - duplicate/delete/move invalidates document state through app model helpers
  - undo/redo returns previous and next document snapshots
  - theme updates change `ProjectDoc.themeTokens`
  - editability status and editable text targets are exposed to UI callers
- [ ] Run `npm test --workspace @htmleditor/app -- appModel.test.ts` and verify failures.
- [ ] Add app model helpers wrapping core APIs and an undo/redo history shape.
- [ ] Add inspector controls:
  - editability badge and reason
  - editable text target selector for complex nodes
  - duplicate/delete/move up/move down
  - undo/redo
  - theme token controls for colors, font stack, spacing, radius, shadow
- [ ] Replace the “spike” locked copy with product-safe guidance.
- [ ] Re-run app tests.

## Task 3: Import Review And Export Evidence UX

**Files:**
- Modify: `packages/app/src/appModel.ts`
- Modify: `packages/app/src/main.ts`
- Modify: `packages/app/src/styles.css`
- Test: `packages/app/test/appModel.test.ts`

- [ ] Write failing tests for import review summary:
  - warning counts from `transformationTrace`
  - editable/partial/preserved node counts
  - target impact summary for compatibility warnings
- [ ] Run focused app tests and verify failures.
- [ ] Implement import review summary helpers.
- [ ] Add an import review panel after import with:
  - sanitizer warning count
  - editability counts
  - target impact
  - source baseline availability note
- [ ] Expand export drawer warnings beyond rule IDs to include severity/message/recommendation.
- [ ] Re-run app tests.

## Task 4: Core Package Subpath Exports

**Files:**
- Modify: `packages/core/package.json`
- Modify: `packages/core/tsconfig.json`
- Modify: `packages/app/tsconfig.json`
- Modify: `packages/app/vite.config.ts`
- Modify: root `package.json`
- Test: `packages/test-harness/src/app-smoke.ts`

- [ ] Write failing smoke/assertion that app source does not rely on `../core/src` aliases for `@htmleditor/core/browser` or `@htmleditor/core/export`.
- [ ] Run `npm run app:smoke` and verify the new assertion fails.
- [ ] Add core build output for `index`, `browser`, and `export` subpaths.
- [ ] Add `exports` entries for `.`, `./browser`, and `./export`.
- [ ] Remove app-local source aliases for core subpaths or limit them to package-compatible resolution.
- [ ] Ensure `npm run verify` still typechecks all workspaces.

## Task 5: Lazy GrapesJS Canvas Boundary And Bundle Budget

**Files:**
- Modify: `packages/app/src/main.ts`
- Modify: `packages/app/src/editor/grapesAdapter.ts`
- Modify: `packages/app/vite.config.ts`
- Modify: `packages/test-harness/src/app-smoke.ts`
- Test: `packages/app/test/grapesAdapter.test.ts`

- [ ] Write failing app smoke checks for:
  - initial JS gzip budget lower than current GrapesJS-initial baseline
  - GrapesJS markers absent from initial JS chunk
  - GrapesJS allowed in a lazy chunk
- [ ] Run `npm run app:smoke` and verify failure on current bundle.
- [ ] Lazy import `createGrapesCanvasAdapter` from `main.ts`.
- [ ] Keep telemetry and remote icon defaults disabled.
- [ ] Ensure CSS handling still renders the editor.
- [ ] Re-run `npm run app:smoke` and `npm run browser:smoke`.

## Task 6: Sanitizer Library Hardening

**Files:**
- Modify: `packages/core/package.json`
- Modify: root `package-lock.json`
- Modify: `packages/core/src/sanitize/sanitizeHtml.ts`
- Modify: `fixtures/hostile/script-and-remote-assets.html`
- Modify: `fixtures/expected/hostile-compatibility-rules.json`
- Test: `packages/core/test/sanitize-html.test.ts`
- Test: `packages/core/test/mvp-smoke.test.ts`

- [ ] Add failing tests for `srcset`, `iframe`, `object`, `embed`, escaped CSS remote URL, and remote CSS import variants.
- [ ] Run focused sanitizer tests and verify failures.
- [ ] Add `sanitize-html` and use it as the structural sanitizer while preserving compatibility warnings.
- [ ] Keep parse5-based CSS/style warning integration where needed.
- [ ] Re-run core tests.

## Task 7: Browser Smoke, Docs, And Final Verification

**Files:**
- Modify: `packages/test-harness/src/browser-smoke.ts`
- Modify: `README.md`
- Modify: `docs/architecture/editor-boundaries.md`
- Modify: `docs/security/sanitizer-policy.md`
- Modify: `docs/testing/verification-strategy.md`

- [ ] Extend browser smoke for import review, editability badge, duplicate/delete/reorder, undo/redo, theme edit, export evidence details, and lazy canvas/export boundaries.
- [ ] Update Korean README usage flow with new controls.
- [ ] Update architecture/security/testing docs for package exports, lazy GrapesJS, sanitizer library hardening, and editability evidence.
- [ ] Run `npm run verify`.
- [ ] Run `npm run browser:smoke`.
- [ ] Review `git diff` for unrelated changes before final status.

---

## Self-Review

- Spec coverage: covers editability map, document controls, import review, theme editing, package subpaths, lazy GrapesJS, sanitizer hardening, browser smoke, and Korean docs.
- Explicit defers: no Confluence API publish/update, no attachment upload, no full raw CSS IDE, no generic GrapesJS builder panels, no mobile/tablet feature expansion beyond existing preview widths.
- Verification: each behavior-changing task starts with focused failing tests, then ends with focused tests; final gate is `npm run verify` plus `npm run browser:smoke`.
