# MVP Foundation Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working core slice: import a static HTML fixture, sanitize executable risks, preserve safe render structure/CSS, and emit the four MVP export artifacts.

**Architecture:** Start with `packages/core` only and keep product logic deterministic. The slice creates `ProjectDoc`, compatibility rules, sanitizer, HTML import, standalone HTML export, Confluence fragment export, and native mapping report generation; `packages/app` is intentionally out of scope.

**Tech Stack:** TypeScript, npm workspaces, Vitest, parse5 for HTML parsing/serialization, Node.js built-ins for fixture IO.

---

## Scope Check

This plan implements only the first core vertical slice. It does not build the visual editor UI, React app, screenshot harness, Confluence API publishing, Forge macro packaging, or live browser visual diff runner.

This slice is still useful on its own because it proves the document model, source artifact handling, sanitizer/reporting contract, and export artifact contract against real fixtures.

## File Structure

- Create `package.json`: root npm workspace scripts and dev dependencies.
- Create `tsconfig.base.json`: shared TypeScript compiler settings.
- Create `packages/core/package.json`: core package scripts.
- Create `packages/core/tsconfig.json`: core TypeScript config.
- Create `packages/core/vitest.config.ts`: Vitest config.
- Create `packages/core/src/document/types.ts`: domain model types for `ProjectDoc`, `RenderNode`, reports, and artifacts.
- Create `packages/core/src/compatibility/rules.ts`: stable compatibility rule catalog.
- Create `packages/core/src/sanitize/sanitizeHtml.ts`: deterministic sanitizer classification and removal helpers.
- Create `packages/core/src/import/htmlImport.ts`: HTML import to `ProjectDoc`.
- Create `packages/core/src/export/standaloneHtml.ts`: `standalone.html` exporter.
- Create `packages/core/src/export/confluenceFragment.ts`: `confluence-fragment.html` exporter.
- Create `packages/core/src/export/nativeMappingReport.ts`: `native-mapping-report.json` exporter.
- Create `packages/core/src/export/exportProject.ts`: combined export entry point.
- Create `packages/core/src/index.ts`: public core API.
- Create `packages/core/test/*.test.ts`: focused tests per component.
- Create `fixtures/html/simple-ai-deck.html`: supported static fixture.
- Create `fixtures/hostile/script-and-remote-assets.html`: sanitizer/risk fixture.
- Create `fixtures/expected/*.json`: expected reports used by tests.

## Task 1: Workspace And Test Harness Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/vitest.config.ts`

- [ ] **Step 1: Create the failing workspace smoke test**

Create `packages/core/test/workspace-smoke.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { CORE_PACKAGE_NAME } from "../src/index";

describe("core package", () => {
  it("exports its package name", () => {
    expect(CORE_PACKAGE_NAME).toBe("@htmleditor/core");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test --workspace @htmleditor/core -- workspace-smoke.test.ts
```

Expected: FAIL because the npm workspace and `../src/index` do not exist yet.

- [ ] **Step 3: Add root workspace configuration**

Create `package.json`:

```json
{
  "name": "htmleditor",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "workspaces": [
    "packages/core"
  ],
  "scripts": {
    "test": "npm test --workspaces",
    "typecheck": "npm run typecheck --workspaces",
    "verify": "npm run typecheck --workspaces && npm test --workspaces"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  },
  "dependencies": {
    "parse5": "^7.1.2"
  }
}
```

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true
  }
}
```

Create `packages/core/package.json`:

```json
{
  "name": "@htmleditor/core",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "parse5": "^7.1.2"
  },
  "devDependencies": {
    "vitest": "^2.0.0",
    "typescript": "^5.5.0",
    "@types/node": "^22.0.0"
  }
}
```

Create `packages/core/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": ".",
    "outDir": "dist",
    "types": [
      "node",
      "vitest"
    ]
  },
  "include": [
    "src/**/*.ts",
    "test/**/*.ts",
    "vitest.config.ts"
  ]
}
```

Create `packages/core/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
```

Create `packages/core/src/index.ts`:

```ts
export const CORE_PACKAGE_NAME = "@htmleditor/core";
```

- [ ] **Step 4: Install dependencies**

Run:

```bash
npm install
```

Expected: PASS and create `package-lock.json`.

- [ ] **Step 5: Run the smoke test**

Run:

```bash
npm test --workspace @htmleditor/core -- workspace-smoke.test.ts
```

Expected: PASS with 1 test.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.base.json packages/core/package.json packages/core/tsconfig.json packages/core/vitest.config.ts packages/core/src/index.ts packages/core/test/workspace-smoke.test.ts
git commit -m "chore: scaffold core workspace"
```

## Task 2: Document Model Types

**Files:**
- Create: `packages/core/src/document/types.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/test/document-types.test.ts`

- [ ] **Step 1: Write the failing type behavior test**

Create `packages/core/test/document-types.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { ProjectDoc, RenderNode } from "../src/document/types";

const root: RenderNode = {
  id: "node-root",
  tag: "main",
  attrs: {},
  classList: ["deck"],
  inlineStyle: {},
  children: [],
};

describe("ProjectDoc model", () => {
  it("stores source artifact, render tree, semantic overlay, assets, trace, and profiles", () => {
    const doc: ProjectDoc = {
      version: "0.1.0",
      title: "Demo",
      sourceArtifact: {
        id: "source-1",
        kind: "html",
        originalBytesHash: "hash-123",
        content: "<main></main>",
        createdAt: "2026-06-20T00:00:00.000Z",
      },
      themeTokens: {
        colors: { background: "#ffffff", text: "#111111", accent: "#2563eb" },
        fontStack: "Inter, system-ui, sans-serif",
        spacingScale: "comfortable",
        radius: "8px",
        shadow: "soft",
      },
      renderTree: root,
      semanticOverlay: [],
      assets: [],
      transformationTrace: [],
      exportProfiles: [],
    };

    expect(doc.sourceArtifact?.kind).toBe("html");
    expect(doc.renderTree.id).toBe("node-root");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test --workspace @htmleditor/core -- document-types.test.ts
```

Expected: FAIL because `packages/core/src/document/types.ts` does not exist.

- [ ] **Step 3: Add the model types**

Create `packages/core/src/document/types.ts`:

```ts
export type SourceArtifactKind = "html" | "markdown" | "outline" | "template";

export type SourceArtifact = {
  id: string;
  kind: SourceArtifactKind;
  originalBytesHash: string;
  content: string;
  createdAt: string;
};

export type ThemeTokens = {
  colors: {
    background: string;
    text: string;
    accent: string;
  };
  fontStack: string;
  spacingScale: "compact" | "comfortable" | "spacious";
  radius: string;
  shadow: "none" | "soft" | "strong";
};

export type SourceMeta = {
  sourceNodeName: string;
  sourcePath: string;
};

export type RenderNode = {
  id: string;
  tag: string;
  attrs: Record<string, string>;
  classList: string[];
  inlineStyle: Record<string, string>;
  children: RenderNode[];
  text?: string;
  locked?: boolean;
  sourceMeta?: SourceMeta;
};

export type SemanticRole =
  | "document"
  | "section"
  | "title"
  | "paragraph"
  | "image"
  | "list"
  | "table"
  | "cardGrid"
  | "comparison"
  | "timeline"
  | "callout"
  | "status"
  | "panel"
  | "expand"
  | "code"
  | "canvasGroup"
  | "rawHtml";

export type ExportTarget = "standalone-html" | "confluence-fragment" | "native-mapping";

export type CompatibilitySeverity = "info" | "warning" | "error";

export type CompatibilityWarning = {
  ruleId: string;
  target: ExportTarget;
  severity: CompatibilitySeverity;
  nodeId?: string;
  message: string;
  recommendation: string;
};

export type ConfluenceMapping = {
  recommendedTarget: "native" | "macro" | "fragment" | "future-iframe";
  expectedVisualLoss: "none" | "minor" | "material" | "unknown";
  rationale: string;
};

export type SemanticOverlayEntry = {
  nodeId: string;
  role: SemanticRole;
  editableFields: string[];
  confluenceMapping: ConfluenceMapping;
  warnings: CompatibilityWarning[];
};

export type Asset = {
  id: string;
  kind: "image" | "font" | "stylesheet" | "script" | "embed";
  originalRef: string;
  status: "local" | "embedded" | "remote-unresolved" | "removed";
};

export type TransformationTraceEntry = {
  id: string;
  stage: "import" | "sanitize" | "normalize" | "edit" | "export";
  ruleId?: string;
  nodeId?: string;
  message: string;
  createdAt: string;
};

export type ExportProfile = {
  id: string;
  target: ExportTarget;
  label: string;
};

export type ProjectDoc = {
  version: string;
  title: string;
  sourceArtifact?: SourceArtifact;
  themeTokens: ThemeTokens;
  renderTree: RenderNode;
  semanticOverlay: SemanticOverlayEntry[];
  assets: Asset[];
  transformationTrace: TransformationTraceEntry[];
  exportProfiles: ExportProfile[];
};

export type ExportArtifact = {
  filename: "standalone.html" | "confluence-fragment.html" | "compatibility-report.json" | "native-mapping-report.json";
  mediaType: "text/html" | "application/json";
  content: string;
};

export type CompatibilityReport = {
  documentVersion: string;
  generatedAt: string;
  warnings: CompatibilityWarning[];
};

export type ExportResult = {
  artifacts: ExportArtifact[];
  compatibilityReport: CompatibilityReport;
};
```

Modify `packages/core/src/index.ts`:

```ts
export const CORE_PACKAGE_NAME = "@htmleditor/core";

export type {
  Asset,
  CompatibilityReport,
  CompatibilitySeverity,
  CompatibilityWarning,
  ConfluenceMapping,
  ExportArtifact,
  ExportProfile,
  ExportResult,
  ExportTarget,
  ProjectDoc,
  RenderNode,
  SemanticOverlayEntry,
  SemanticRole,
  SourceArtifact,
  SourceArtifactKind,
  ThemeTokens,
  TransformationTraceEntry,
} from "./document/types";
```

- [ ] **Step 4: Run the model test**

Run:

```bash
npm test --workspace @htmleditor/core -- document-types.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run typecheck**

Run:

```bash
npm run typecheck --workspace @htmleditor/core
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/document/types.ts packages/core/src/index.ts packages/core/test/document-types.test.ts
git commit -m "feat: define core document model"
```

## Task 3: Compatibility Rule Catalog

**Files:**
- Create: `packages/core/src/compatibility/rules.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/test/compatibility-rules.test.ts`

- [ ] **Step 1: Write the failing rule catalog test**

Create `packages/core/test/compatibility-rules.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getCompatibilityRule, listCompatibilityRules } from "../src/compatibility/rules";

describe("compatibility rule catalog", () => {
  it("contains stable MVP rule IDs", () => {
    const ids = listCompatibilityRules().map((rule) => rule.id);

    expect(ids).toEqual([
      "HTML_REMOTE_RESOURCE",
      "HTML_SCRIPT_REMOVED",
      "HTML_INLINE_HANDLER_REMOVED",
      "HTML_JAVASCRIPT_URL",
      "CF_FRAGMENT_FIXED_POSITION",
      "CF_FRAGMENT_VIEWPORT_UNIT",
      "CF_FRAGMENT_GLOBAL_SELECTOR",
      "CF_FRAGMENT_OVERFLOW_RISK",
      "CF_NATIVE_UNMAPPED_LAYOUT",
      "CF_NATIVE_VISUAL_LOSS",
    ]);
  });

  it("returns a copy so callers cannot mutate the catalog", () => {
    const first = listCompatibilityRules();
    first.pop();

    expect(listCompatibilityRules()).toHaveLength(10);
    expect(getCompatibilityRule("HTML_SCRIPT_REMOVED")?.severity).toBe("warning");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test --workspace @htmleditor/core -- compatibility-rules.test.ts
```

Expected: FAIL because `compatibility/rules.ts` does not exist.

- [ ] **Step 3: Add the rule catalog**

Create `packages/core/src/compatibility/rules.ts`:

```ts
import type { CompatibilitySeverity, ExportTarget } from "../document/types";

export type CompatibilityRule = {
  id:
    | "HTML_REMOTE_RESOURCE"
    | "HTML_SCRIPT_REMOVED"
    | "HTML_INLINE_HANDLER_REMOVED"
    | "HTML_JAVASCRIPT_URL"
    | "CF_FRAGMENT_FIXED_POSITION"
    | "CF_FRAGMENT_VIEWPORT_UNIT"
    | "CF_FRAGMENT_GLOBAL_SELECTOR"
    | "CF_FRAGMENT_OVERFLOW_RISK"
    | "CF_NATIVE_UNMAPPED_LAYOUT"
    | "CF_NATIVE_VISUAL_LOSS";
  target: ExportTarget;
  severity: CompatibilitySeverity;
  detector: string;
  message: string;
  recommendation: string;
};

const RULES: CompatibilityRule[] = [
  {
    id: "HTML_REMOTE_RESOURCE",
    target: "standalone-html",
    severity: "warning",
    detector: "src or href points to http or https",
    message: "Output depends on a remote resource.",
    recommendation: "Replace with a local asset or embedded data.",
  },
  {
    id: "HTML_SCRIPT_REMOVED",
    target: "standalone-html",
    severity: "warning",
    detector: "script element found",
    message: "Imported script is excluded in MVP.",
    recommendation: "Replace behavior with a supported declarative block in a separate interaction model.",
  },
  {
    id: "HTML_INLINE_HANDLER_REMOVED",
    target: "standalone-html",
    severity: "warning",
    detector: "attribute name starts with on",
    message: "Inline event handler is excluded in MVP.",
    recommendation: "Remove interaction or model it as a future widget.",
  },
  {
    id: "HTML_JAVASCRIPT_URL",
    target: "standalone-html",
    severity: "error",
    detector: "href or src starts with javascript:",
    message: "JavaScript URL is unsafe and unsupported.",
    recommendation: "Replace with a safe URL or remove the link.",
  },
  {
    id: "CF_FRAGMENT_FIXED_POSITION",
    target: "confluence-fragment",
    severity: "warning",
    detector: "CSS position fixed",
    message: "Fixed positioning may render incorrectly in Confluence containers.",
    recommendation: "Use normal flow or absolute positioning inside a bounded section.",
  },
  {
    id: "CF_FRAGMENT_VIEWPORT_UNIT",
    target: "confluence-fragment",
    severity: "warning",
    detector: "CSS viewport unit",
    message: "Viewport units may not match Confluence content area.",
    recommendation: "Use container-relative sizing where possible.",
  },
  {
    id: "CF_FRAGMENT_GLOBAL_SELECTOR",
    target: "confluence-fragment",
    severity: "warning",
    detector: "global CSS selector",
    message: "Global selectors can leak or be overridden.",
    recommendation: "Scope selectors under the generated wrapper.",
  },
  {
    id: "CF_FRAGMENT_OVERFLOW_RISK",
    target: "confluence-fragment",
    severity: "warning",
    detector: "overflow or wide fixed width",
    message: "Content may clip or scroll in Confluence.",
    recommendation: "Add responsive constraints.",
  },
  {
    id: "CF_NATIVE_UNMAPPED_LAYOUT",
    target: "native-mapping",
    severity: "info",
    detector: "visual layout has no native equivalent",
    message: "This block has no safe native Confluence mapping.",
    recommendation: "Keep as fragment or future iframe/Forge target.",
  },
  {
    id: "CF_NATIVE_VISUAL_LOSS",
    target: "native-mapping",
    severity: "warning",
    detector: "native mapping changes layout or styling materially",
    message: "Native mapping will not preserve visual appearance.",
    recommendation: "Use HTML fragment if visual fidelity is more important.",
  },
];

export function listCompatibilityRules(): CompatibilityRule[] {
  return RULES.map((rule) => ({ ...rule }));
}

export function getCompatibilityRule(ruleId: CompatibilityRule["id"]): CompatibilityRule | undefined {
  const rule = RULES.find((candidate) => candidate.id === ruleId);
  return rule ? { ...rule } : undefined;
}
```

Modify `packages/core/src/index.ts`:

```ts
export const CORE_PACKAGE_NAME = "@htmleditor/core";

export { getCompatibilityRule, listCompatibilityRules } from "./compatibility/rules";
export type { CompatibilityRule } from "./compatibility/rules";

export type {
  Asset,
  CompatibilityReport,
  CompatibilitySeverity,
  CompatibilityWarning,
  ConfluenceMapping,
  ExportArtifact,
  ExportProfile,
  ExportResult,
  ExportTarget,
  ProjectDoc,
  RenderNode,
  SemanticOverlayEntry,
  SemanticRole,
  SourceArtifact,
  SourceArtifactKind,
  ThemeTokens,
  TransformationTraceEntry,
} from "./document/types";
```

- [ ] **Step 4: Run the rule tests**

Run:

```bash
npm test --workspace @htmleditor/core -- compatibility-rules.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/compatibility/rules.ts packages/core/src/index.ts packages/core/test/compatibility-rules.test.ts
git commit -m "feat: add compatibility rule catalog"
```

## Task 4: Fixtures For Supported And Hostile HTML

**Files:**
- Create: `fixtures/html/simple-ai-deck.html`
- Create: `fixtures/hostile/script-and-remote-assets.html`
- Create: `fixtures/expected/hostile-compatibility-rules.json`
- Test: `packages/core/test/fixtures.test.ts`

- [ ] **Step 1: Write the failing fixture existence test**

Create `packages/core/test/fixtures.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(import.meta.dirname, "../../..");

function readFixture(path: string): string {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

describe("MVP fixtures", () => {
  it("has a simple static HTML deck fixture", () => {
    const html = readFixture("fixtures/html/simple-ai-deck.html");

    expect(html).toContain("<section");
    expect(html).toContain("Quarterly Product Review");
    expect(html).toContain("<style>");
  });

  it("has a hostile fixture and expected rule IDs", () => {
    const html = readFixture("fixtures/hostile/script-and-remote-assets.html");
    const expected = JSON.parse(readFixture("fixtures/expected/hostile-compatibility-rules.json")) as {
      ruleIds: string[];
    };

    expect(html).toContain("<script>");
    expect(html).toContain("onclick=");
    expect(expected.ruleIds).toEqual([
      "HTML_REMOTE_RESOURCE",
      "HTML_SCRIPT_REMOVED",
      "HTML_INLINE_HANDLER_REMOVED",
      "HTML_JAVASCRIPT_URL",
    ]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test --workspace @htmleditor/core -- fixtures.test.ts
```

Expected: FAIL because fixture files do not exist.

- [ ] **Step 3: Add the fixtures**

Create `fixtures/html/simple-ai-deck.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Quarterly Product Review</title>
    <style>
      :root {
        color: #172033;
        background: #f7f9fc;
        font-family: Inter, system-ui, sans-serif;
      }
      .deck {
        max-width: 1120px;
        margin: 0 auto;
        padding: 48px;
      }
      .hero {
        display: grid;
        grid-template-columns: 1.2fr 0.8fr;
        gap: 24px;
        border-radius: 18px;
        background: #ffffff;
        box-shadow: 0 18px 45px rgba(30, 41, 59, 0.12);
      }
      .metric-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 16px;
      }
      .metric {
        border: 1px solid #d8e0ec;
        border-radius: 14px;
        padding: 18px;
      }
    </style>
  </head>
  <body>
    <main class="deck">
      <section class="hero" style="padding: 40px;">
        <div>
          <p>Internal briefing</p>
          <h1>Quarterly Product Review</h1>
          <p>Decision-ready summary for product, engineering, and operations.</p>
        </div>
        <div class="metric-grid">
          <article class="metric">
            <h2>42%</h2>
            <p>Activation lift</p>
          </article>
          <article class="metric">
            <h2>18</h2>
            <p>Open risks</p>
          </article>
          <article class="metric">
            <h2>7</h2>
            <p>Launch blockers</p>
          </article>
        </div>
      </section>
    </main>
  </body>
</html>
```

Create `fixtures/hostile/script-and-remote-assets.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Hostile Import</title>
    <link rel="stylesheet" href="https://cdn.example.com/theme.css">
    <script>window.evil = true;</script>
  </head>
  <body onload="stealSession()">
    <main>
      <section>
        <h1 onclick="alert('xss')">Unsafe Deck</h1>
        <img src="https://cdn.example.com/chart.png" alt="Remote chart">
        <a href="javascript:alert('xss')">Bad link</a>
      </section>
    </main>
  </body>
</html>
```

Create `fixtures/expected/hostile-compatibility-rules.json`:

```json
{
  "ruleIds": [
    "HTML_REMOTE_RESOURCE",
    "HTML_SCRIPT_REMOVED",
    "HTML_INLINE_HANDLER_REMOVED",
    "HTML_JAVASCRIPT_URL"
  ]
}
```

- [ ] **Step 4: Run the fixture tests**

Run:

```bash
npm test --workspace @htmleditor/core -- fixtures.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add fixtures/html/simple-ai-deck.html fixtures/hostile/script-and-remote-assets.html fixtures/expected/hostile-compatibility-rules.json packages/core/test/fixtures.test.ts
git commit -m "test: add mvp import fixtures"
```

## Task 5: Sanitizer Classification

**Files:**
- Create: `packages/core/src/sanitize/sanitizeHtml.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/test/sanitize-html.test.ts`

- [ ] **Step 1: Write the failing sanitizer test**

Create `packages/core/test/sanitize-html.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "../src/sanitize/sanitizeHtml";

describe("sanitizeHtml", () => {
  it("removes executable script and inline handlers while preserving safe structure", () => {
    const result = sanitizeHtml(`
      <main onclick="bad()">
        <h1>Hello</h1>
        <script>alert("x")</script>
        <a href="javascript:alert('x')">Bad</a>
        <img src="https://cdn.example.com/image.png" alt="Remote">
      </main>
    `);

    expect(result.html).toContain("<main>");
    expect(result.html).toContain("<h1>Hello</h1>");
    expect(result.html).not.toContain("<script>");
    expect(result.html).not.toContain("onclick=");
    expect(result.html).not.toContain("javascript:");
    expect(result.warnings.map((warning) => warning.ruleId)).toEqual([
      "HTML_INLINE_HANDLER_REMOVED",
      "HTML_SCRIPT_REMOVED",
      "HTML_JAVASCRIPT_URL",
      "HTML_REMOTE_RESOURCE",
    ]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test --workspace @htmleditor/core -- sanitize-html.test.ts
```

Expected: FAIL because `sanitizeHtml` does not exist.

- [ ] **Step 3: Add sanitizer implementation**

Create `packages/core/src/sanitize/sanitizeHtml.ts`:

```ts
import * as parse5 from "parse5";
import type { DefaultTreeAdapterMap } from "parse5";
import type { CompatibilityWarning } from "../document/types";
import { getCompatibilityRule } from "../compatibility/rules";

type ElementNode = DefaultTreeAdapterMap["element"];
type Node = DefaultTreeAdapterMap["node"];
type ParentNode = DefaultTreeAdapterMap["parentNode"];

export type SanitizedHtml = {
  html: string;
  warnings: CompatibilityWarning[];
};

function warning(ruleId: "HTML_REMOTE_RESOURCE" | "HTML_SCRIPT_REMOVED" | "HTML_INLINE_HANDLER_REMOVED" | "HTML_JAVASCRIPT_URL"): CompatibilityWarning {
  const rule = getCompatibilityRule(ruleId);
  if (!rule) {
    throw new Error(`Missing compatibility rule: ${ruleId}`);
  }
  return {
    ruleId: rule.id,
    target: rule.target,
    severity: rule.severity,
    message: rule.message,
    recommendation: rule.recommendation,
  };
}

function isElement(node: Node): node is ElementNode {
  return "tagName" in node;
}

function hasChildNodes(node: Node): node is ParentNode {
  return "childNodes" in node && Array.isArray(node.childNodes);
}

function isRemoteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

function isJavascriptUrl(value: string): boolean {
  return /^javascript:/i.test(value.trim());
}

function dedupeWarnings(warnings: CompatibilityWarning[]): CompatibilityWarning[] {
  const seen = new Set<string>();
  return warnings.filter((item) => {
    if (seen.has(item.ruleId)) {
      return false;
    }
    seen.add(item.ruleId);
    return true;
  });
}

function sanitizeNode(node: Node, warnings: CompatibilityWarning[]): boolean {
  if (isElement(node) && node.tagName.toLowerCase() === "script") {
    warnings.push(warning("HTML_SCRIPT_REMOVED"));
    return false;
  }

  if (isElement(node)) {
    node.attrs = node.attrs.filter((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value;

      if (name.startsWith("on")) {
        warnings.push(warning("HTML_INLINE_HANDLER_REMOVED"));
        return false;
      }

      if ((name === "href" || name === "src") && isJavascriptUrl(value)) {
        warnings.push(warning("HTML_JAVASCRIPT_URL"));
        return false;
      }

      if ((name === "href" || name === "src") && isRemoteUrl(value)) {
        warnings.push(warning("HTML_REMOTE_RESOURCE"));
      }

      return true;
    });
  }

  if (hasChildNodes(node)) {
    node.childNodes = node.childNodes.filter((child) => sanitizeNode(child, warnings));
  }

  return true;
}

export function sanitizeHtml(input: string): SanitizedHtml {
  const fragment = parse5.parseFragment(input);
  const warnings: CompatibilityWarning[] = [];

  sanitizeNode(fragment, warnings);

  return {
    html: parse5.serialize(fragment),
    warnings: dedupeWarnings(warnings),
  };
}
```

Modify `packages/core/src/index.ts`:

```ts
export const CORE_PACKAGE_NAME = "@htmleditor/core";

export { getCompatibilityRule, listCompatibilityRules } from "./compatibility/rules";
export type { CompatibilityRule } from "./compatibility/rules";
export { sanitizeHtml } from "./sanitize/sanitizeHtml";
export type { SanitizedHtml } from "./sanitize/sanitizeHtml";

export type {
  Asset,
  CompatibilityReport,
  CompatibilitySeverity,
  CompatibilityWarning,
  ConfluenceMapping,
  ExportArtifact,
  ExportProfile,
  ExportResult,
  ExportTarget,
  ProjectDoc,
  RenderNode,
  SemanticOverlayEntry,
  SemanticRole,
  SourceArtifact,
  SourceArtifactKind,
  ThemeTokens,
  TransformationTraceEntry,
} from "./document/types";
```

- [ ] **Step 4: Run sanitizer tests**

Run:

```bash
npm test --workspace @htmleditor/core -- sanitize-html.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run typecheck**

Run:

```bash
npm run typecheck --workspace @htmleditor/core
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/sanitize/sanitizeHtml.ts packages/core/src/index.ts packages/core/test/sanitize-html.test.ts
git commit -m "feat: classify and sanitize imported html risks"
```

## Task 6: HTML Import To ProjectDoc

**Files:**
- Create: `packages/core/src/import/htmlImport.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/test/html-import.test.ts`

- [ ] **Step 1: Write the failing HTML import test**

Create `packages/core/test/html-import.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { importHtml } from "../src/import/htmlImport";

const repoRoot = resolve(import.meta.dirname, "../../..");

describe("importHtml", () => {
  it("creates a ProjectDoc with immutable source artifact and render tree", () => {
    const html = readFileSync(resolve(repoRoot, "fixtures/html/simple-ai-deck.html"), "utf8");

    const doc = importHtml({
      html,
      title: "Quarterly Product Review",
      now: "2026-06-20T00:00:00.000Z",
    });

    expect(doc.version).toBe("0.1.0");
    expect(doc.sourceArtifact?.content).toBe(html);
    expect(doc.sourceArtifact?.kind).toBe("html");
    expect(doc.renderTree.tag).toBe("document");
    expect(doc.renderTree.children.length).toBeGreaterThan(0);
    expect(doc.semanticOverlay.some((entry) => entry.role === "title")).toBe(true);
    expect(doc.transformationTrace.map((entry) => entry.stage)).toContain("import");
  });

  it("imports hostile HTML without executable script output", () => {
    const html = readFileSync(resolve(repoRoot, "fixtures/hostile/script-and-remote-assets.html"), "utf8");

    const doc = importHtml({
      html,
      title: "Hostile Import",
      now: "2026-06-20T00:00:00.000Z",
    });

    expect(JSON.stringify(doc.renderTree)).not.toContain("<script>");
    expect(doc.transformationTrace.map((entry) => entry.ruleId)).toEqual([
      "HTML_REMOTE_RESOURCE",
      "HTML_SCRIPT_REMOVED",
      "HTML_INLINE_HANDLER_REMOVED",
      "HTML_JAVASCRIPT_URL",
    ]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test --workspace @htmleditor/core -- html-import.test.ts
```

Expected: FAIL because `importHtml` does not exist.

- [ ] **Step 3: Add HTML importer**

Create `packages/core/src/import/htmlImport.ts`:

```ts
import { createHash } from "node:crypto";
import * as parse5 from "parse5";
import type { DefaultTreeAdapterMap } from "parse5";
import type {
  CompatibilityWarning,
  ProjectDoc,
  RenderNode,
  SemanticOverlayEntry,
  SemanticRole,
  ThemeTokens,
  TransformationTraceEntry,
} from "../document/types";
import { sanitizeHtml } from "../sanitize/sanitizeHtml";

type Node = DefaultTreeAdapterMap["node"];
type ElementNode = DefaultTreeAdapterMap["element"];
type TextNode = DefaultTreeAdapterMap["textNode"];

export type ImportHtmlInput = {
  html: string;
  title: string;
  now: string;
};

const DEFAULT_THEME_TOKENS: ThemeTokens = {
  colors: {
    background: "#ffffff",
    text: "#111111",
    accent: "#2563eb",
  },
  fontStack: "Inter, system-ui, sans-serif",
  spacingScale: "comfortable",
  radius: "8px",
  shadow: "soft",
};

function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function isElement(node: Node): node is ElementNode {
  return "tagName" in node;
}

function isText(node: Node): node is TextNode {
  return "value" in node && !("tagName" in node);
}

function attrsToRecord(attrs: ElementNode["attrs"]): Record<string, string> {
  return Object.fromEntries(attrs.map((attr) => [attr.name, attr.value]));
}

function parseInlineStyle(style: string | undefined): Record<string, string> {
  if (!style) {
    return {};
  }

  return Object.fromEntries(
    style
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf(":");
        if (separator === -1) {
          return [part, ""];
        }
        return [part.slice(0, separator).trim(), part.slice(separator + 1).trim()];
      }),
  );
}

function inferRole(tag: string): SemanticRole {
  if (tag === "main" || tag === "body" || tag === "html") return "document";
  if (tag === "section") return "section";
  if (/^h[1-6]$/.test(tag)) return "title";
  if (tag === "p") return "paragraph";
  if (tag === "img") return "image";
  if (tag === "ul" || tag === "ol") return "list";
  if (tag === "table") return "table";
  if (tag === "code" || tag === "pre") return "code";
  if (tag === "article") return "cardGrid";
  return "rawHtml";
}

function renderNodeFromParseNode(node: Node, path: string, sequence: { value: number }): RenderNode | undefined {
  if (isText(node)) {
    const text = node.value;
    if (!text.trim()) {
      return undefined;
    }
    sequence.value += 1;
    return {
      id: `node-${sequence.value}`,
      tag: "#text",
      attrs: {},
      classList: [],
      inlineStyle: {},
      children: [],
      text,
      sourceMeta: {
        sourceNodeName: "#text",
        sourcePath: path,
      },
    };
  }

  if (!isElement(node) && !("childNodes" in node)) {
    return undefined;
  }

  const tag = isElement(node) ? node.tagName.toLowerCase() : "document";
  const attrs = isElement(node) ? attrsToRecord(node.attrs) : {};
  const classList = attrs.class ? attrs.class.split(/\s+/).filter(Boolean) : [];
  const inlineStyle = parseInlineStyle(attrs.style);

  sequence.value += 1;
  const id = `node-${sequence.value}`;
  const children = "childNodes" in node
    ? node.childNodes.flatMap((child, index) => {
        const childNode = renderNodeFromParseNode(child, `${path}/${tag}[${index}]`, sequence);
        return childNode ? [childNode] : [];
      })
    : [];

  return {
    id,
    tag,
    attrs,
    classList,
    inlineStyle,
    children,
    locked: tag === "style" ? true : undefined,
    sourceMeta: {
      sourceNodeName: tag,
      sourcePath: path,
    },
  };
}

function collectOverlay(node: RenderNode, warningsByNode: CompatibilityWarning[] = []): SemanticOverlayEntry[] {
  const role = inferRole(node.tag);
  const own: SemanticOverlayEntry = {
    nodeId: node.id,
    role,
    editableFields: role === "rawHtml" ? [] : ["text", "style"],
    confluenceMapping: {
      recommendedTarget: role === "rawHtml" || role === "cardGrid" ? "fragment" : "native",
      expectedVisualLoss: role === "rawHtml" || role === "cardGrid" ? "material" : "minor",
      rationale: role === "rawHtml"
        ? "Importer preserved this node but did not recognize a native Confluence structure."
        : "Role has an MVP mapping candidate.",
    },
    warnings: warningsByNode,
  };

  return [own, ...node.children.flatMap((child) => collectOverlay(child))];
}

function traceFromWarnings(warnings: CompatibilityWarning[], now: string): TransformationTraceEntry[] {
  return warnings.map((item, index) => ({
    id: `trace-sanitize-${index + 1}`,
    stage: "sanitize",
    ruleId: item.ruleId,
    message: item.message,
    createdAt: now,
  }));
}

export function importHtml(input: ImportHtmlInput): ProjectDoc {
  const sanitized = sanitizeHtml(input.html);
  const fragment = parse5.parseFragment(sanitized.html);
  const sequence = { value: 0 };
  const renderTree = renderNodeFromParseNode(fragment, "fragment", sequence);

  if (!renderTree) {
    throw new Error("HTML import produced no render tree");
  }

  return {
    version: "0.1.0",
    title: input.title,
    sourceArtifact: {
      id: "source-1",
      kind: "html",
      originalBytesHash: hashContent(input.html),
      content: input.html,
      createdAt: input.now,
    },
    themeTokens: DEFAULT_THEME_TOKENS,
    renderTree,
    semanticOverlay: collectOverlay(renderTree),
    assets: [],
    transformationTrace: [
      {
        id: "trace-import-1",
        stage: "import",
        message: "Imported static HTML into ProjectDoc render tree.",
        createdAt: input.now,
      },
      ...traceFromWarnings(sanitized.warnings, input.now),
    ],
    exportProfiles: [
      { id: "profile-standalone", target: "standalone-html", label: "Standalone HTML" },
      { id: "profile-fragment", target: "confluence-fragment", label: "Confluence Fragment" },
      { id: "profile-native-report", target: "native-mapping", label: "Native Mapping Report" },
    ],
  };
}
```

Modify `packages/core/src/index.ts`:

```ts
export const CORE_PACKAGE_NAME = "@htmleditor/core";

export { getCompatibilityRule, listCompatibilityRules } from "./compatibility/rules";
export type { CompatibilityRule } from "./compatibility/rules";
export { importHtml } from "./import/htmlImport";
export type { ImportHtmlInput } from "./import/htmlImport";
export { sanitizeHtml } from "./sanitize/sanitizeHtml";
export type { SanitizedHtml } from "./sanitize/sanitizeHtml";

export type {
  Asset,
  CompatibilityReport,
  CompatibilitySeverity,
  CompatibilityWarning,
  ConfluenceMapping,
  ExportArtifact,
  ExportProfile,
  ExportResult,
  ExportTarget,
  ProjectDoc,
  RenderNode,
  SemanticOverlayEntry,
  SemanticRole,
  SourceArtifact,
  SourceArtifactKind,
  ThemeTokens,
  TransformationTraceEntry,
} from "./document/types";
```

- [ ] **Step 4: Run importer tests**

Run:

```bash
npm test --workspace @htmleditor/core -- html-import.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run typecheck**

Run:

```bash
npm run typecheck --workspace @htmleditor/core
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/import/htmlImport.ts packages/core/src/index.ts packages/core/test/html-import.test.ts
git commit -m "feat: import html into project document"
```

## Task 7: Standalone HTML Export

**Files:**
- Create: `packages/core/src/export/standaloneHtml.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/test/standalone-html-export.test.ts`

- [ ] **Step 1: Write the failing standalone export test**

Create `packages/core/test/standalone-html-export.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { exportStandaloneHtml } from "../src/export/standaloneHtml";
import { importHtml } from "../src/import/htmlImport";

const repoRoot = resolve(import.meta.dirname, "../../..");

describe("exportStandaloneHtml", () => {
  it("exports sanitized render tree as standalone.html", () => {
    const html = readFileSync(resolve(repoRoot, "fixtures/html/simple-ai-deck.html"), "utf8");
    const doc = importHtml({ html, title: "Quarterly Product Review", now: "2026-06-20T00:00:00.000Z" });

    const artifact = exportStandaloneHtml(doc);

    expect(artifact.filename).toBe("standalone.html");
    expect(artifact.mediaType).toBe("text/html");
    expect(artifact.content).toContain("<!doctype html>");
    expect(artifact.content).toContain("Quarterly Product Review");
    expect(artifact.content).toContain("metric-grid");
    expect(artifact.content).not.toContain("<script>");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test --workspace @htmleditor/core -- standalone-html-export.test.ts
```

Expected: FAIL because `exportStandaloneHtml` does not exist.

- [ ] **Step 3: Add standalone exporter**

Create `packages/core/src/export/standaloneHtml.ts`:

```ts
import type { ExportArtifact, ProjectDoc, RenderNode } from "../document/types";

function attrsToString(node: RenderNode): string {
  const attrs = { ...node.attrs };
  if (node.classList.length > 0) {
    attrs.class = node.classList.join(" ");
  }
  const style = Object.entries(node.inlineStyle)
    .map(([name, value]) => `${name}: ${value}`)
    .join("; ");
  if (style) {
    attrs.style = style;
  }

  return Object.entries(attrs)
    .filter(([name]) => name !== "class" || node.classList.length > 0)
    .map(([name, value]) => ` ${name}="${escapeAttribute(value)}"`)
    .join("");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll('"', "&quot;");
}

function renderNode(node: RenderNode): string {
  if (node.tag === "#text") {
    return escapeHtml(node.text ?? "");
  }

  if (node.tag === "document") {
    return node.children.map(renderNode).join("");
  }

  const children = node.children.map(renderNode).join("");
  return `<${node.tag}${attrsToString(node)}>${children}</${node.tag}>`;
}

export function exportStandaloneHtml(doc: ProjectDoc): ExportArtifact {
  return {
    filename: "standalone.html",
    mediaType: "text/html",
    content: [
      "<!doctype html>",
      '<html lang="en">',
      "<head>",
      '<meta charset="utf-8">',
      `<title>${escapeHtml(doc.title)}</title>`,
      "</head>",
      "<body>",
      renderNode(doc.renderTree),
      "</body>",
      "</html>",
    ].join("\n"),
  };
}
```

Modify `packages/core/src/index.ts`:

```ts
export const CORE_PACKAGE_NAME = "@htmleditor/core";

export { getCompatibilityRule, listCompatibilityRules } from "./compatibility/rules";
export type { CompatibilityRule } from "./compatibility/rules";
export { exportStandaloneHtml } from "./export/standaloneHtml";
export { importHtml } from "./import/htmlImport";
export type { ImportHtmlInput } from "./import/htmlImport";
export { sanitizeHtml } from "./sanitize/sanitizeHtml";
export type { SanitizedHtml } from "./sanitize/sanitizeHtml";

export type {
  Asset,
  CompatibilityReport,
  CompatibilitySeverity,
  CompatibilityWarning,
  ConfluenceMapping,
  ExportArtifact,
  ExportProfile,
  ExportResult,
  ExportTarget,
  ProjectDoc,
  RenderNode,
  SemanticOverlayEntry,
  SemanticRole,
  SourceArtifact,
  SourceArtifactKind,
  ThemeTokens,
  TransformationTraceEntry,
} from "./document/types";
```

- [ ] **Step 4: Run standalone export tests**

Run:

```bash
npm test --workspace @htmleditor/core -- standalone-html-export.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/export/standaloneHtml.ts packages/core/src/index.ts packages/core/test/standalone-html-export.test.ts
git commit -m "feat: export standalone html artifact"
```

## Task 8: Confluence Fragment Export

**Files:**
- Create: `packages/core/src/export/confluenceFragment.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/test/confluence-fragment-export.test.ts`

- [ ] **Step 1: Write the failing fragment export test**

Create `packages/core/test/confluence-fragment-export.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { exportConfluenceFragment } from "../src/export/confluenceFragment";
import { importHtml } from "../src/import/htmlImport";

const repoRoot = resolve(import.meta.dirname, "../../..");

describe("exportConfluenceFragment", () => {
  it("wraps output in a generated Confluence material class", () => {
    const html = readFileSync(resolve(repoRoot, "fixtures/html/simple-ai-deck.html"), "utf8");
    const doc = importHtml({ html, title: "Quarterly Product Review", now: "2026-06-20T00:00:00.000Z" });

    const artifact = exportConfluenceFragment(doc, "demo");

    expect(artifact.filename).toBe("confluence-fragment.html");
    expect(artifact.content).toContain('class="cf-material-demo"');
    expect(artifact.content).toContain("Quarterly Product Review");
    expect(artifact.content).not.toContain("<!doctype html>");
    expect(artifact.content).not.toContain("<script>");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test --workspace @htmleditor/core -- confluence-fragment-export.test.ts
```

Expected: FAIL because `exportConfluenceFragment` does not exist.

- [ ] **Step 3: Add fragment exporter**

Create `packages/core/src/export/confluenceFragment.ts`:

```ts
import type { ExportArtifact, ProjectDoc, RenderNode } from "../document/types";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll('"', "&quot;");
}

function attrsToString(node: RenderNode): string {
  const attrs = { ...node.attrs };
  if (node.classList.length > 0) {
    attrs.class = node.classList.join(" ");
  }
  const style = Object.entries(node.inlineStyle)
    .map(([name, value]) => `${name}: ${value}`)
    .join("; ");
  if (style) {
    attrs.style = style;
  }

  return Object.entries(attrs)
    .map(([name, value]) => ` ${name}="${escapeAttribute(value)}"`)
    .join("");
}

function renderNode(node: RenderNode): string {
  if (node.tag === "#text") {
    return escapeHtml(node.text ?? "");
  }

  if (node.tag === "document" || node.tag === "html" || node.tag === "head" || node.tag === "body") {
    return node.children.map(renderNode).join("");
  }

  if (node.tag === "title" || node.tag === "meta") {
    return "";
  }

  const children = node.children.map(renderNode).join("");
  return `<${node.tag}${attrsToString(node)}>${children}</${node.tag}>`;
}

export function exportConfluenceFragment(doc: ProjectDoc, fragmentId: string): ExportArtifact {
  const safeId = fragmentId.replace(/[^a-zA-Z0-9_-]/g, "-");

  return {
    filename: "confluence-fragment.html",
    mediaType: "text/html",
    content: `<div class="cf-material-${safeId}">\n${renderNode(doc.renderTree)}\n</div>`,
  };
}
```

Modify `packages/core/src/index.ts`:

```ts
export const CORE_PACKAGE_NAME = "@htmleditor/core";

export { getCompatibilityRule, listCompatibilityRules } from "./compatibility/rules";
export type { CompatibilityRule } from "./compatibility/rules";
export { exportConfluenceFragment } from "./export/confluenceFragment";
export { exportStandaloneHtml } from "./export/standaloneHtml";
export { importHtml } from "./import/htmlImport";
export type { ImportHtmlInput } from "./import/htmlImport";
export { sanitizeHtml } from "./sanitize/sanitizeHtml";
export type { SanitizedHtml } from "./sanitize/sanitizeHtml";

export type {
  Asset,
  CompatibilityReport,
  CompatibilitySeverity,
  CompatibilityWarning,
  ConfluenceMapping,
  ExportArtifact,
  ExportProfile,
  ExportResult,
  ExportTarget,
  ProjectDoc,
  RenderNode,
  SemanticOverlayEntry,
  SemanticRole,
  SourceArtifact,
  SourceArtifactKind,
  ThemeTokens,
  TransformationTraceEntry,
} from "./document/types";
```

- [ ] **Step 4: Run fragment export tests**

Run:

```bash
npm test --workspace @htmleditor/core -- confluence-fragment-export.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/export/confluenceFragment.ts packages/core/src/index.ts packages/core/test/confluence-fragment-export.test.ts
git commit -m "feat: export confluence html fragment"
```

## Task 9: Native Mapping Report

**Files:**
- Create: `packages/core/src/export/nativeMappingReport.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/test/native-mapping-report.test.ts`

- [ ] **Step 1: Write the failing native mapping report test**

Create `packages/core/test/native-mapping-report.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { exportNativeMappingReport } from "../src/export/nativeMappingReport";
import { importHtml } from "../src/import/htmlImport";

const repoRoot = resolve(import.meta.dirname, "../../..");

describe("exportNativeMappingReport", () => {
  it("emits mapping entries without claiming page body serialization", () => {
    const html = readFileSync(resolve(repoRoot, "fixtures/html/simple-ai-deck.html"), "utf8");
    const doc = importHtml({ html, title: "Quarterly Product Review", now: "2026-06-20T00:00:00.000Z" });

    const artifact = exportNativeMappingReport(doc, "2026-06-20T00:00:00.000Z");
    const report = JSON.parse(artifact.content) as {
      artifactKind: string;
      isConfluencePageBody: boolean;
      mappings: Array<{ nodeId: string; semanticRole: string; recommendedTarget: string }>;
    };

    expect(artifact.filename).toBe("native-mapping-report.json");
    expect(report.artifactKind).toBe("native-mapping-report");
    expect(report.isConfluencePageBody).toBe(false);
    expect(report.mappings.some((entry) => entry.semanticRole === "title")).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test --workspace @htmleditor/core -- native-mapping-report.test.ts
```

Expected: FAIL because `exportNativeMappingReport` does not exist.

- [ ] **Step 3: Add native mapping report exporter**

Create `packages/core/src/export/nativeMappingReport.ts`:

```ts
import type { ExportArtifact, ProjectDoc } from "../document/types";

type NativeMappingReport = {
  artifactKind: "native-mapping-report";
  documentVersion: string;
  generatedAt: string;
  isConfluencePageBody: false;
  mappings: Array<{
    nodeId: string;
    semanticRole: string;
    recommendedTarget: string;
    expectedVisualLoss: string;
    compatibilityRuleIds: string[];
    rationale: string;
  }>;
};

export function exportNativeMappingReport(doc: ProjectDoc, generatedAt: string): ExportArtifact {
  const report: NativeMappingReport = {
    artifactKind: "native-mapping-report",
    documentVersion: doc.version,
    generatedAt,
    isConfluencePageBody: false,
    mappings: doc.semanticOverlay.map((entry) => ({
      nodeId: entry.nodeId,
      semanticRole: entry.role,
      recommendedTarget: entry.confluenceMapping.recommendedTarget,
      expectedVisualLoss: entry.confluenceMapping.expectedVisualLoss,
      compatibilityRuleIds: entry.warnings.map((warning) => warning.ruleId),
      rationale: entry.confluenceMapping.rationale,
    })),
  };

  return {
    filename: "native-mapping-report.json",
    mediaType: "application/json",
    content: JSON.stringify(report, null, 2),
  };
}
```

Modify `packages/core/src/index.ts`:

```ts
export const CORE_PACKAGE_NAME = "@htmleditor/core";

export { getCompatibilityRule, listCompatibilityRules } from "./compatibility/rules";
export type { CompatibilityRule } from "./compatibility/rules";
export { exportConfluenceFragment } from "./export/confluenceFragment";
export { exportNativeMappingReport } from "./export/nativeMappingReport";
export { exportStandaloneHtml } from "./export/standaloneHtml";
export { importHtml } from "./import/htmlImport";
export type { ImportHtmlInput } from "./import/htmlImport";
export { sanitizeHtml } from "./sanitize/sanitizeHtml";
export type { SanitizedHtml } from "./sanitize/sanitizeHtml";

export type {
  Asset,
  CompatibilityReport,
  CompatibilitySeverity,
  CompatibilityWarning,
  ConfluenceMapping,
  ExportArtifact,
  ExportProfile,
  ExportResult,
  ExportTarget,
  ProjectDoc,
  RenderNode,
  SemanticOverlayEntry,
  SemanticRole,
  SourceArtifact,
  SourceArtifactKind,
  ThemeTokens,
  TransformationTraceEntry,
} from "./document/types";
```

- [ ] **Step 4: Run native mapping tests**

Run:

```bash
npm test --workspace @htmleditor/core -- native-mapping-report.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/export/nativeMappingReport.ts packages/core/src/index.ts packages/core/test/native-mapping-report.test.ts
git commit -m "feat: export native mapping report"
```

## Task 10: Combined MVP Export Result

**Files:**
- Create: `packages/core/src/export/exportProject.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/test/export-project.test.ts`

- [ ] **Step 1: Write the failing combined export test**

Create `packages/core/test/export-project.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { exportProject } from "../src/export/exportProject";
import { importHtml } from "../src/import/htmlImport";

const repoRoot = resolve(import.meta.dirname, "../../..");

describe("exportProject", () => {
  it("emits all four MVP export artifacts", () => {
    const html = readFileSync(resolve(repoRoot, "fixtures/hostile/script-and-remote-assets.html"), "utf8");
    const doc = importHtml({ html, title: "Hostile Import", now: "2026-06-20T00:00:00.000Z" });

    const result = exportProject(doc, {
      generatedAt: "2026-06-20T00:00:00.000Z",
      fragmentId: "hostile",
    });

    expect(result.artifacts.map((artifact) => artifact.filename)).toEqual([
      "standalone.html",
      "confluence-fragment.html",
      "compatibility-report.json",
      "native-mapping-report.json",
    ]);
    expect(result.compatibilityReport.warnings.map((warning) => warning.ruleId)).toEqual([
      "HTML_REMOTE_RESOURCE",
      "HTML_SCRIPT_REMOVED",
      "HTML_INLINE_HANDLER_REMOVED",
      "HTML_JAVASCRIPT_URL",
    ]);
    expect(result.artifacts.find((artifact) => artifact.filename === "standalone.html")?.content).not.toContain("<script>");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test --workspace @htmleditor/core -- export-project.test.ts
```

Expected: FAIL because `exportProject` does not exist.

- [ ] **Step 3: Add combined exporter**

Create `packages/core/src/export/exportProject.ts`:

```ts
import type { CompatibilityReport, ExportArtifact, ExportResult, ProjectDoc } from "../document/types";
import { exportConfluenceFragment } from "./confluenceFragment";
import { exportNativeMappingReport } from "./nativeMappingReport";
import { exportStandaloneHtml } from "./standaloneHtml";

export type ExportProjectOptions = {
  generatedAt: string;
  fragmentId: string;
};

function buildCompatibilityReport(doc: ProjectDoc, generatedAt: string): CompatibilityReport {
  const warnings = doc.transformationTrace
    .filter((entry) => entry.ruleId)
    .map((entry) => ({
      ruleId: entry.ruleId ?? "",
      target: "standalone-html" as const,
      severity: entry.ruleId === "HTML_JAVASCRIPT_URL" ? "error" as const : "warning" as const,
      message: entry.message,
      recommendation: "Review the import/export panel for the affected target.",
    }));

  return {
    documentVersion: doc.version,
    generatedAt,
    warnings,
  };
}

export function exportProject(doc: ProjectDoc, options: ExportProjectOptions): ExportResult {
  const compatibilityReport = buildCompatibilityReport(doc, options.generatedAt);
  const compatibilityArtifact: ExportArtifact = {
    filename: "compatibility-report.json",
    mediaType: "application/json",
    content: JSON.stringify(compatibilityReport, null, 2),
  };

  return {
    compatibilityReport,
    artifacts: [
      exportStandaloneHtml(doc),
      exportConfluenceFragment(doc, options.fragmentId),
      compatibilityArtifact,
      exportNativeMappingReport(doc, options.generatedAt),
    ],
  };
}
```

Modify `packages/core/src/index.ts`:

```ts
export const CORE_PACKAGE_NAME = "@htmleditor/core";

export { getCompatibilityRule, listCompatibilityRules } from "./compatibility/rules";
export type { CompatibilityRule } from "./compatibility/rules";
export { exportConfluenceFragment } from "./export/confluenceFragment";
export { exportNativeMappingReport } from "./export/nativeMappingReport";
export { exportProject } from "./export/exportProject";
export type { ExportProjectOptions } from "./export/exportProject";
export { exportStandaloneHtml } from "./export/standaloneHtml";
export { importHtml } from "./import/htmlImport";
export type { ImportHtmlInput } from "./import/htmlImport";
export { sanitizeHtml } from "./sanitize/sanitizeHtml";
export type { SanitizedHtml } from "./sanitize/sanitizeHtml";

export type {
  Asset,
  CompatibilityReport,
  CompatibilitySeverity,
  CompatibilityWarning,
  ConfluenceMapping,
  ExportArtifact,
  ExportProfile,
  ExportResult,
  ExportTarget,
  ProjectDoc,
  RenderNode,
  SemanticOverlayEntry,
  SemanticRole,
  SourceArtifact,
  SourceArtifactKind,
  ThemeTokens,
  TransformationTraceEntry,
} from "./document/types";
```

- [ ] **Step 4: Run combined export tests**

Run:

```bash
npm test --workspace @htmleditor/core -- export-project.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run full verification**

Run:

```bash
npm run verify
```

Expected: PASS for typecheck and all Vitest tests.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/export/exportProject.ts packages/core/src/index.ts packages/core/test/export-project.test.ts
git commit -m "feat: export mvp artifact set"
```

## Task 11: Documentation Contract Alignment

**Files:**
- Modify: `docs/testing/fixture-catalog.md`
- Modify: `docs/testing/verification-strategy.md`
- Modify: `docs/engineering/decision-log.md`

- [ ] **Step 1: Add fixture implementation status**

Modify `docs/testing/fixture-catalog.md` by adding this section after `## Expected Outputs`:

```md
## Implemented Fixture Status

The first core vertical slice implements:

- `fixtures/html/simple-ai-deck.html`
- `fixtures/hostile/script-and-remote-assets.html`
- `fixtures/expected/hostile-compatibility-rules.json`

The remaining catalog fixtures are outside this core vertical slice and require separate implementation plans:

- `fixtures/html/complex-visual.html`
- `fixtures/markdown/product-outline.md`
- `fixtures/html/confluence-friendly.html`
```

- [ ] **Step 2: Add verification command**

Modify `docs/testing/verification-strategy.md` by adding this section before `## Completion Rule`:

```md
## Current Verification Command

For the first core vertical slice, run:

```bash
npm run verify
```

This command typechecks `packages/core` and runs the Vitest suite for document model, compatibility rules, sanitizer, import, and export behavior.
```
```

- [ ] **Step 3: Add decision-log implementation note**

Modify `docs/engineering/decision-log.md` by adding this section at the end:

```md
## 2026-06-20: First Implementation Slice Starts In Core

Decision: The first implementation slice builds `packages/core` import, sanitization, compatibility, and export behavior before any app UI.

Rationale: The product contract depends on deterministic artifact generation. Building core first gives the UI a stable API and avoids reimplementing parser/export logic in the app layer.
```

- [ ] **Step 4: Run full verification**

Run:

```bash
npm run verify
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/testing/fixture-catalog.md docs/testing/verification-strategy.md docs/engineering/decision-log.md
git commit -m "docs: align testing docs with core vertical slice"
```

## Task 12: Final Review And Cleanup

**Files:**
- Inspect: all files changed in Tasks 1-11

- [ ] **Step 1: Check git status**

Run:

```bash
git status --short
```

Expected: no unexpected untracked files except user-owned files that existed before the plan execution.

- [ ] **Step 2: Run full verification**

Run:

```bash
npm run verify
```

Expected: PASS.

- [ ] **Step 3: Confirm export artifact contract from tests**

Run:

```bash
npm test --workspace @htmleditor/core -- export-project.test.ts
```

Expected: PASS and the test asserts the artifact list:

```text
standalone.html
confluence-fragment.html
compatibility-report.json
native-mapping-report.json
```

- [ ] **Step 4: Commit any final plan-consistent fixes**

If Step 1 shows only intended changes from this implementation slice, run:

```bash
git add package.json package-lock.json tsconfig.base.json packages fixtures docs/testing/fixture-catalog.md docs/testing/verification-strategy.md docs/engineering/decision-log.md
git commit -m "chore: complete core mvp vertical slice"
```

Expected: commit succeeds if there are final unstaged changes. If there are no changes, skip this commit and record that no final cleanup commit was needed.

## Self-Review

### Spec Coverage

- Product identity and non-goals: covered by keeping this slice in `packages/core` and excluding UI, Confluence publishing, Forge, and app runtime work.
- Immutable `sourceArtifact`: covered by Task 6 importer tests and model.
- Render tree plus semantic overlay: covered by Task 2 model and Task 6 importer.
- Sanitizer policy: covered by Task 5 sanitizer tests and Task 6 hostile import test.
- Stable compatibility rule IDs: covered by Task 3 catalog and Task 10 report output.
- MVP export artifacts: covered by Tasks 7-10.
- Fixture-first development: covered by Task 4 fixtures and component tests.
- Verification command: covered by Task 10 and Task 11.

### Placeholder Scan

The plan contains no unresolved placeholder markers, no unnamed test command, and no steps that ask the implementer to invent behavior without code.

### Type Consistency

The plan uses these stable names throughout:

- `ProjectDoc`
- `RenderNode`
- `SemanticOverlayEntry`
- `CompatibilityWarning`
- `importHtml`
- `sanitizeHtml`
- `exportStandaloneHtml`
- `exportConfluenceFragment`
- `exportNativeMappingReport`
- `exportProject`
