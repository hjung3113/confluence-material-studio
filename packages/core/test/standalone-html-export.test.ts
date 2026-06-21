import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { exportStandaloneHtml } from "../src/export/standaloneHtml.js";
import { importHtml } from "../src/import/htmlImport.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, "../../..");

const readFixture = (fixturePath: string) =>
  readFileSync(resolve(repoRoot, fixturePath), "utf8");

describe("exportStandaloneHtml", () => {
  it("exports sanitized render tree as standalone.html", () => {
    const html = readFixture("fixtures/html/simple-ai-deck.html");
    const doc = importHtml({
      html,
      title: "Quarterly Product Review",
      now: "2026-06-20T00:00:00.000Z",
    });

    const artifact = exportStandaloneHtml(doc);

    expect(artifact.filename).toBe("standalone.html");
    expect(artifact.mediaType).toBe("text/html");
    expect(artifact.content).toContain("<!doctype html>");
    expect(artifact.content).toContain("Quarterly Product Review");
    expect(artifact.content).toContain("metric-grid");
    expect(artifact.content).not.toContain("<script");
  });

  it("does not re-export hostile sourceArtifact content", () => {
    const html = readFixture("fixtures/hostile/script-and-remote-assets.html");
    const doc = importHtml({
      html,
      title: "Hostile Import",
      now: "2026-06-20T00:00:00.000Z",
    });

    const artifact = exportStandaloneHtml(doc);

    expect(artifact.content).not.toContain("<script");
    expect(artifact.content).not.toContain("onload=");
    expect(artifact.content).not.toContain("onclick=");
    expect(artifact.content).not.toContain("javascript:");
    expect(artifact.content).not.toContain("https://");
  });
});
