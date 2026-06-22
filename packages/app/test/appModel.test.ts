import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  createAppState,
  canEditSelectedText,
  editSelectedText,
  getCanvasHtml,
  getExportArtifact,
  getSelectedText,
  exportCurrentProject,
  importFixture,
  importSampleMaterial,
  insertCalloutAfterSelection,
  selectNodeByRole,
  setPreviewWidth,
} from "../src/appModel.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, "../../..");

const readFixture = (fixturePath: string) =>
  readFileSync(resolve(repoRoot, fixturePath), "utf8");

describe("app model", () => {
  it("starts from an editable sample material for the canvas-first screen", () => {
    let state = createAppState({
      now: "2026-06-22T00:00:00.000Z",
      generatedAt: "2026-06-22T00:00:00.000Z",
    });

    state = importSampleMaterial(state);

    expect(state.doc?.title).toBe("Release Readiness");
    expect(getSelectedText(state)).toBe("Release Readiness");
    expect(getCanvasHtml(state)).toContain('data-core-node-id="node-');
    expect(getCanvasHtml(state)).toContain("Release Readiness");
  });

  it("inserts a constrained callout block through the app model", () => {
    let state = createAppState({
      now: "2026-06-22T00:00:00.000Z",
      generatedAt: "2026-06-22T00:00:00.000Z",
    });

    state = importSampleMaterial(state);
    state = insertCalloutAfterSelection(state, {
      title: "Review note",
      body: "Confirm the Confluence fragment before sharing.",
    });

    const exported = exportCurrentProject(state);

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

  it("imports, edits, previews, and exports an HTML fixture", () => {
    let state = createAppState({
      now: "2026-06-22T00:00:00.000Z",
      generatedAt: "2026-06-22T00:00:00.000Z",
    });

    state = importFixture(state, {
      kind: "html",
      title: "Confluence Friendly",
      content: readFixture("fixtures/html/confluence-friendly.html"),
    });
    state = selectNodeByRole(state, "title");
    state = editSelectedText(state, "Release Readiness Edited");
    state = setPreviewWidth(state, "tablet");

    const result = exportCurrentProject(state);

    expect(state.previewWidth).toBe("tablet");
    expect(JSON.stringify(state.doc?.renderTree)).toContain(
      "Release Readiness Edited",
    );
    expect(result.artifacts.map((artifact) => artifact.filename)).toEqual([
      "standalone.html",
      "confluence-fragment.html",
      "compatibility-report.json",
      "native-mapping-report.json",
    ]);
    expect(result.compatibilityReport.warnings.map((warning) => warning.ruleId))
      .toEqual([
        "CF_FRAGMENT_GLOBAL_SELECTOR",
        "CF_FRAGMENT_OVERFLOW_RISK",
        "CF_FRAGMENT_VIEWPORT_UNIT",
        "CF_FRAGMENT_FIXED_POSITION",
      ]);
    expect(
      result.nativeMappingReport?.mappings
        .filter((mapping) => mapping.recommendedTarget === "macro")
        .map((mapping) => mapping.semanticRole),
    ).toEqual(
      expect.arrayContaining(["status", "callout", "panel", "expand", "code"]),
    );
    expect(result.nativeMappingReport?.confluenceAdfDraft).toMatchObject({
      schemaSource: "@atlaskit/adf-schema",
      validation: {
        status: "valid",
        validator: "@atlaskit/adf-schema",
      },
      document: {
        type: "doc",
        version: 1,
      },
    });
  });

  it("does not expose selected text for non-direct text containers", () => {
    let state = createAppState({
      now: "2026-06-22T00:00:00.000Z",
      generatedAt: "2026-06-22T00:00:00.000Z",
    });

    state = importSampleMaterial(state);
    state = insertCalloutAfterSelection(state, {
      title: "Review note",
      body: "Confirm the Confluence fragment before sharing.",
    });

    expect(canEditSelectedText(state)).toBe(false);
    expect(getSelectedText(state)).toBe("");
    expect(editSelectedText(state, "No silent edit")).toBe(state);
  });

  it("imports markdown and hostile fixtures through the same app model", () => {
    let markdownState = createAppState({
      now: "2026-06-22T00:00:00.000Z",
      generatedAt: "2026-06-22T00:00:00.000Z",
    });
    markdownState = importFixture(markdownState, {
      kind: "markdown",
      title: "Product Outline",
      content: readFixture("fixtures/markdown/product-outline.md"),
    });

    expect(exportCurrentProject(markdownState).compatibilityReport.warnings)
      .toEqual([]);

    let hostileState = createAppState({
      now: "2026-06-22T00:00:00.000Z",
      generatedAt: "2026-06-22T00:00:00.000Z",
    });
    hostileState = importFixture(hostileState, {
      kind: "html",
      title: "Hostile Import",
      content: readFixture("fixtures/hostile/script-and-remote-assets.html"),
    });

    expect(
      exportCurrentProject(hostileState).compatibilityReport.warnings.map(
        (warning) => warning.ruleId,
      ),
    ).toEqual([
      "HTML_REMOTE_RESOURCE",
      "HTML_SCRIPT_REMOVED",
      "HTML_INLINE_HANDLER_REMOVED",
      "HTML_JAVASCRIPT_URL",
    ]);
  });

  it("imports a user HTML draft, exposes selected text, and reads export artifact content", () => {
    let state = createAppState({
      now: "2026-06-22T00:00:00.000Z",
      generatedAt: "2026-06-22T00:00:00.000Z",
    });

    state = importFixture(state, {
      kind: "html",
      title: "User Draft",
      content:
        "<main><section><h1>Initial proposal</h1><p>Replace this paragraph.</p></section></main>",
    });

    expect(getSelectedText(state)).toBe("Initial proposal");

    state = editSelectedText(state, "Reviewed launch proposal");
    const exported = exportCurrentProject(state);

    expect(getSelectedText(state)).toBe("Reviewed launch proposal");
    expect(getExportArtifact(exported, "standalone.html")).toContain(
      "Reviewed launch proposal",
    );
    expect(getExportArtifact(exported, "confluence-fragment.html")).toContain(
      "Reviewed launch proposal",
    );
  });
});
