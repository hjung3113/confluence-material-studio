export const CORE_PACKAGE_NAME = "@htmleditor/core";

export {
  getCompatibilityRule,
  listCompatibilityRules,
} from "./compatibility/rules.js";
export { exportConfluenceFragment } from "./export/confluenceFragment.js";
export { exportNativeMappingReport } from "./export/nativeMappingReport.js";
export { exportProject } from "./export/exportProject.js";
export { exportStandaloneHtml } from "./export/standaloneHtml.js";
export { importHtml } from "./import/htmlImport.js";
export { sanitizeHtml } from "./sanitize/sanitizeHtml.js";
export type {
  CompatibilityRule,
  CompatibilityRuleId,
} from "./compatibility/rules.js";
export type * from "./document/types.js";
export type { ExportProjectOptions } from "./export/exportProject.js";
export type { ImportHtmlInput } from "./import/htmlImport.js";
export type { SanitizedHtml } from "./sanitize/sanitizeHtml.js";
