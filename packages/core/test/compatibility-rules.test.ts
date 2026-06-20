import { describe, expect, it } from "vitest";
import {
  getCompatibilityRule,
  listCompatibilityRules,
} from "../src/index.js";

const EXPECTED_RULE_IDS = [
  "HTML_REMOTE_RESOURCE",
  "HTML_SCRIPT_REMOVED",
  "HTML_INLINE_HANDLER_REMOVED",
  "HTML_JAVASCRIPT_URL",
  "CF_FRAGMENT_FIXED_POSITION",
  "CF_FRAGMENT_VIEWPORT_UNIT",
  "CF_FRAGMENT_GLOBAL_SELECTOR",
  "CF_FRAGMENT_OVERFLOW_RISK",
  "CF_NATIVE_UNMAPPED_LAYOUT",
  "CF_NATIVE_VISUAL_LOSS",
] as const;

describe("compatibility rule catalog", () => {
  it("lists stable rule ids in catalog order", () => {
    expect(listCompatibilityRules().map((rule) => rule.id)).toEqual(
      EXPECTED_RULE_IDS,
    );
  });

  it("returns copies from the rule list", () => {
    const rules = listCompatibilityRules();
    rules.pop();

    expect(listCompatibilityRules()).toHaveLength(EXPECTED_RULE_IDS.length);
  });

  it("gets a compatibility rule by id", () => {
    expect(getCompatibilityRule("HTML_SCRIPT_REMOVED")?.severity).toBe(
      "warning",
    );
  });
});
