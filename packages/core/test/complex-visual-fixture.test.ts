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
          mapping.recommendedTarget === "fragment" &&
          mapping.expectedVisualLoss === "material",
      ),
    ).toBe(true);
  });
});
