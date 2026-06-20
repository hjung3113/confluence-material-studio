import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "../src/index.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, "../../..");

const readFixture = (fixturePath: string) =>
  readFileSync(resolve(repoRoot, fixturePath), "utf8");

describe("sanitizeHtml", () => {
  it("removes unsafe imported html while classifying sanitizer risks", () => {
    const result = sanitizeHtml(`
      <main onclick="alert('x')">
        <style>
          @import url("https://cdn.example.com/deck.css");
          .hero { background-image: url(http://assets.example.com/hero.png); }
        </style>
        <h1>Hello</h1>
        <p style="background: url(https://assets.example.com/bg.png)">Styled</p>
        <script>alert("owned")</script>
        <a href="javascript:alert('x')">bad link</a>
        <a href="https://example.com/remote">remote link</a>
        <img src="https://assets.example.com/chart.png" srcset="https://assets.example.com/chart-2x.png 2x" alt="Remote chart">
        <video poster="https://assets.example.com/poster.png"></video>
        <form action="https://example.com/post">
          <button formaction="https://example.com/button-post">Submit</button>
        </form>
        <svg><use xlink:href="https://assets.example.com/icons.svg#check"></use></svg>
      </main>
    `);

    expect(result.html).toContain("<main>");
    expect(result.html).toContain("<h1>Hello</h1>");
    expect(result.html).not.toContain("<script");
    expect(result.html).not.toContain("onclick=");
    expect(result.html).not.toContain("javascript:");
    expect(result.html).not.toContain("http://");
    expect(result.html).not.toContain("https://");
    expect(result.warnings.map(({ ruleId }) => ruleId)).toEqual([
      "HTML_REMOTE_RESOURCE",
      "HTML_SCRIPT_REMOVED",
      "HTML_INLINE_HANDLER_REMOVED",
      "HTML_JAVASCRIPT_URL",
    ]);
  });

  it("sanitizes the hostile import fixture against expected compatibility rules", () => {
    const html = readFixture("fixtures/hostile/script-and-remote-assets.html");
    const expected = JSON.parse(
      readFixture("fixtures/expected/hostile-compatibility-rules.json"),
    ) as { ruleIds: string[] };

    const result = sanitizeHtml(html);

    expect(result.warnings.map(({ ruleId }) => ruleId)).toEqual(
      expected.ruleIds,
    );
    expect(result.html).not.toContain("<script");
    expect(result.html).not.toContain("onload=");
    expect(result.html).not.toContain("onclick=");
    expect(result.html).not.toContain("javascript:");
    expect(result.html).not.toContain("http://");
    expect(result.html).not.toContain("https://");
  });

  it("dedupes warnings in compatibility catalog order", () => {
    const result = sanitizeHtml(`
      <main onclick="alert('x')">
        <script>alert("owned")</script>
        <a href="javascript:alert('x')">bad link</a>
        <img src="https://assets.example.com/chart.png" alt="Remote chart">
      </main>
    `);

    expect(result.warnings.map(({ ruleId }) => ruleId)).toEqual([
      "HTML_REMOTE_RESOURCE",
      "HTML_SCRIPT_REMOVED",
      "HTML_INLINE_HANDLER_REMOVED",
      "HTML_JAVASCRIPT_URL",
    ]);
  });
});
