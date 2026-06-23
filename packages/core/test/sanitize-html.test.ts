import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
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
    expect(result.html).not.toContain("<iframe");
    expect(result.html).not.toContain("<object");
    expect(result.html).not.toContain("<embed");
    expect(result.html).not.toContain("onload=");
    expect(result.html).not.toContain("onclick=");
    expect(result.html).not.toContain("javascript:");
    expect(result.html).not.toContain("http://");
    expect(result.html).not.toContain("https://");
    expect(result.html).not.toContain("cdn.example.com");
    expect(result.html).not.toContain("assets.example.com");
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

  it("strips protocol-relative remote resources from attributes and css", () => {
    const result = sanitizeHtml(`
      <main>
        <style>
          @import url("//cdn.example.com/deck.css");
          @import "//cdn.example.com/theme.css";
          .hero { background-image: url(//cdn.example.com/hero.png); }
        </style>
        <p style="background: url('//cdn.example.com/bg.png')">Styled</p>
        <a href="//cdn.example.com/page">remote link</a>
        <img src="//cdn.example.com/chart.png" srcset="//cdn.example.com/chart-2x.png 2x" alt="Remote chart">
        <video poster="//cdn.example.com/poster.png"></video>
        <form action="//cdn.example.com/post">
          <button formaction="//cdn.example.com/button-post">Submit</button>
        </form>
        <svg><use xlink:href="//cdn.example.com/icons.svg#check"></use></svg>
      </main>
    `);

    expect(result.warnings.map(({ ruleId }) => ruleId)).toEqual([
      "HTML_REMOTE_RESOURCE",
    ]);
    expect(result.html).not.toContain("//cdn.example.com");
  });

  it("removes remote candidates from mixed srcset attributes", () => {
    const result = sanitizeHtml(`
      <main>
        <img
          src="./chart.png"
          srcset="./chart.png 1x, ./chart-large.png 2x, https://assets.example.com/chart-3x.png 3x, //assets.example.com/chart-4x.png 4x"
          alt="Chart"
        >
      </main>
    `);

    expect(result.warnings.map(({ ruleId }) => ruleId)).toEqual([
      "HTML_REMOTE_RESOURCE",
    ]);
    expect(result.html).toContain('src="./chart.png"');
    expect(result.html).toContain("./chart.png 1x");
    expect(result.html).toContain("./chart-large.png 2x");
    expect(result.html).not.toContain("https://assets.example.com");
    expect(result.html).not.toContain("//assets.example.com");
  });

  it("removes active iframe object and embed elements as remote resource risks", () => {
    const result = sanitizeHtml(`
      <main>
        <iframe src="./local-preview.html"></iframe>
        <object data="./deck.swf"></object>
        <embed src="./legacy-widget.swf">
        <p>Safe content</p>
      </main>
    `);

    expect(result.warnings.map(({ ruleId }) => ruleId)).toEqual([
      "HTML_REMOTE_RESOURCE",
    ]);
    expect(result.html).toContain("<p>Safe content</p>");
    expect(result.html).not.toContain("<iframe");
    expect(result.html).not.toContain("<object");
    expect(result.html).not.toContain("<embed");
  });

  it("removes escaped and variant remote CSS URLs and imports", () => {
    const result = sanitizeHtml(`
      <main>
        <style>
          @IMPORT url(https\\3a //cdn.example.com/deck.css);
          @import 'http\\00003a//cdn.example.com/theme.css';
          .hero {
            background-image: URL(\\68\\74\\74\\70\\73\\3a//assets.example.com/hero.png);
            list-style-image: url("http\\3A//assets.example.com/bullet.png");
          }
        </style>
        <p style="background: uRl(https\\00003a//assets.example.com/bg.png)">Styled</p>
      </main>
    `);

    expect(result.warnings.map(({ ruleId }) => ruleId)).toEqual([
      "HTML_REMOTE_RESOURCE",
    ]);
    expect(result.html).not.toContain("cdn.example.com");
    expect(result.html).not.toContain("assets.example.com");
    expect(result.html).not.toContain("https\\");
    expect(result.html).not.toContain("http\\");
  });

  it("removes comment-obfuscated remote CSS imports in string and url forms", () => {
    const result = sanitizeHtml(`
      <main>
        <style>
          @import/**/"https://cdn.example.com/comment-string.css";
          @import /**/ url(/**/"https://cdn.example.com/comment-url.css"/**/);
          @import/*x*/url(//cdn.example.com/comment-protocol.css);
        </style>
        <p style='background-image: url(/**/"https://assets.example.com/comment-bg.png"/**/)'>Styled</p>
      </main>
    `);

    expect(result.warnings.map(({ ruleId }) => ruleId)).toEqual([
      "HTML_REMOTE_RESOURCE",
    ]);
    expect(result.html).not.toContain("cdn.example.com");
    expect(result.html).not.toContain("assets.example.com");
    expect(result.html).not.toContain("https://");
    expect(result.html).not.toContain("//cdn.example.com");
  });

  it("keeps dangerous content inert when the structural sanitizer library is unavailable", () => {
    const fallbackProcess = Object.create(process) as typeof process;
    Object.defineProperty(fallbackProcess, "getBuiltinModule", {
      configurable: true,
      value: undefined,
    });

    vi.stubGlobal("process", fallbackProcess);

    try {
      const result = sanitizeHtml(`
        <main onclick="alert('x')">
          <style>
            @import/**/"https://cdn.example.com/fallback.css";
            .hero { background: url(https://assets.example.com/fallback.png); }
          </style>
          <script>alert("owned")</script>
          <iframe src="./local-preview.html"></iframe>
          <object data="./deck.swf"></object>
          <embed src="./legacy-widget.swf">
          <a href="javascript:alert('x')">bad link</a>
          <img src="./chart.png" srcset="./chart.png 1x, https://assets.example.com/chart-2x.png 2x, //assets.example.com/chart-3x.png 3x" alt="Chart">
          <p>Safe content</p>
        </main>
      `);

      expect(result.warnings.map(({ ruleId }) => ruleId)).toEqual([
        "HTML_REMOTE_RESOURCE",
        "HTML_SCRIPT_REMOVED",
        "HTML_INLINE_HANDLER_REMOVED",
        "HTML_JAVASCRIPT_URL",
      ]);
      expect(result.html).toContain("<p>Safe content</p>");
      expect(result.html).toContain("./chart.png 1x");
      expect(result.html).not.toContain("<script");
      expect(result.html).not.toContain("<iframe");
      expect(result.html).not.toContain("<object");
      expect(result.html).not.toContain("<embed");
      expect(result.html).not.toContain("onclick=");
      expect(result.html).not.toContain("javascript:");
      expect(result.html).not.toContain("cdn.example.com");
      expect(result.html).not.toContain("assets.example.com");
      expect(result.html).not.toContain("https://");
      expect(result.html).not.toContain("//assets.example.com");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("removes escaped at-keyword remote CSS imports", () => {
    const result = sanitizeHtml(`
      <main>
        <style>
          @\\69mport "https://cdn.example.com/escaped-lower.css";
          @\\000049MPORT url("https://cdn.example.com/escaped-upper.css");
          @\\69 mport/**/"//cdn.example.com/escaped-spaced.css";
        </style>
      </main>
    `);

    expect(result.warnings.map(({ ruleId }) => ruleId)).toEqual([
      "HTML_REMOTE_RESOURCE",
    ]);
    expect(result.html).not.toContain("cdn.example.com");
    expect(result.html).not.toContain("https://");
    expect(result.html).not.toContain("//cdn.example.com");
  });

  it("removes javascript CSS urls from style elements and attributes", () => {
    const result = sanitizeHtml(`
      <main>
        <style>
          .a { background-image: url(javascript:alert("tag")); }
          .b { list-style-image: URL("\\6a avascript:alert('escaped-tag')"); }
        </style>
        <p style="background: url(javascript:alert('attr'))">Styled</p>
        <p style="background: url(\\00006aavascript:alert('escaped-attr'))">Escaped</p>
      </main>
    `);

    expect(result.warnings.map(({ ruleId }) => ruleId)).toEqual([
      "HTML_JAVASCRIPT_URL",
    ]);
    expect(result.html).not.toContain("javascript:");
    expect(result.html).not.toContain("\\6a");
    expect(result.html).not.toContain("\\00006a");
  });
});
