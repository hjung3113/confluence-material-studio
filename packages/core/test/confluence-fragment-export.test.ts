import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { exportConfluenceFragment } from "../src/export/confluenceFragment.js";
import { importHtml } from "../src/import/htmlImport.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, "../../..");

const readFixture = (fixturePath: string) =>
  readFileSync(resolve(repoRoot, fixturePath), "utf8");

describe("exportConfluenceFragment", () => {
  it("wraps output in a generated Confluence material class", () => {
    const html = readFixture("fixtures/html/simple-ai-deck.html");
    const doc = importHtml({
      html,
      title: "Quarterly Product Review",
      now: "2026-06-20T00:00:00.000Z",
    });

    const artifact = exportConfluenceFragment(doc, "demo");

    expect(artifact.filename).toBe("confluence-fragment.html");
    expect(artifact.mediaType).toBe("text/html");
    expect(artifact.content).toContain('class="cf-material-demo"');
    expect(artifact.content).toContain("Quarterly Product Review");
    expect(artifact.content).not.toContain("<!doctype html>");
    expect(artifact.content).not.toContain("<html");
    expect(artifact.content).not.toContain("<script");
  });

  it("sanitizes wrapper ids before using them as classes", () => {
    const html = readFixture("fixtures/html/simple-ai-deck.html");
    const doc = importHtml({
      html,
      title: "Quarterly Product Review",
      now: "2026-06-20T00:00:00.000Z",
    });

    const artifact = exportConfluenceFragment(doc, "demo <bad>");

    expect(artifact.content).toContain('class="cf-material-demo--bad-"');
    expect(artifact.content).not.toContain("demo <bad>");
  });
});
