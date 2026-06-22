import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { exportProject } from "../src/export/exportProject.js";
import { importHtml } from "../src/import/htmlImport.js";
import { importMarkdown } from "../src/import/markdownImport.js";
import type { ExportResult } from "../src/index.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, "../../..");

const readFixture = (fixturePath: string) =>
  readFileSync(resolve(repoRoot, fixturePath), "utf8");

const expectedArtifacts = [
  "standalone.html",
  "confluence-fragment.html",
  "compatibility-report.json",
  "native-mapping-report.json",
] satisfies ExportResult["artifacts"][number]["filename"][];

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

describe("MVP core smoke flow", () => {
  it("imports supported fixtures and emits the four MVP artifacts", () => {
    const docs = [
      importHtml({
        html: readFixture("fixtures/html/simple-ai-deck.html"),
        title: "Simple AI Deck",
        now: "2026-06-22T00:00:00.000Z",
      }),
      importHtml({
        html: readFixture("fixtures/html/complex-visual.html"),
        title: "Complex Visual",
        now: "2026-06-22T00:00:00.000Z",
      }),
      importHtml({
        html: readFixture("fixtures/html/confluence-friendly.html"),
        title: "Confluence Friendly",
        now: "2026-06-22T00:00:00.000Z",
      }),
      importMarkdown({
        markdown: readFixture("fixtures/markdown/product-outline.md"),
        title: "Product Outline",
        now: "2026-06-22T00:00:00.000Z",
      }),
    ];

    for (const [index, doc] of docs.entries()) {
      const result = exportProject(doc, {
        generatedAt: "2026-06-22T00:00:00.000Z",
        fragmentId: `smoke-${index + 1}`,
      });

      expect(result.artifacts.map((artifact) => artifact.filename)).toEqual(
        expectedArtifacts,
      );
      expect(artifactContent(result, "standalone.html").trim()).not.toBe("");
      expect(artifactContent(result, "confluence-fragment.html")).toContain(
        `cf-material-smoke-${index + 1}`,
      );
      expect(result.nativeMappingReport?.isConfluencePageBody).toBe(false);
    }
  });

  it("keeps hostile imports inert while reporting compatibility risks", () => {
    const doc = importHtml({
      html: readFixture("fixtures/hostile/script-and-remote-assets.html"),
      title: "Hostile Import",
      now: "2026-06-22T00:00:00.000Z",
    });
    const result = exportProject(doc, {
      generatedAt: "2026-06-22T00:00:00.000Z",
      fragmentId: "hostile-smoke",
    });
    const standalone = artifactContent(result, "standalone.html");

    expect(standalone).not.toContain("<script");
    expect(standalone).not.toContain("javascript:");
    expect(standalone).not.toContain("https://");
    expect(result.compatibilityReport.warnings.map((warning) => warning.ruleId))
      .toEqual([
        "HTML_REMOTE_RESOURCE",
        "HTML_SCRIPT_REMOVED",
        "HTML_INLINE_HANDLER_REMOVED",
        "HTML_JAVASCRIPT_URL",
      ]);
  });

  it("surfaces Confluence macro candidates and fragment CSS risks", () => {
    const doc = importHtml({
      html: readFixture("fixtures/html/confluence-friendly.html"),
      title: "Confluence Friendly",
      now: "2026-06-22T00:00:00.000Z",
    });
    const result = exportProject(doc, {
      generatedAt: "2026-06-22T00:00:00.000Z",
      fragmentId: "confluence-friendly-smoke",
    });

    expect(
      result.nativeMappingReport?.mappings
        .filter((mapping) => mapping.recommendedTarget === "macro")
        .map((mapping) => mapping.semanticRole),
    ).toEqual(
      expect.arrayContaining(["status", "callout", "panel", "expand", "code"]),
    );
    expect(result.compatibilityReport.warnings.map((warning) => warning.ruleId))
      .toEqual([
        "CF_FRAGMENT_GLOBAL_SELECTOR",
        "CF_FRAGMENT_OVERFLOW_RISK",
        "CF_FRAGMENT_VIEWPORT_UNIT",
        "CF_FRAGMENT_FIXED_POSITION",
      ]);
  });
});
