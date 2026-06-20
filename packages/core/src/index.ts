export const CORE_PACKAGE_NAME = "@htmleditor/core";

export {
  getCompatibilityRule,
  listCompatibilityRules,
} from "./compatibility/rules.js";
export type {
  CompatibilityRule,
  CompatibilityRuleId,
} from "./compatibility/rules.js";
export type * from "./document/types.js";
