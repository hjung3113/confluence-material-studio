import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { exportProject } from "../src/export/exportProject.js";
import { importHtml } from "../src/import/htmlImport.js";
import type { NativeMappingReport, SemanticRole } from "../src/index.js";

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

describe("confluence-friendly HTML fixture", () => {
  it("reports macro-oriented roles without claiming native page serialization", () => {
    const html = readFixture("fixtures/html/confluence-friendly.html");
    const doc = importHtml({
      html,
      title: "Confluence Friendly Fixture",
      now: "2026-06-22T00:00:00.000Z",
    });
    const result = exportProject(doc, {
      generatedAt: "2026-06-22T00:00:00.000Z",
      fragmentId: "confluence-friendly",
    });

    const roles = new Set(doc.semanticOverlay.map((entry) => entry.role));

    for (const role of [
      "status",
      "callout",
      "panel",
      "expand",
      "code",
      "list",
    ] satisfies SemanticRole[]) {
      expect(roles.has(role)).toBe(true);
    }

    const nativeReport = JSON.parse(
      artifactContent(result, "native-mapping-report.json"),
    ) as NativeMappingReport;

    expect(nativeReport.isConfluencePageBody).toBe(false);
    expect(
      nativeReport.mappings
        .filter((mapping) =>
          ["status", "callout", "panel", "expand", "code"].includes(
            mapping.semanticRole,
          ),
        )
        .map((mapping) => mapping.recommendedTarget),
    ).toEqual(expect.arrayContaining(["macro"]));
  });

  it("emits Confluence fragment CSS risk warnings with stable rule ids", () => {
    const html = readFixture("fixtures/html/confluence-friendly.html");
    const doc = importHtml({
      html,
      title: "Confluence Friendly Fixture",
      now: "2026-06-22T00:00:00.000Z",
    });

    const result = exportProject(doc, {
      generatedAt: "2026-06-22T00:00:00.000Z",
      fragmentId: "confluence friendly!",
    });

    expect(artifactContent(result, "confluence-fragment.html")).toContain(
      'class="cf-material-confluence-friendly-"',
    );
    expect(result.compatibilityReport.warnings.map((warning) => warning.ruleId))
      .toEqual([
        "CF_FRAGMENT_GLOBAL_SELECTOR",
        "CF_FRAGMENT_OVERFLOW_RISK",
        "CF_FRAGMENT_VIEWPORT_UNIT",
        "CF_FRAGMENT_FIXED_POSITION",
      ]);
    expect(
      result.compatibilityReport.warnings.map((warning) => warning.target),
    ).toEqual([
      "confluence-fragment",
      "confluence-fragment",
      "confluence-fragment",
      "confluence-fragment",
    ]);
  });
});
