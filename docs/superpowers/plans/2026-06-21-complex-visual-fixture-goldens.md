# Complex Visual Fixture Goldens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a complex visual HTML fixture and deterministic golden artifact tests for the core MVP import/export contract.

**Architecture:** Keep the work inside `packages/core` and repo-level fixtures. The fixture is hand-authored safe visual HTML; `importHtml()` and `exportProject()` produce the four MVP artifacts, which are compared against reviewed files under `fixtures/expected/`.

**Tech Stack:** TypeScript, Vitest, Node.js built-ins, existing `@htmleditor/core` import/export APIs.

---

## Scope Check

This plan implements only the approved design in `docs/superpowers/specs/2026-06-21-complex-visual-fixture-goldens-design.md`.

It does not add browser screenshot comparison, `packages/test-harness`, Markdown import, Confluence API publishing, app UI, or new sanitizer risk categories.

## File Structure

- Create `packages/core/test/complex-visual-fixture.test.ts`: focused golden test for the complex visual fixture.
- Create `fixtures/html/complex-visual.html`: safe visual source fixture.
- Create `fixtures/expected/complex-visual.standalone.html`: reviewed standalone export golden.
- Create `fixtures/expected/complex-visual.confluence-fragment.html`: reviewed Confluence fragment golden.
- Create `fixtures/expected/complex-visual.compatibility-report.json`: reviewed compatibility report golden.
- Create `fixtures/expected/complex-visual.native-mapping-report.json`: reviewed native mapping report golden.
- Modify `docs/testing/fixture-catalog.md`: move complex visual fixture into implemented status.

## Task 1: Add The Failing Golden Test

**Files:**
- Create: `packages/core/test/complex-visual-fixture.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/core/test/complex-visual-fixture.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { exportProject } from "../src/export/exportProject.js";
import { importHtml } from "../src/import/htmlImport.js";
import type { ExportResult, NativeMappingReport } from "../src/index.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, "../../..");

const readFixture = (fixturePath: string) =>
  readFileSync(resolve(repoRoot, fixturePath), "utf8");

const normalizeLineEndings = (value: string) => value.replaceAll("\r\n", "\n");

const artifactContent = (
  result: ExportResult,
  filename: ExportResult["artifacts"][number]["filename"],
) => {
  const artifact = result.artifacts.find((item) => item.filename === filename);

  if (!artifact) {
    throw new Error(`Missing export artifact: ${filename}`);
  }

  return artifact.content;
};

describe("complex visual HTML fixture", () => {
  it("imports and exports reviewed golden artifacts", () => {
    const html = readFixture("fixtures/html/complex-visual.html");
    const doc = importHtml({
      html,
      title: "Complex Visual Fixture",
      now: "2026-06-21T00:00:00.000Z",
    });
    const result = exportProject(doc, {
      generatedAt: "2026-06-21T00:00:00.000Z",
      fragmentId: "complex-visual-fragment",
    });

    expect(html).toContain('class="visual-deck"');
    expect(html).toContain('class="comparison-grid"');
    expect(html).toContain('style="border-left: 4px solid #f59e0b;"');
    expect(result.artifacts.map((artifact) => artifact.filename)).toEqual([
      "standalone.html",
      "confluence-fragment.html",
      "compatibility-report.json",
      "native-mapping-report.json",
    ]);

    expect(normalizeLineEndings(artifactContent(result, "standalone.html"))).toBe(
      normalizeLineEndings(
        readFixture("fixtures/expected/complex-visual.standalone.html"),
      ),
    );
    expect(
      normalizeLineEndings(artifactContent(result, "confluence-fragment.html")),
    ).toBe(
      normalizeLineEndings(
        readFixture("fixtures/expected/complex-visual.confluence-fragment.html"),
      ),
    );
    expect(JSON.parse(artifactContent(result, "compatibility-report.json"))).toEqual(
      JSON.parse(
        readFixture(
          "fixtures/expected/complex-visual.compatibility-report.json",
        ),
      ),
    );
    expect(JSON.parse(artifactContent(result, "native-mapping-report.json"))).toEqual(
      JSON.parse(
        readFixture(
          "fixtures/expected/complex-visual.native-mapping-report.json",
        ),
      ),
    );

    const nativeReport = JSON.parse(
      artifactContent(result, "native-mapping-report.json"),
    ) as NativeMappingReport;

    expect(nativeReport.isConfluencePageBody).toBe(false);
    expect(
      nativeReport.mappings.some(
        (mapping) =>
          mapping.recommendedTarget === "fragment" ||
          mapping.expectedVisualLoss === "material",
      ),
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
npm test --workspace @htmleditor/core -- complex-visual-fixture.test.ts
```

Expected: FAIL because `fixtures/html/complex-visual.html` and the expected golden files do not exist yet.

- [ ] **Step 3: Keep the failing test unstaged until the fixture exists**

Run:

```bash
git status --short
```

Expected: `packages/core/test/complex-visual-fixture.test.ts` appears as an untracked file. Do not commit this failing test by itself.

## Task 2: Add The Complex Visual Fixture And Reviewed Goldens

**Files:**
- Create: `fixtures/html/complex-visual.html`
- Create: `fixtures/expected/complex-visual.standalone.html`
- Create: `fixtures/expected/complex-visual.confluence-fragment.html`
- Create: `fixtures/expected/complex-visual.compatibility-report.json`
- Create: `fixtures/expected/complex-visual.native-mapping-report.json`

- [ ] **Step 1: Add the safe visual HTML fixture**

Create `fixtures/html/complex-visual.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Complex Visual Fixture</title>
    <style>
      :root {
        color: #182033;
        background: #eef2f7;
        font-family: Inter, Arial, sans-serif;
      }

      body {
        margin: 0;
      }

      .visual-deck {
        min-height: 100%;
        padding: 40px;
        background: #eef2f7;
      }

      .visual-frame {
        max-width: 1040px;
        margin: 0 auto;
        background: #ffffff;
        border: 1px solid #d7deea;
      }

      .hero-band {
        padding: 36px 40px;
        background: #14213d;
        color: #ffffff;
      }

      .metric-strip {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
        padding: 20px 40px;
        background: #f8fafc;
      }

      .metric-card {
        padding: 18px;
        border: 1px solid #d7deea;
        background: #ffffff;
      }

      .metric-card strong {
        display: block;
        margin-bottom: 6px;
        color: #2563eb;
        font-size: 28px;
      }

      .comparison-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        padding: 32px 40px;
      }

      .comparison-column {
        padding: 22px;
        border: 1px solid #d7deea;
        background: #fbfdff;
      }

      .timeline {
        padding: 0 40px 36px;
      }

      .timeline-item {
        display: grid;
        grid-template-columns: 120px 1fr;
        gap: 16px;
        padding: 14px 0;
        border-top: 1px solid #d7deea;
      }

      .status-pill {
        display: inline-block;
        padding: 4px 10px;
        background: #dcfce7;
        color: #166534;
      }
    </style>
  </head>
  <body>
    <main class="visual-deck">
      <section class="visual-frame">
        <header class="hero-band">
          <p>Portfolio review</p>
          <h1>Complex Visual Fixture</h1>
          <p>A safe imported HTML document with nested presentation layout, preserved styles, and visually rich unmapped structures.</p>
        </header>
        <section class="metric-strip" aria-label="Program metrics">
          <article class="metric-card">
            <strong>64%</strong>
            <span>Workflow coverage across priority teams</span>
          </article>
          <article class="metric-card">
            <strong>12</strong>
            <span>Reusable templates prepared for operators</span>
          </article>
          <article class="metric-card">
            <strong>4</strong>
            <span>Systems ready for constrained rollout</span>
          </article>
        </section>
        <section class="comparison-grid" aria-label="Before and after comparison">
          <article class="comparison-column">
            <h2>Before</h2>
            <ul>
              <li>Manual copy into scattered docs</li>
              <li>Unclear export expectations</li>
              <li>Review comments detached from visual context</li>
            </ul>
          </article>
          <article class="comparison-column">
            <h2>After</h2>
            <ul>
              <li>One material source with export profiles</li>
              <li>Explicit compatibility reports</li>
              <li>Visual preservation checked by fixture goldens</li>
            </ul>
          </article>
        </section>
        <aside class="callout" style="border-left: 4px solid #f59e0b;">
          <strong>Mapping note</strong>
          <p>This callout is intentionally preserved as visual HTML until a native Confluence mapping is verified.</p>
        </aside>
        <section class="timeline" aria-label="Rollout timeline">
          <div class="timeline-item">
            <strong>Week 1</strong>
            <span>Import fixture and lock artifact outputs.</span>
          </div>
          <div class="timeline-item">
            <strong>Week 2</strong>
            <span>Add browser screenshot harness after core contracts settle. <span class="status-pill">planned</span></span>
          </div>
        </section>
      </section>
    </main>
  </body>
</html>
```

- [ ] **Step 2: Generate candidate golden files from the current exporter**

Run this one-off command from the repo root. It compiles the core package to `/tmp` first so Node imports JavaScript rather than TypeScript source:

```bash
rm -rf /tmp/htmleditor-core-golden-build
npm exec -- tsc -p packages/core/tsconfig.json --outDir /tmp/htmleditor-core-golden-build
node --input-type=module <<'EOF'
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { exportProject, importHtml } from "/tmp/htmleditor-core-golden-build/src/index.js";

const repoRoot = process.cwd();
const html = readFileSync(resolve(repoRoot, "fixtures/html/complex-visual.html"), "utf8");
const doc = importHtml({
  html,
  title: "Complex Visual Fixture",
  now: "2026-06-21T00:00:00.000Z",
});
const result = exportProject(doc, {
  generatedAt: "2026-06-21T00:00:00.000Z",
  fragmentId: "complex-visual-fragment",
});

mkdirSync(resolve(repoRoot, "fixtures/expected"), { recursive: true });

for (const artifact of result.artifacts) {
  const suffix =
    artifact.filename === "standalone.html"
      ? "standalone.html"
      : artifact.filename === "confluence-fragment.html"
        ? "confluence-fragment.html"
        : artifact.filename === "compatibility-report.json"
          ? "compatibility-report.json"
          : "native-mapping-report.json";

  writeFileSync(
    resolve(repoRoot, `fixtures/expected/complex-visual.${suffix}`),
    `${artifact.content}\n`,
    "utf8",
  );
}
EOF
```

Expected: PASS and create the four `fixtures/expected/complex-visual.*` files.

- [ ] **Step 3: Review the generated golden files before testing**

Run:

```bash
rg -n "https?://|<script|onload=|onclick=|javascript:|isConfluencePageBody|recommendedTarget|expectedVisualLoss|visual-deck|comparison-grid|border-left" fixtures/html/complex-visual.html fixtures/expected/complex-visual.*
```

Expected:

```text
fixtures/html/complex-visual.html contains visual-deck, comparison-grid, and border-left.
fixtures/expected/complex-visual.standalone.html contains visual-deck, comparison-grid, and border-left.
fixtures/expected/complex-visual.confluence-fragment.html contains visual-deck, comparison-grid, and border-left.
fixtures/expected/complex-visual.native-mapping-report.json contains isConfluencePageBody, recommendedTarget, and expectedVisualLoss.
No file contains https://, http://, <script, onload=, onclick=, or javascript:.
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run:

```bash
npm test --workspace @htmleditor/core -- complex-visual-fixture.test.ts
```

Expected: PASS with `complex-visual-fixture.test.ts`.

- [ ] **Step 5: Commit fixture and golden files**

Run:

```bash
git add packages/core/test/complex-visual-fixture.test.ts fixtures/html/complex-visual.html fixtures/expected/complex-visual.standalone.html fixtures/expected/complex-visual.confluence-fragment.html fixtures/expected/complex-visual.compatibility-report.json fixtures/expected/complex-visual.native-mapping-report.json
git commit -m "test: add complex visual fixture goldens"
```

## Task 3: Update Fixture Catalog

**Files:**
- Modify: `docs/testing/fixture-catalog.md`

- [ ] **Step 1: Update implemented fixture status**

Edit `docs/testing/fixture-catalog.md` so the `Implemented Fixture Status` section reads:

```md
## Implemented Fixture Status

The first core vertical slice implements:

- `fixtures/html/simple-ai-deck.html`
- `fixtures/hostile/script-and-remote-assets.html`
- `fixtures/expected/hostile-compatibility-rules.json`

The complex visual golden slice implements:

- `fixtures/html/complex-visual.html`
- `fixtures/expected/complex-visual.standalone.html`
- `fixtures/expected/complex-visual.confluence-fragment.html`
- `fixtures/expected/complex-visual.compatibility-report.json`
- `fixtures/expected/complex-visual.native-mapping-report.json`

The remaining catalog fixtures are outside the implemented core slices and require separate implementation plans:

- `fixtures/markdown/product-outline.md`
- `fixtures/html/confluence-friendly.html`
```

- [ ] **Step 2: Run a documentation sanity check**

Run:

```bash
rg -n "complex-visual|product-outline|confluence-friendly|Implemented Fixture Status" docs/testing/fixture-catalog.md
```

Expected: PASS and show `complex-visual` under implemented status, with only Markdown outline and Confluence-friendly doc remaining.

- [ ] **Step 3: Commit the docs update**

Run:

```bash
git add docs/testing/fixture-catalog.md
git commit -m "docs: mark complex visual fixture implemented"
```

## Task 4: Final Verification

**Files:**
- Verify: all files changed in Tasks 1-3

- [ ] **Step 1: Run full verification**

Run:

```bash
npm run verify
```

Expected: PASS. TypeScript typecheck succeeds and the Vitest suite passes.

- [ ] **Step 2: Confirm the final working tree**

Run:

```bash
git status --short
```

Expected: only pre-existing untracked `.codex/` appears, or no output if `.codex/` has been intentionally ignored outside this task.

- [ ] **Step 3: Record final result**

In the final status, report:

```text
npm run verify passed.
Added complex visual fixture and four reviewed expected export artifacts.
Updated fixture catalog implemented status.
```

## Self-Review

- Spec coverage: The plan adds the fixture, four expected artifacts, focused golden tests, line-ending normalization, JSON semantic comparison, native mapping assertions, fixture catalog update, and `npm run verify`.
- Placeholder scan: No placeholders, deferred implementation notes, or unresolved file paths are present.
- Type consistency: The test uses existing exported types `ExportResult` and `NativeMappingReport`, existing APIs `importHtml()` and `exportProject()`, and existing artifact filenames.
