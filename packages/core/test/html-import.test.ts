import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { importHtml } from "../src/import/htmlImport.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, "../../..");

const readFixture = (fixturePath: string) =>
  readFileSync(resolve(repoRoot, fixturePath), "utf8");

describe("importHtml", () => {
  it("creates a ProjectDoc with immutable source artifact and render tree", () => {
    const html = readFixture("fixtures/html/simple-ai-deck.html");

    const doc = importHtml({
      html,
      title: "Quarterly Product Review",
      now: "2026-06-20T00:00:00.000Z",
    });

    expect(doc.version).toBe("0.1.0");
    expect(doc.sourceArtifact?.content).toBe(html);
    expect(doc.sourceArtifact?.kind).toBe("html");
    expect(doc.renderTree.tag).toBe("document");
    expect(doc.renderTree.children.length).toBeGreaterThan(0);
    expect(doc.semanticOverlay.some((entry) => entry.role === "title")).toBe(
      true,
    );
    expect(doc.transformationTrace.map((entry) => entry.stage)).toContain(
      "import",
    );
  });

  it("imports hostile HTML without executable or network-dependent output", () => {
    const html = readFixture("fixtures/hostile/script-and-remote-assets.html");

    const doc = importHtml({
      html,
      title: "Hostile Import",
      now: "2026-06-20T00:00:00.000Z",
    });

    const serializedTree = JSON.stringify(doc.renderTree);

    expect(serializedTree).not.toContain("<script");
    expect(serializedTree).not.toContain("onload");
    expect(serializedTree).not.toContain("onclick");
    expect(serializedTree).not.toContain("javascript:");
    expect(serializedTree).not.toContain("https://");
    expect(
      doc.transformationTrace
        .map((entry) => entry.ruleId)
        .filter((ruleId): ruleId is NonNullable<typeof ruleId> =>
          Boolean(ruleId),
        ),
    ).toEqual([
      "HTML_REMOTE_RESOURCE",
      "HTML_SCRIPT_REMOVED",
      "HTML_INLINE_HANDLER_REMOVED",
      "HTML_JAVASCRIPT_URL",
    ]);
  });
});
