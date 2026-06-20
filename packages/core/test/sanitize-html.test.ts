import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "../src/index.js";

describe("sanitizeHtml", () => {
  it("removes unsafe imported html while classifying sanitizer risks", () => {
    const result = sanitizeHtml(`
      <main onclick="alert('x')">
        <h1>Hello</h1>
        <script>alert("owned")</script>
        <a href="javascript:alert('x')">bad link</a>
        <img src="https://assets.example.com/chart.png" alt="Remote chart">
      </main>
    `);

    expect(result.html).toContain("<main>");
    expect(result.html).toContain("<h1>Hello</h1>");
    expect(result.html).not.toContain("<script");
    expect(result.html).not.toContain("onclick=");
    expect(result.html).not.toContain("javascript:");
    expect(result.warnings.map(({ ruleId }) => ruleId)).toEqual([
      "HTML_INLINE_HANDLER_REMOVED",
      "HTML_SCRIPT_REMOVED",
      "HTML_JAVASCRIPT_URL",
      "HTML_REMOTE_RESOURCE",
    ]);
  });
});
