# Browser Library Boundary Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep schema-heavy Atlaskit ADF code out of the app's initial browser bundle while preserving core-backed export behavior and tightening GrapesJS runtime defaults.

**Architecture:** Add a browser-safe core entrypoint for app initial imports and a lazy export subpath for the export drawer. Keep `exportProject()` synchronous in core, but call it from the app only through an async dynamic import. GrapesJS remains an app-layer canvas adapter with telemetry and remote icon CSS explicitly disabled.

**Tech Stack:** TypeScript, Vite path aliases, Vitest, GrapesJS, Playwright browser smoke, existing `@htmleditor/core` APIs.

---

## Scope Guard

Do not implement mobile/tablet feature work. Existing preview-width buttons may remain, but do not add mobile layout polish, mobile assertions, or tablet-specific work.

Do not add Confluence publish/update, attachment upload, storage-format export, ADF page-body claims, GrapesJS default builder panels/blocks, arbitrary style editing, rich text editing, or any export path based on GrapesJS `getHtml()` / `getCss()`.

## File Structure

- Create `packages/core/src/browser.ts`: browser-safe public entrypoint for app initial load.
- Modify `packages/core/src/document/types.ts`: remove direct Atlaskit type import from core document contracts.
- Modify `packages/app/tsconfig.json`: add core browser/export subpath aliases.
- Modify `packages/app/vite.config.ts`: add matching Vite aliases.
- Modify `packages/app/src/appModel.ts`: import browser-safe APIs statically and lazy-load export.
- Modify `packages/app/src/main.ts`: make export drawer load asynchronously and cache the export result.
- Modify `packages/app/src/editor/grapesAdapter.ts`: set GrapesJS telemetry and remote icon CSS controls.
- Modify `packages/app/test/appModel.test.ts`: update export tests to await async export.
- Modify `packages/app/test/grapesAdapter.test.ts`: assert GrapesJS hardening config.
- Modify `packages/test-harness/src/app-smoke.ts`: reject schema-heavy and remote-runtime markers from initial bundle.
- Modify `packages/test-harness/src/browser-smoke.ts`: keep desktop export verification, remove mobile screenshot step, and keep `isConfluencePageBody: false` check.

## Task 1: Browser-Safe Core Entry And Lazy Export Flow

**Files:**
- Create: `packages/core/src/browser.ts`
- Modify: `packages/core/src/document/types.ts`
- Modify: `packages/app/tsconfig.json`
- Modify: `packages/app/vite.config.ts`
- Modify: `packages/app/src/appModel.ts`
- Modify: `packages/app/src/main.ts`
- Test: `packages/app/test/appModel.test.ts`

- [ ] **Step 1: Add the failing app model test for async export**

In `packages/app/test/appModel.test.ts`, change the callout export test to async and assert that `exportCurrentProject` returns a promise before awaiting it:

```ts
  it("inserts a constrained callout block through the app model", async () => {
    let state = createAppState({
      now: "2026-06-22T00:00:00.000Z",
      generatedAt: "2026-06-22T00:00:00.000Z",
    });

    state = importSampleMaterial(state);
    state = insertCalloutAfterSelection(state, {
      title: "Review note",
      body: "Confirm the Confluence fragment before sharing.",
    });

    const exportPromise = exportCurrentProject(state);

    expect(exportPromise).toBeInstanceOf(Promise);

    const exported = await exportPromise;

    expect(getCanvasHtml(state)).toContain("Review note");
    expect(getExportArtifact(exported, "standalone.html")).toContain(
      "Confirm the Confluence fragment before sharing.",
    );
    expect(
      exported.nativeMappingReport?.mappings.some(
        (mapping) => mapping.semanticRole === "callout",
      ),
    ).toBe(true);
  });
```

Update every other `exportCurrentProject(state)` call in this test file to `await exportCurrentProject(state)`, and mark those test callbacks `async`. Only the callout test needs `toBeInstanceOf(Promise)`; the rest may simply await the result. Keep `setPreviewWidth(state, "tablet")` if already present as a non-regression check, but do not add new mobile/tablet assertions.

- [ ] **Step 2: Run the targeted app model test and confirm the async mismatch**

Run:

```bash
npm test --workspace @htmleditor/app -- appModel.test.ts
```

Expected before implementation: TypeScript/Vitest failure because `exportCurrentProject` still returns `ExportResult` synchronously or tests still contain unawaited call sites.

- [ ] **Step 3: Create a browser-safe core entrypoint**

Create `packages/core/src/browser.ts`:

```ts
export const CORE_PACKAGE_NAME = "@htmleditor/core";

export {
  editNodeText,
  insertCalloutAfterNode,
  insertMaterialBlockAfterNode,
} from "./document/editOperations.js";
export type { MaterialBlockType } from "./document/editOperations.js";
export { renderTreeToHtml } from "./document/renderTreeHtml.js";
export { importHtml } from "./import/htmlImport.js";
export { importMarkdown } from "./import/markdownImport.js";
export type * from "./document/types.js";
export type { ImportHtmlInput } from "./import/htmlImport.js";
export type { ImportMarkdownInput } from "./import/markdownImport.js";
```

This entrypoint must not export `exportProject`, `exportNativeMappingReport`, or `buildConfluenceAdfDraft`.

- [ ] **Step 4: Remove Atlaskit type import from document contracts**

In `packages/core/src/document/types.ts`, replace:

```ts
import type { DocNode } from "@atlaskit/adf-schema";
```

with a vendor-neutral JSON-compatible type:

```ts
export type ConfluenceAdfDocument = {
  type: "doc";
  version: number;
  content?: unknown[];
};
```

Then change the native mapping report shape from:

```ts
    document: DocNode;
```

to:

```ts
    document: ConfluenceAdfDocument;
```

Keep `packages/core/src/export/confluenceAdfDraft.ts` free to import `DocNode` internally for schema validation. Cast its validated document to `ConfluenceAdfDocument` only at the public report boundary if TypeScript requires it.

- [ ] **Step 5: Add app path aliases**

Modify `packages/app/tsconfig.json` so `compilerOptions.paths` includes all three paths:

```json
    "paths": {
      "@htmleditor/core": ["../core/src/index.ts"],
      "@htmleditor/core/browser": ["../core/src/browser.ts"],
      "@htmleditor/core/export": ["../core/src/export/exportProject.ts"]
    }
```

Modify `packages/app/vite.config.ts` so the alias block is:

```ts
    alias: {
      "@htmleditor/core/browser": resolve(__dirname, "../core/src/browser.ts"),
      "@htmleditor/core/export": resolve(
        __dirname,
        "../core/src/export/exportProject.ts",
      ),
      "@htmleditor/core": resolve(__dirname, "../core/src/index.ts"),
    },
```

The subpath aliases must appear before the broad `@htmleditor/core` alias.

- [ ] **Step 6: Move app model static imports to the browser-safe entrypoint**

In `packages/app/src/appModel.ts`, remove `exportProject` from the static import and change the import source to `@htmleditor/core/browser`:

```ts
import {
  editNodeText,
  importHtml,
  importMarkdown,
  insertCalloutAfterNode,
  insertMaterialBlockAfterNode,
  renderTreeToHtml,
  type ExportResult,
  type MaterialBlockType,
  type ProjectDoc,
  type RenderNode,
  type SemanticRole,
} from "@htmleditor/core/browser";
```

Replace the synchronous export function:

```ts
export function exportCurrentProject(state: AppState): ExportResult {
  if (!state.doc) {
    throw new Error("Cannot export before importing a document.");
  }

  return exportProject(state.doc, {
    generatedAt: state.generatedAt,
    fragmentId: "app-preview",
  });
}
```

with:

```ts
export async function exportCurrentProject(
  state: AppState,
): Promise<ExportResult> {
  if (!state.doc) {
    throw new Error("Cannot export before importing a document.");
  }

  const { exportProject } = await import("@htmleditor/core/export");

  return exportProject(state.doc, {
    generatedAt: state.generatedAt,
    fragmentId: "app-preview",
  });
}
```

- [ ] **Step 7: Make the UI export drawer asynchronous**

In `packages/app/src/main.ts`, change the type import source from `@htmleditor/core` to `@htmleditor/core/browser`:

```ts
import type {
  ExportResult,
  MaterialBlockType,
  RenderNode,
  SemanticOverlayEntry,
} from "@htmleditor/core/browser";
```

Add export state near the existing globals:

```ts
let exportResult: ExportResult | undefined;
let exportLoading = false;
let exportError: string | undefined;
```

In `render()`, remove:

```ts
  const exportResult = state.doc ? exportCurrentProject(state) : undefined;
```

and render the drawer with the cached state:

```ts
      ${exportDrawerOpen ? exportDrawerContent() : ""}
```

Add this helper near `exportDrawer()`:

```ts
function exportDrawerContent(): string {
  if (exportLoading) {
    return `
      <section class="drawer export-drawer" aria-label="Export evidence drawer">
        <div class="drawer-header">
          <div>
            <h2>Export evidence</h2>
            <p>Preparing core-backed export artifacts.</p>
          </div>
          <button data-action="close-export">Close</button>
        </div>
        <p>Loading export evidence...</p>
      </section>
    `;
  }

  if (exportError) {
    return `
      <section class="drawer export-drawer" aria-label="Export evidence drawer">
        <div class="drawer-header">
          <div>
            <h2>Export evidence</h2>
            <p>Native mapping is a report/plan, not a Confluence page body.</p>
          </div>
          <button data-action="close-export">Close</button>
        </div>
        <p class="locked-notice">${escapeHtml(exportError)}</p>
      </section>
    `;
  }

  return exportResult ? exportDrawer(exportResult) : "";
}
```

Replace the `toggle-export` click handler with:

```ts
      if (exportDrawerOpen) {
        exportDrawerOpen = false;
        render();
        return;
      }

      void openExportDrawer();
```

Add:

```ts
async function openExportDrawer(): Promise<void> {
  exportDrawerOpen = true;
  exportLoading = true;
  exportError = undefined;
  exportResult = undefined;
  selectedArtifact = "standalone.html";
  render();

  try {
    exportResult = await exportCurrentProject(state);
  } catch (error) {
    exportError =
      error instanceof Error ? error.message : "Unable to export project.";
  } finally {
    exportLoading = false;
    render();
  }
}
```

In every mutation path that changes `state.doc` (`importDraft`, apply text, add callout, add material block), invalidate cached export output before `render()`:

```ts
invalidateExportResult();
```

Add:

```ts
function invalidateExportResult(): void {
  exportResult = undefined;
  exportError = undefined;
}
```

- [ ] **Step 8: Run targeted tests**

Run:

```bash
npm test --workspace @htmleditor/app -- appModel.test.ts
npm run typecheck --workspace @htmleditor/app
```

Expected after implementation: app model tests pass and app typecheck exits 0.

- [ ] **Step 9: Commit Task 1**

Run:

```bash
git add packages/core/src/browser.ts packages/core/src/document/types.ts packages/app/tsconfig.json packages/app/vite.config.ts packages/app/src/appModel.ts packages/app/src/main.ts packages/app/test/appModel.test.ts
git commit -m "feat: lazy load app export boundary"
```

## Task 2: GrapesJS Runtime Hardening

**Files:**
- Modify: `packages/app/src/editor/grapesAdapter.ts`
- Test: `packages/app/test/grapesAdapter.test.ts`

- [ ] **Step 1: Add the failing GrapesJS config assertions**

In `packages/app/test/grapesAdapter.test.ts`, extend the config test:

```ts
    expect(config).toMatchObject({
      storageManager: false,
      telemetry: false,
      cssIcons: "",
      panels: { defaults: [] },
      blockManager: { blocks: [] },
    });
```

Also keep:

```ts
    expect(config.canvas).toMatchObject({ scripts: [], styles: [] });
```

- [ ] **Step 2: Run the targeted adapter test and confirm it fails**

Run:

```bash
npm test --workspace @htmleditor/app -- grapesAdapter.test.ts
```

Expected before implementation: failure because `telemetry` and `cssIcons` are not present in the config.

- [ ] **Step 3: Harden GrapesJS config**

In `packages/app/src/editor/grapesAdapter.ts`, add these properties to the object returned by `buildGrapesEditorConfig()`:

```ts
    telemetry: false,
    cssIcons: "",
```

Place them near `storageManager`, `noticeOnUnload`, and other top-level GrapesJS runtime controls.

- [ ] **Step 4: Run targeted tests**

Run:

```bash
npm test --workspace @htmleditor/app -- grapesAdapter.test.ts
npm run typecheck --workspace @htmleditor/app
```

Expected after implementation: adapter tests pass and app typecheck exits 0.

- [ ] **Step 5: Commit Task 2**

Run:

```bash
git add packages/app/src/editor/grapesAdapter.ts packages/app/test/grapesAdapter.test.ts
git commit -m "fix: disable GrapesJS remote runtime defaults"
```

## Task 3: Smoke Contract Updates

**Files:**
- Modify: `packages/test-harness/src/app-smoke.ts`
- Modify: `packages/test-harness/src/browser-smoke.ts`

- [ ] **Step 1: Update app smoke forbidden markers**

In `packages/test-harness/src/app-smoke.ts`, remove these from `requiredBundleText`:

```ts
  "confluenceAdfDraft",
  "@atlaskit/adf-schema",
```

Add these to `forbiddenBundleText`:

```ts
  "@atlaskit/adf-schema",
  "prosemirror",
  "nodeFromJSON",
  "confluenceAdfDraft",
  "https://app.grapesjs.com",
  "https://cdnjs.cloudflare.com",
```

Keep the existing product and editor markers in `requiredBundleText`, including:

```ts
  "Canvas-first visual editor",
  "Visual canvas",
  "Allowed blocks",
  "Native mapping is a report/plan, not a Confluence page body.",
  "native-mapping-report.json",
```

- [ ] **Step 2: Update browser smoke to wait for lazy export**

In `packages/test-harness/src/browser-smoke.ts`, after clicking `Export evidence`, wait for the artifact tabs before reading artifact content:

```ts
  await page.getByRole("button", { name: "Export evidence" }).click();
  await expectText(page, "Native mapping is a report/plan, not a Confluence page body.");
  await expectText(page, "standalone.html");
```

Keep `expectArtifactContains()` and JSON parsing for `compatibility-report.json` and `native-mapping-report.json`.

- [ ] **Step 3: Remove mobile screenshot work from browser smoke**

In `packages/test-harness/src/browser-smoke.ts`, delete this block:

```ts
  await page.setViewportSize({ width: 390, height: 900 });
  await page.screenshot({
    path: join(artifactDir, "mobile.png"),
    fullPage: true,
  });
```

Keep the desktop screenshot block. Do not add a replacement mobile or tablet assertion.

- [ ] **Step 4: Keep native mapping contract but do not require initial bundle ADF**

In `packages/test-harness/src/browser-smoke.ts`, keep:

```ts
  assertEqual(
    nativeMapping.isConfluencePageBody,
    false,
    "Native mapping artifact must remain a report.",
  );
```

If `confluenceAdfDraft` remains available in lazy export output, keep the existing ADF draft assertions. If implementation intentionally omits the ADF draft from app export output, replace those assertions with:

```ts
  assertEqual(
    nativeMapping.isConfluencePageBody,
    false,
    "Native mapping artifact must remain a report.",
  );
  assertEqual(
    nativeMapping.artifactKind,
    "native-mapping-report",
    "Native mapping artifact should remain the MVP mapping report.",
  );
```

Do not weaken the report/plan wording assertion.

- [ ] **Step 5: Run smoke checks**

Run:

```bash
npm run app:smoke
npm run browser:smoke
```

Expected after implementation:

- `APP_SMOKE_PASS built app artifacts and canvas-first editor markers verified`
- `BROWSER_SMOKE_PASS real Chrome flow verified`

- [ ] **Step 6: Commit Task 3**

Run:

```bash
git add packages/test-harness/src/app-smoke.ts packages/test-harness/src/browser-smoke.ts
git commit -m "test: enforce browser bundle boundary"
```

## Task 4: Full Verification And Review Prep

**Files:**
- No planned source edits unless verification exposes a defect.

- [ ] **Step 1: Run the full acceptance gate**

Run:

```bash
npm run verify
npm run browser:smoke
```

Expected:

- `npm run verify` exits 0.
- `npm run browser:smoke` exits 0.
- Browser smoke saves desktop screenshot under `packages/test-harness/artifacts/browser-smoke/desktop.png`.

- [ ] **Step 2: Inspect built bundle for forbidden markers if smoke fails**

If `npm run app:smoke` fails, inspect the built bundle with:

```bash
node - <<'NODE'
const { readFileSync, readdirSync } = require("node:fs");
const { join } = require("node:path");
const assets = "packages/app/dist/assets";
const js = readdirSync(assets).find((name) => name.endsWith(".js"));
const content = readFileSync(join(assets, js), "utf8");
for (const marker of [
  "@atlaskit/adf-schema",
  "prosemirror",
  "nodeFromJSON",
  "confluenceAdfDraft",
  "https://app.grapesjs.com",
  "https://cdnjs.cloudflare.com",
]) {
  console.log(`${marker}: ${content.includes(marker)}`);
}
NODE
```

Use the result to identify whether the leak comes from app static imports, the broad core alias, or GrapesJS defaults.

- [ ] **Step 3: Prepare reviewer context**

Collect:

```bash
git log --oneline -5
git status --short
```

The status may still show local-only untracked `.codex/`, `.playwright-mcp/`, and `packages/test-harness/artifacts/`. Do not commit those unless explicitly asked.

## Subagent Execution Workflow

Use `superpowers:subagent-driven-development`.

### Worker A: Lazy Export Boundary

Role: `worker`; recommended model: standard coding model.

Owned files:

- `packages/core/src/browser.ts`
- `packages/core/src/document/types.ts`
- `packages/app/tsconfig.json`
- `packages/app/vite.config.ts`
- `packages/app/src/appModel.ts`
- `packages/app/src/main.ts`
- `packages/app/test/appModel.test.ts`

Prompt summary:

Implement Task 1 exactly. Do not edit GrapesJS adapter or smoke harness files. Do not add mobile/tablet functionality. Preserve core-backed export and keep `exportProject()` synchronous in core.

### Worker B: GrapesJS Runtime Hardening

Role: `worker`; recommended model: fast coding model.

Owned files:

- `packages/app/src/editor/grapesAdapter.ts`
- `packages/app/test/grapesAdapter.test.ts`

Prompt summary:

Implement Task 2 exactly. Explicitly disable GrapesJS telemetry and remote icon CSS. Do not expose default panels, blocks, layer manager, style manager, or builder features.

### Worker C: Smoke Contract Updates

Role: `worker`; recommended model: standard coding model after Worker A has landed.

Owned files:

- `packages/test-harness/src/app-smoke.ts`
- `packages/test-harness/src/browser-smoke.ts`

Prompt summary:

Implement Task 3 exactly after lazy export exists. Update smoke expectations so the initial bundle rejects schema-heavy and remote-runtime markers. Keep desktop browser export verification. Remove mobile screenshot work and do not add tablet/mobile assertions.

### Reviewers

Spec reviewer prompt:

Compare implementation against `docs/superpowers/specs/2026-06-23-browser-library-boundary-hardening-design.md` and this plan. Report missing requirements, extra scope, mobile/tablet leakage, export-contract drift, or Confluence publish/page-body claim leakage.

Code quality reviewer prompt:

Review the final diff for module-boundary correctness, Vite chunking risks, async UI race conditions, test weakness, accidental GrapesJS builder exposure, and uncommitted local-only artifacts.

## Self-Review Notes

Spec coverage:

- Initial bundle boundary: Task 1 and Task 3.
- Lazy export drawer: Task 1 and browser smoke in Task 3.
- GrapesJS telemetry/remote CSS: Task 2 and Task 3.
- Mobile/tablet cut: Scope Guard, Task 3, reviewer prompts.
- Verification: Task 4.

No planned step changes product export artifacts or claims native Confluence publishability.
