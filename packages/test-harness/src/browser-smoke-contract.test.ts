import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(import.meta.dirname, "../../..");

describe("browser smoke command contract", () => {
  it("exposes a root browser:smoke script for real browser verification", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(repoRoot, "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };

    expect(packageJson.scripts?.["browser:smoke"]).toBe(
      "npm run app:build && npm run browser:smoke --workspace @htmleditor/test-harness",
    );
  });
});
