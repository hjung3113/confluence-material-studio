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

  it("returns copies from the rule list and rule objects", () => {
    const rules = listCompatibilityRules();
    const originalMessage = rules[0]?.message;

    if (!rules[0] || !originalMessage) {
      throw new Error("expected compatibility rules to be present");
    }

    rules[0].message = "mutated copy";
    rules.pop();

    expect(listCompatibilityRules()).toHaveLength(EXPECTED_RULE_IDS.length);
    expect(listCompatibilityRules()[0]?.message).toBe(originalMessage);
  });

  it("gets a compatibility rule by id", () => {
    expect(getCompatibilityRule("HTML_SCRIPT_REMOVED")?.severity).toBe(
      "warning",
    );
  });

  it("defines complete rule metadata", () => {
    for (const rule of listCompatibilityRules()) {
      expect(rule.detector.trim()).not.toBe("");
      expect(rule.message.trim()).not.toBe("");
      expect(rule.recommendation.trim()).not.toBe("");
    }
  });

  it("uses valid targets and severities", () => {
    const validTargets = new Set([
      "standalone-html",
      "confluence-fragment",
      "native-mapping",
    ]);
    const validSeverities = new Set(["info", "warning", "error"]);

    for (const rule of listCompatibilityRules()) {
      expect(validTargets.has(rule.target)).toBe(true);
      expect(validSeverities.has(rule.severity)).toBe(true);
    }
  });

  it("uses unique rule ids", () => {
    const ruleIds = listCompatibilityRules().map((rule) => rule.id);

    expect(new Set(ruleIds).size).toBe(ruleIds.length);
  });
});
