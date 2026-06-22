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

  it("includes an Atlaskit ADF draft preview for native-compatible roles", () => {
    const html = `
      <main>
        <section>
          <h1>Release Readiness</h1>
          <p>Every target needs evidence.</p>
          <p class="status-pill">On track</p>
          <aside class="callout" data-confluence-macro="note">
            <h2>Migration note</h2>
            <p>Native mapping is a report, not a page body.</p>
          </aside>
          <pre><code>npm run verify</code></pre>
        </section>
      </main>
    `;
    const doc = importHtml({
      html,
      title: "Release Readiness",
      now: "2026-06-22T00:00:00.000Z",
    });

    const artifact = exportNativeMappingReport(
      doc,
      "2026-06-22T00:00:00.000Z",
    );
    const report = JSON.parse(artifact.content) as NativeMappingReport;

    expect(report.isConfluencePageBody).toBe(false);
    expect(report.confluenceAdfDraft?.schemaSource).toBe("@atlaskit/adf-schema");
    expect(report.confluenceAdfDraft?.validation).toEqual({
      status: "valid",
      validator: "@atlaskit/adf-schema",
    });
    expect(report.confluenceAdfDraft?.document).toMatchObject({
      type: "doc",
      version: 1,
    });
    expect(report.confluenceAdfDraft?.document.content).toEqual(
      expect.arrayContaining([
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Release Readiness" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Every target needs evidence." }],
        },
        {
          type: "panel",
          attrs: { panelType: "note" },
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Migration note Native mapping is a report, not a page body.",
                },
              ],
            },
          ],
        },
        {
          type: "codeBlock",
          attrs: { language: "text" },
          content: [{ type: "text", text: "npm run verify" }],
        },
      ]),
    );
    expect(
      report.confluenceAdfDraft?.document.content.some(
        (node) =>
          node.type === "paragraph" &&
          node.content?.some((child) => child.type === "status"),
      ),
    ).toBe(true);
  });
});
