import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, "../../..");

const readFixture = (fixturePath: string) =>
  readFileSync(resolve(repoRoot, fixturePath), "utf8");

describe("import fixtures", () => {
  it("includes a supported AI deck fixture", () => {
    const html = readFixture("fixtures/html/simple-ai-deck.html");

    expect(html).toContain("<section");
    expect(html).toContain("Quarterly Product Review");
    expect(html).toContain("<style>");
  });

  it("includes a hostile HTML fixture and expected compatibility rules", () => {
    const html = readFixture("fixtures/hostile/script-and-remote-assets.html");
    const expected = JSON.parse(
      readFixture("fixtures/expected/hostile-compatibility-rules.json"),
    ) as { ruleIds: string[] };

    expect(html).toContain("<script>");
    expect(html).toContain("onclick=");
    expect(expected.ruleIds).toEqual([
      "HTML_REMOTE_RESOURCE",
      "HTML_SCRIPT_REMOVED",
      "HTML_INLINE_HANDLER_REMOVED",
      "HTML_JAVASCRIPT_URL",
    ]);
  });
});
