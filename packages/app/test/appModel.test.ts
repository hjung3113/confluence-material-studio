import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  createAppState,
  deleteSelectedSection,
  duplicateSelectedSection,
  editSelectedText,
  exportCurrentProject,
  importFixture,
  reorderSelectedSection,
  selectNodeByRole,
  setPreviewWidth,
  updateThemeColor,
} from "../src/appModel.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, "../../..");

const readFixture = (fixturePath: string) =>
  readFileSync(resolve(repoRoot, fixturePath), "utf8");

describe("app model", () => {
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
    state = updateThemeColor(state, "accent", "#0f766e");
    state = setPreviewWidth(state, "tablet");
    state = reorderSelectedSection(state, "down");
    state = duplicateSelectedSection(state);
    state = deleteSelectedSection(state);

    const result = exportCurrentProject(state);

    expect(state.previewWidth).toBe("tablet");
    expect(state.doc?.themeTokens.colors.accent).toBe("#0f766e");
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
});
