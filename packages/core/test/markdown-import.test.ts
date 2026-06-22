import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { exportProject } from "../src/export/exportProject.js";
import { importMarkdown } from "../src/import/markdownImport.js";
import type { NativeMappingReport } from "../src/index.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, "../../..");

const readFixture = (fixturePath: string) =>
  readFileSync(resolve(repoRoot, fixturePath), "utf8");

const artifactContent = (
  result: ReturnType<typeof exportProject>,
  filename: ReturnType<typeof exportProject>["artifacts"][number]["filename"],
) => {
  const artifact = result.artifacts.find((item) => item.filename === filename);

  if (!artifact) {
    throw new Error(`Missing export artifact: ${filename}`);
  }

  return artifact.content;
};

describe("importMarkdown", () => {
  it("creates a ProjectDoc with sections, native mappings, and immutable markdown source", () => {
    const markdown = readFixture("fixtures/markdown/product-outline.md");

    const doc = importMarkdown({
      markdown,
      title: "Quarterly Product Review",
      now: "2026-06-22T00:00:00.000Z",
    });

    expect(doc.sourceArtifact).toMatchObject({
      kind: "markdown",
      content: markdown,
      createdAt: "2026-06-22T00:00:00.000Z",
    });
    expect(doc.renderTree.tag).toBe("document");
    expect(doc.renderTree.children[0]?.tag).toBe("main");
    expect(doc.semanticOverlay.filter((entry) => entry.role === "section"))
      .toHaveLength(3);
    expect(doc.semanticOverlay.some((entry) => entry.role === "list")).toBe(
      true,
    );
    expect(doc.semanticOverlay.some((entry) => entry.role === "code")).toBe(
      true,
    );
    expect(
      doc.semanticOverlay.every(
        (entry) => entry.confluenceMapping.recommendedTarget === "native",
      ),
    ).toBe(true);
    expect(doc.transformationTrace).toEqual([
      {
        id: "trace-import-1",
        stage: "import",
        message: "Imported Markdown outline into ProjectDoc render tree.",
        createdAt: "2026-06-22T00:00:00.000Z",
      },
    ]);
  });

  it("exports markdown outlines as all four MVP artifacts with native report coverage", () => {
    const markdown = readFixture("fixtures/markdown/product-outline.md");
    const doc = importMarkdown({
      markdown,
      title: "Quarterly Product Review",
      now: "2026-06-22T00:00:00.000Z",
    });

    const result = exportProject(doc, {
      generatedAt: "2026-06-22T00:00:00.000Z",
      fragmentId: "markdown-outline",
    });

    expect(result.artifacts.map((artifact) => artifact.filename)).toEqual([
      "standalone.html",
      "confluence-fragment.html",
      "compatibility-report.json",
      "native-mapping-report.json",
    ]);
    expect(artifactContent(result, "standalone.html")).toContain(
      "<h1>Quarterly Product Review</h1>",
    );
    expect(artifactContent(result, "confluence-fragment.html")).toContain(
      'class="cf-material-markdown-outline"',
    );
    expect(result.compatibilityReport.warnings).toEqual([]);

    const nativeReport = JSON.parse(
      artifactContent(result, "native-mapping-report.json"),
    ) as NativeMappingReport;

    expect(nativeReport.isConfluencePageBody).toBe(false);
    expect(nativeReport.mappings.every((mapping) => mapping.recommendedTarget === "native"))
      .toBe(true);
    expect(nativeReport.mappings.map((mapping) => mapping.semanticRole)).toEqual(
      expect.arrayContaining(["document", "section", "title", "paragraph", "list", "code"]),
    );
  });
});
