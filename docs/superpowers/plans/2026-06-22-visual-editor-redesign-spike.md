# Visual Editor Redesign Spike Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the export-demo app shell with a canvas-first visual-editor spike that proves selection, text editing, constrained block insertion, preview widths, safe import, and core-backed export.

**Architecture:** `packages/core` remains authoritative for import, sanitization, document mutations, preview serialization, compatibility, and export artifacts. `packages/app` owns UI orchestration and canvas interaction. GrapesJS is the preferred canvas adapter, but the current environment cannot install it due `registry.npmjs.org` DNS failure, so this plan includes a dependency gate and an executable custom DOM canvas fallback.

**Tech Stack:** TypeScript, Vite, Vitest, existing `@htmleditor/core` APIs, Node built-ins for the current smoke harness. GrapesJS and Playwright are deferred until npm registry access is available.

---

## File Structure

- Modify `docs/superpowers/specs/2026-06-22-visual-editor-redesign-spike.md`: keep review-backed constraints current.
- Create `docs/superpowers/reviews/2026-06-22-visual-editor-redesign-agent-review.md`: record persona review synthesis.
- Create `packages/core/src/document/renderTreeHtml.ts`: core-owned render-tree serialization for preview/editor input.
- Create `packages/core/src/document/editOperations.ts`: core-owned text edit and callout insertion operations.
- Modify `packages/core/src/index.ts`: export preview serialization and edit operations.
- Create `packages/core/test/document-edit-operations.test.ts`: TDD coverage for text edit and callout insertion.
- Create `packages/core/test/render-tree-html.test.ts`: TDD coverage for preview serialization with stable node IDs.
- Modify `packages/app/src/appModel.ts`: call core edit operations and expose canvas/import/export state.
- Delete `packages/app/src/renderTree.ts`: remove app-owned serialization after core replacement.
- Modify `packages/app/src/main.ts`: replace source-first dashboard with canvas-first visual editor UI.
- Modify `packages/app/src/styles.css`: layout for top bar, left rail, central canvas, inspector, export drawer, selection outline, and responsive state.
- Modify `packages/app/test/appModel.test.ts`: cover first-screen sample, selection/edit, callout insertion, safe HTML import, export artifacts.
- Modify `packages/test-harness/src/app-smoke.ts`: verify built UI markers for canvas-first flow, forbidden generic builder markers absence, and export target language.

## Task 0: Dependency Gate

- [ ] **Step 1: Confirm GrapesJS availability**

Run:

```bash
npm install grapesjs --workspace @htmleditor/app --save
```

Expected in current environment: FAIL with `getaddrinfo ENOTFOUND registry.npmjs.org`.

- [ ] **Step 2: If install fails, execute fallback path**

Fallback path is Tasks 1-4 below. It must not claim GrapesJS-backed completion. It should still satisfy the canvas-first interaction model with a custom DOM canvas adapter.

## Task 1: Core Preview Serialization And Edit Operations

- [ ] **Step 1: Write failing tests**

Create tests proving:

- `renderTreeToHtml(..., { includeNodeIds: true })` emits `data-core-node-id`.
- `editNodeText(doc, nodeId, text, createdAt)` updates text through core.
- `insertCalloutAfterNode(doc, nodeId, options)` inserts a callout/note block and updates semantic overlay.

Run:

```bash
npm test --workspace @htmleditor/core -- document-edit-operations.test.ts render-tree-html.test.ts
```

Expected: FAIL because files/functions do not exist.

- [ ] **Step 2: Implement minimal core modules**

Add `packages/core/src/document/renderTreeHtml.ts` and `packages/core/src/document/editOperations.ts`. Keep APIs pure and immutable.

- [ ] **Step 3: Export core APIs**

Update `packages/core/src/index.ts` to export the new functions.

- [ ] **Step 4: Verify focused tests**

Run:

```bash
npm test --workspace @htmleditor/core -- document-edit-operations.test.ts render-tree-html.test.ts
```

Expected: PASS.

## Task 2: App Model Uses Core Operations

- [ ] **Step 1: Write failing app model tests**

Update `packages/app/test/appModel.test.ts` so it expects:

- default state imports the editable sample.
- selected text edit uses core operations.
- callout insertion is exposed.
- export artifacts still include all four MVP files.

Run:

```bash
npm test --workspace @htmleditor/app -- appModel.test.ts
```

Expected: FAIL because app model lacks sample/callout APIs.

- [ ] **Step 2: Update app model**

Modify `packages/app/src/appModel.ts` to use core `renderTreeToHtml`, `editNodeText`, and `insertCalloutAfterNode`. Remove duplicate app serialization.

- [ ] **Step 3: Verify focused app tests**

Run:

```bash
npm test --workspace @htmleditor/app -- appModel.test.ts
```

Expected: PASS.

## Task 3: Canvas-First Visual Editor UI

- [ ] **Step 1: Replace source-first UI**

Modify `packages/app/src/main.ts` so first load shows editable sample material in the canvas. Source textarea belongs only inside an import drawer.

- [ ] **Step 2: Add canvas selection**

Render preview HTML with `data-core-node-id`; use event delegation on the canvas to set `selectedNodeId`; style the selected element with an outline.

- [ ] **Step 3: Add constrained block insertion**

Add a Callout/Note button only. Do not expose generic GrapesJS blocks, forms, embeds, iframes, script widgets, or remote asset widgets.

- [ ] **Step 4: Add target-specific export drawer**

Show `standalone.html`, `confluence-fragment.html`, `compatibility-report.json`, and `native-mapping-report.json`; label native mapping as a report/plan.

- [ ] **Step 5: Build**

Run:

```bash
npm run build --workspace @htmleditor/app
```

Expected: PASS.

## Task 4: Smoke Harness And Final Verification

- [ ] **Step 1: Update static smoke markers**

Modify `packages/test-harness/src/app-smoke.ts` to check for canvas-first UI markers and absence of forbidden generic builder language.

- [ ] **Step 2: Run app smoke**

Run:

```bash
npm run app:smoke
```

Expected: PASS.

- [ ] **Step 3: Run full verification**

Run:

```bash
npm run verify
```

Expected: PASS.

## Follow-Up When Network Works

- Add `grapesjs` behind `packages/app/src/editor/grapesAdapter.ts`.
- Add Playwright or equivalent browser automation under `packages/test-harness`.
- Replace custom DOM canvas adapter internals without changing app UI modules.
- Add real browser smoke with desktop/mobile screenshots.
