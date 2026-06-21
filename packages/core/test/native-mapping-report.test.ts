import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { exportNativeMappingReport } from "../src/export/nativeMappingReport.js";
import { importHtml } from "../src/import/htmlImport.js";
import type { NativeMappingReport } from "../src/index.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, "../../..");

const readFixture = (fixturePath: string) =>
  readFileSync(resolve(repoRoot, fixturePath), "utf8");

describe("exportNativeMappingReport", () => {
  it("emits mapping entries without claiming page body serialization", () => {
    const html = readFixture("fixtures/html/simple-ai-deck.html");
    const doc = importHtml({
      html,
      title: "Quarterly Product Review",
      now: "2026-06-20T00:00:00.000Z",
    });

    const artifact = exportNativeMappingReport(
      doc,
      "2026-06-20T00:00:00.000Z",
    );
    const report = JSON.parse(artifact.content) as NativeMappingReport;

    expect(artifact.filename).toBe("native-mapping-report.json");
    expect(artifact.mediaType).toBe("application/json");
    expect(report.artifactKind).toBe("native-mapping-report");
    expect(report.documentVersion).toBe("0.1.0");
    expect(report.isConfluencePageBody).toBe(false);
    expect(report.mappings.some((entry) => entry.semanticRole === "title")).toBe(
      true,
    );
  });
});
