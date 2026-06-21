import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { exportProject } from "../src/export/exportProject.js";
import { importHtml } from "../src/import/htmlImport.js";
import type { CompatibilityReport } from "../src/index.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, "../../..");

const readFixture = (fixturePath: string) =>
  readFileSync(resolve(repoRoot, fixturePath), "utf8");

describe("exportProject", () => {
  it("emits all four MVP export artifacts", () => {
    const html = readFixture("fixtures/hostile/script-and-remote-assets.html");
    const doc = importHtml({
      html,
      title: "Hostile Import",
      now: "2026-06-20T00:00:00.000Z",
    });

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
    expect(result.compatibilityReport.warnings.map((warning) => warning.ruleId))
      .toEqual([
        "HTML_REMOTE_RESOURCE",
        "HTML_SCRIPT_REMOVED",
        "HTML_INLINE_HANDLER_REMOVED",
        "HTML_JAVASCRIPT_URL",
      ]);
    expect(
      result.artifacts.find((artifact) => artifact.filename === "standalone.html")
        ?.content,
    ).not.toContain("<script");
    expect(
      result.artifacts.find(
        (artifact) => artifact.filename === "compatibility-report.json",
      )?.content,
    ).toBe(JSON.stringify(result.compatibilityReport, null, 2));
  });

  it("uses compatibility rule metadata in compatibility-report.json", () => {
    const html = readFixture("fixtures/hostile/script-and-remote-assets.html");
    const doc = importHtml({
      html,
      title: "Hostile Import",
      now: "2026-06-20T00:00:00.000Z",
    });

    const result = exportProject(doc, {
      generatedAt: "2026-06-20T00:00:00.000Z",
      fragmentId: "hostile",
    });
    const reportArtifact = result.artifacts.find(
      (artifact) => artifact.filename === "compatibility-report.json",
    );
    const report = JSON.parse(
      reportArtifact?.content ?? "{}",
    ) as CompatibilityReport;

    expect(report.warnings[0]).toMatchObject({
      ruleId: "HTML_REMOTE_RESOURCE",
      target: "standalone-html",
      severity: "warning",
      recommendation: "Replace with local asset or embedded data.",
    });
  });
});
