import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  createAppState,
  canEditSelectedText,
  deleteSelection,
  duplicateSelection,
  editSelectedText,
  getCanvasHtml,
  getExportArtifact,
  getImportReviewSummary,
  getSelectedEditability,
  getSelectedEditableTextTargets,
  getSelectedStructureMutability,
  getSelectedText,
  formatCompatibilityWarningDetail,
  moveSelection,
  redo,
  shouldShowEditableTextTargetList,
  exportCurrentProject,
  importFixture,
  importSampleMaterial,
  insertMaterialBlockAfterSelection,
  insertCalloutAfterSelection,
  selectNodeByRole,
  setPreviewWidth,
  undo,
  updateTheme,
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

  it("inserts constrained title, paragraph, and divider blocks through the app model", async () => {
    let state = createAppState({
      now: "2026-06-22T00:00:00.000Z",
      generatedAt: "2026-06-22T00:00:00.000Z",
    });

    state = importSampleMaterial(state);
    state = insertMaterialBlockAfterSelection(state, "title");
    expect(getSelectedText(state)).toBe("New title");

    state = insertMaterialBlockAfterSelection(state, "paragraph");
    expect(getSelectedText(state)).toBe("New paragraph");

    state = insertMaterialBlockAfterSelection(state, "divider");
    const exported = await exportCurrentProject(state);

    expect(getCanvasHtml(state)).toContain("New title");
    expect(getCanvasHtml(state)).toContain("New paragraph");
    expect(getCanvasHtml(state)).toContain("<hr");
    expect(getExportArtifact(exported, "standalone.html")).toContain(
      "New paragraph",
    );
  });


  it("imports, edits, previews, and exports an HTML fixture", async () => {
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

    const result = await exportCurrentProject(state);

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

  it("keeps sanitized imported style tags in the canvas preview html", () => {
    let state = createAppState({
      now: "2026-06-22T00:00:00.000Z",
      generatedAt: "2026-06-22T00:00:00.000Z",
    });

    state = importFixture(state, {
      kind: "html",
      title: "Styled Import",
      content:
        '<main><style>.hero-title { color: rgb(220, 38, 38); }</style><section><h1 class="hero-title">Styled title</h1></section></main>',
    });

    expect(getCanvasHtml(state)).toContain("<style ");
    expect(getCanvasHtml(state)).toContain(
      ".hero-title { color: rgb(220, 38, 38); }",
    );
    expect(getCanvasHtml(state)).toContain('class="hero-title"');
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

  it("imports markdown and hostile fixtures through the same app model", async () => {
    let markdownState = createAppState({
      now: "2026-06-22T00:00:00.000Z",
      generatedAt: "2026-06-22T00:00:00.000Z",
    });
    markdownState = importFixture(markdownState, {
      kind: "markdown",
      title: "Product Outline",
      content: readFixture("fixtures/markdown/product-outline.md"),
    });

    const markdownExport = await exportCurrentProject(markdownState);

    expect(markdownExport.compatibilityReport.warnings).toEqual([]);

    let hostileState = createAppState({
      now: "2026-06-22T00:00:00.000Z",
      generatedAt: "2026-06-22T00:00:00.000Z",
    });
    hostileState = importFixture(hostileState, {
      kind: "html",
      title: "Hostile Import",
      content: readFixture("fixtures/hostile/script-and-remote-assets.html"),
    });

    const hostileExport = await exportCurrentProject(hostileState);

    expect(
      hostileExport.compatibilityReport.warnings.map(
        (warning) => warning.ruleId,
      ),
    ).toEqual([
      "HTML_REMOTE_RESOURCE",
      "HTML_SCRIPT_REMOVED",
      "HTML_INLINE_HANDLER_REMOVED",
      "HTML_JAVASCRIPT_URL",
    ]);
  });

  it("summarizes hostile import review evidence before export is opened", () => {
    let state = createAppState({
      now: "2026-06-22T00:00:00.000Z",
      generatedAt: "2026-06-22T00:00:00.000Z",
    });

    state = importFixture(state, {
      kind: "html",
      title: "Hostile Import",
      content: readFixture("fixtures/hostile/script-and-remote-assets.html"),
    });

    const summary = getImportReviewSummary(state.doc);

    expect(summary.sanitizerWarningCount).toBe(4);
    expect(summary.sanitizerRuleIds).toEqual([
      "HTML_REMOTE_RESOURCE",
      "HTML_SCRIPT_REMOVED",
      "HTML_INLINE_HANDLER_REMOVED",
      "HTML_JAVASCRIPT_URL",
    ]);
    expect(summary.targetImpact).toEqual([
      {
        target: "standalone-html",
        warningCount: 4,
        ruleIds: [
          "HTML_REMOTE_RESOURCE",
          "HTML_SCRIPT_REMOVED",
          "HTML_INLINE_HANDLER_REMOVED",
          "HTML_JAVASCRIPT_URL",
        ],
      },
    ]);
    expect(summary.sourceBaselineNote).toBe(
      "Source baseline available from immutable html import.",
    );
  });

  it("counts duplicate warning entries while keeping rule IDs unique", async () => {
    let state = createAppState({
      now: "2026-06-22T00:00:00.000Z",
      generatedAt: "2026-06-22T00:00:00.000Z",
    });

    state = importFixture(state, {
      kind: "html",
      title: "Hostile Import",
      content: readFixture("fixtures/hostile/script-and-remote-assets.html"),
    });

    const duplicatedDoc = {
      ...state.doc!,
      transformationTrace: [
        ...state.doc!.transformationTrace,
        {
          id: "trace-sanitize-duplicate",
          stage: "sanitize" as const,
          ruleId: "HTML_REMOTE_RESOURCE" as const,
          message: "Duplicate remote resource warning.",
          createdAt: "2026-06-22T00:00:00.000Z",
        },
      ],
    };
    const preExportSummary = getImportReviewSummary(duplicatedDoc);

    expect(preExportSummary.sanitizerWarningCount).toBe(5);
    expect(preExportSummary.sanitizerRuleIds).toEqual([
      "HTML_REMOTE_RESOURCE",
      "HTML_SCRIPT_REMOVED",
      "HTML_INLINE_HANDLER_REMOVED",
      "HTML_JAVASCRIPT_URL",
    ]);
    expect(preExportSummary.targetImpact).toEqual([
      {
        target: "standalone-html",
        warningCount: 5,
        ruleIds: [
          "HTML_REMOTE_RESOURCE",
          "HTML_SCRIPT_REMOVED",
          "HTML_INLINE_HANDLER_REMOVED",
          "HTML_JAVASCRIPT_URL",
        ],
      },
    ]);

    const exported = await exportCurrentProject(state);
    const exportedWithDuplicate = {
      ...exported,
      compatibilityReport: {
        ...exported.compatibilityReport,
        warnings: [
          ...exported.compatibilityReport.warnings,
          exported.compatibilityReport.warnings[0]!,
        ],
      },
    };
    const exportSummary = getImportReviewSummary(
      state.doc,
      exportedWithDuplicate,
    );

    expect(exportSummary.targetImpact[0]).toEqual({
      target: "standalone-html",
      warningCount: 5,
      ruleIds: [
        "HTML_REMOTE_RESOURCE",
        "HTML_SCRIPT_REMOVED",
        "HTML_INLINE_HANDLER_REMOVED",
        "HTML_JAVASCRIPT_URL",
      ],
    });
  });

  it("marks target impact as pending before export compatibility evidence exists", () => {
    let state = createAppState({
      now: "2026-06-22T00:00:00.000Z",
      generatedAt: "2026-06-22T00:00:00.000Z",
    });

    state = importFixture(state, {
      kind: "html",
      title: "Confluence CSS Risk",
      content:
        "<main><style>.hero { position: fixed; width: 1200px; height: 100vh; }</style><section><h1>Risk</h1></section></main>",
    });

    const summary = getImportReviewSummary(state.doc);

    expect(summary.sanitizerWarningCount).toBe(0);
    expect(summary.targetImpact).toEqual([]);
    expect(summary.targetImpactStatus).toBe("pending-export-evidence");
    expect(summary.targetImpactNote).toBe(
      "Target impact is based on import/sanitize warnings only. Export evidence calculates final compatibility warnings.",
    );
  });

  it("summarizes editable, partially editable, and preserved-only node counts", () => {
    let state = createAppState({
      now: "2026-06-22T00:00:00.000Z",
      generatedAt: "2026-06-22T00:00:00.000Z",
    });

    state = importFixture(state, {
      kind: "html",
      title: "Nested Targets",
      content:
        "<main><section><h1>Review note</h1><p>Confirm fragment.</p><custom-widget>Preserved only</custom-widget></section></main>",
    });

    const summary = getImportReviewSummary(state.doc);

    expect(summary.editabilityCounts.editable).toBe(2);
    expect(summary.editabilityCounts.partiallyEditable).toBe(3);
    expect(summary.editabilityCounts.preservedOnly).toBe(1);
  });

  it("formats compatibility warnings with operational detail", async () => {
    let state = createAppState({
      now: "2026-06-22T00:00:00.000Z",
      generatedAt: "2026-06-22T00:00:00.000Z",
    });

    state = importFixture(state, {
      kind: "html",
      title: "Hostile Import",
      content: readFixture("fixtures/hostile/script-and-remote-assets.html"),
    });

    const hostileExport = await exportCurrentProject(state);
    const firstWarning = hostileExport.compatibilityReport.warnings[0];

    expect(firstWarning).toBeDefined();
    expect(formatCompatibilityWarningDetail(firstWarning!)).toBe(
      "warning | standalone-html | HTML_REMOTE_RESOURCE | Output depends on a remote resource. Recommendation: Replace with local asset or embedded data.",
    );
  });

  it("imports a user HTML draft, exposes selected text, and reads export artifact content", async () => {
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
    const exported = await exportCurrentProject(state);

    expect(getSelectedText(state)).toBe("Reviewed launch proposal");
    expect(getExportArtifact(exported, "standalone.html")).toContain(
      "Reviewed launch proposal",
    );
    expect(getExportArtifact(exported, "confluence-fragment.html")).toContain(
      "Reviewed launch proposal",
    );
  });

  it("duplicates, deletes, and moves the selected node through core-backed app helpers", () => {
    let state = createAppState({
      now: "2026-06-22T00:00:00.000Z",
      generatedAt: "2026-06-22T00:00:00.000Z",
    });

    state = importFixture(state, {
      kind: "html",
      title: "Operations",
      content:
        "<main><section><h1>Title</h1><p>First paragraph.</p><p>Second paragraph.</p></section></main>",
    });
    state = selectNodeByRole(state, "paragraph");
    const originalParagraphId = state.selectedNodeId;

    state = duplicateSelection(state);

    expect(state.selectedNodeId).not.toBe(originalParagraphId);
    expect(getCanvasHtml(state).match(/First paragraph\./g)).toHaveLength(2);

    state = moveSelection(state, "down");

    expect(state.selectedNodeId).not.toBe(originalParagraphId);
    expect(getCanvasHtml(state).indexOf("Second paragraph.")).toBeLessThan(
      getCanvasHtml(state).lastIndexOf("First paragraph."),
    );

    state = deleteSelection(state);

    expect(state.selectedNodeId).toBeDefined();
    expect(state.selectedNodeId).not.toBe(originalParagraphId);
    expect(getCanvasHtml(state).match(/First paragraph\./g)).toHaveLength(1);
  });

  it("records undo and redo for mutating app model operations and resets history on import", () => {
    let state = createAppState({
      now: "2026-06-22T00:00:00.000Z",
      generatedAt: "2026-06-22T00:00:00.000Z",
    });

    state = importSampleMaterial(state);
    state = editSelectedText(state, "Edited title");
    expect(state.history.undo).toHaveLength(1);
    expect(getSelectedText(state)).toBe("Edited title");

    state = undo(state);
    expect(getSelectedText(state)).toBe("Release Readiness");
    expect(state.history.redo).toHaveLength(1);

    state = redo(state);
    expect(getSelectedText(state)).toBe("Edited title");
    expect(state.history.redo).toHaveLength(0);

    state = insertCalloutAfterSelection(state, {
      title: "Review note",
      body: "Confirm fragment output.",
    });
    expect(state.history.undo).toHaveLength(2);

    state = importFixture(state, {
      kind: "html",
      title: "Replacement",
      content: "<main><section><h1>Replacement</h1></section></main>",
    });

    expect(state.history).toEqual({ undo: [], redo: [] });
    expect(getSelectedText(state)).toBe("Replacement");
  });

  it("records theme token changes in undo and redo history", () => {
    let state = createAppState({
      now: "2026-06-22T00:00:00.000Z",
      generatedAt: "2026-06-22T00:00:00.000Z",
    });

    state = importSampleMaterial(state);
    state = updateTheme(state, {
      colors: {
        background: "#101820",
        text: "#f8fafc",
        accent: "#f97316",
      },
      fontStack: "Inter, sans-serif",
      spacingScale: "spacious",
      radius: "12px",
      shadow: "strong",
    });

    expect(state.doc?.themeTokens).toMatchObject({
      colors: {
        background: "#101820",
        text: "#f8fafc",
        accent: "#f97316",
      },
      fontStack: "Inter, sans-serif",
      spacingScale: "spacious",
      radius: "12px",
      shadow: "strong",
    });

    state = undo(state);
    expect(state.doc?.themeTokens.colors.background).toBe("#ffffff");
    expect(state.doc?.themeTokens.spacingScale).toBe("comfortable");

    state = redo(state);
    expect(state.doc?.themeTokens.colors.accent).toBe("#f97316");
    expect(state.doc?.themeTokens.shadow).toBe("strong");
  });

  it("exposes selected editability and nested editable text targets to UI callers", () => {
    let state = createAppState({
      now: "2026-06-22T00:00:00.000Z",
      generatedAt: "2026-06-22T00:00:00.000Z",
    });

    state = importFixture(state, {
      kind: "html",
      title: "Nested Targets",
      content: "<main><section><h1>Review note</h1><p>Confirm the Confluence fragment before sharing.</p></section></main>",
    });
    state = selectNodeByRole(state, "section");

    expect(getSelectedEditability(state)).toEqual({
      status: "partially-editable",
      reason: "Selected node contains editable text targets.",
    });
    expect(getSelectedEditableTextTargets(state).map((target) => target.label))
      .toEqual([
        "Review note",
        "Confirm the Confluence fragment before sharing.",
      ]);

    state = {
      ...state,
      selectedNodeId: getSelectedEditableTextTargets(state)[0]?.nodeId,
    };
    expect(getSelectedEditability(state).status).toBe("editable");
    expect(getSelectedText(state)).toBe("Review note");
  });

  it("shows editable target list for partially-editable selections with one child target only", () => {
    let state = createAppState({
      now: "2026-06-22T00:00:00.000Z",
      generatedAt: "2026-06-22T00:00:00.000Z",
    });

    state = importFixture(state, {
      kind: "html",
      title: "Single Target",
      content: "<main><section><p>Only child target.</p></section></main>",
    });
    state = selectNodeByRole(state, "section");

    expect(getSelectedEditableTextTargets(state).map((target) => target.label))
      .toEqual(["Only child target."]);
    expect(getSelectedEditability(state).status).toBe("partially-editable");
    expect(shouldShowEditableTextTargetList(state)).toBe(true);

    state = {
      ...state,
      selectedNodeId: getSelectedEditableTextTargets(state)[0]?.nodeId,
    };

    expect(getSelectedEditability(state).status).toBe("editable");
    expect(shouldShowEditableTextTargetList(state)).toBe(false);
  });

  it("exposes disabled structure controls for preserved-only imported nodes", () => {
    let state = createAppState({
      now: "2026-06-22T00:00:00.000Z",
      generatedAt: "2026-06-22T00:00:00.000Z",
    });

    state = importFixture(state, {
      kind: "html",
      title: "Preserved",
      content:
        "<main><section><style>.hero { color: red; }</style><h1>Editable</h1></section></main>",
    });

    const styleNodeId = findNodeIdByTag(state.doc?.renderTree, "style");
    state = { ...state, selectedNodeId: styleNodeId };

    expect(getSelectedEditability(state).status).toBe("preserved-only");
    expect(getSelectedStructureMutability(state)).toEqual({
      canMutate: false,
      reason:
        "Preserved imported structure cannot be duplicated, deleted, or moved in MVP.",
    });
    expect(duplicateSelection(state)).toBe(state);
    expect(deleteSelection(state)).toBe(state);
    expect(moveSelection(state, "down")).toBe(state);
  });
});

function findNodeIdByTag(
  node: { id: string; tag: string; children: unknown[] } | undefined,
  tag: string,
): string | undefined {
  if (!node) {
    return undefined;
  }

  if (node.tag === tag) {
    return node.id;
  }

  for (const child of node.children) {
    const found = findNodeIdByTag(
      child as { id: string; tag: string; children: unknown[] },
      tag,
    );

    if (found) {
      return found;
    }
  }

  return undefined;
}
