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
    expect(artifact.content).not.toContain("<title");
    expect(artifact.content).not.toContain("<meta");
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

  it("scopes embedded CSS to the generated Confluence material class", () => {
    const html = readFixture("fixtures/html/simple-ai-deck.html");
    const doc = importHtml({
      html,
      title: "Quarterly Product Review",
      now: "2026-06-20T00:00:00.000Z",
    });

    const artifact = exportConfluenceFragment(doc, "demo");

    expect(artifact.content).toContain(".cf-material-demo .deck");
    expect(artifact.content).toContain(".cf-material-demo .hero");
    expect(artifact.content).toContain(".cf-material-demo .metric-grid");
    expect(artifact.content).not.toContain(":root {");
    expect(artifact.content).not.toContain("body {");
  });

  it("scopes nested media rules without corrupting at-rules", () => {
    const doc = importHtml({
      html: `
        <style>
          @media (max-width: 700px) {
            .card {
              display: block;
            }
          }

          @keyframes fade {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
        </style>
        <section class="card">Responsive card</section>
      `,
      title: "Responsive Fragment",
      now: "2026-06-21T00:00:00.000Z",
    });

    const artifact = exportConfluenceFragment(doc, "demo");

    expect(artifact.content).toContain("@media (max-width: 700px)");
    expect(artifact.content).toContain(".cf-material-demo .card");
    expect(artifact.content).toContain("@keyframes fade");
    expect(artifact.content).toContain("from {");
    expect(artifact.content).not.toContain(".cf-material-demo @media");
    expect(artifact.content).not.toContain(".cf-material-demo @keyframes");
    expect(artifact.content).not.toContain(".cf-material-demo from");
  });

  it("preserves semicolon at-rules without preventing later selector scoping", () => {
    const doc = importHtml({
      html: `
        <style>
          @charset "UTF-8";
          .card {
            color: red;
          }
        </style>
        <section class="card">Encoded card</section>
      `,
      title: "At Rule Fragment",
      now: "2026-06-21T00:00:00.000Z",
    });

    const artifact = exportConfluenceFragment(doc, "demo");

    expect(artifact.content).toContain('@charset "UTF-8";');
    expect(artifact.content).toContain(".cf-material-demo .card");
    expect(artifact.content).not.toContain('@charset "UTF-8";\n          .card');
  });
});
