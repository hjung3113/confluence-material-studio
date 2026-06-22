export const CORE_PACKAGE_NAME = "@htmleditor/core";

export {
  getCompatibilityRule,
  listCompatibilityRules,
} from "./compatibility/rules.js";
export { exportConfluenceFragment } from "./export/confluenceFragment.js";
export { exportNativeMappingReport } from "./export/nativeMappingReport.js";
export { buildConfluenceAdfDraft } from "./export/confluenceAdfDraft.js";
export type { ConfluenceAdfDraft } from "./export/confluenceAdfDraft.js";
export { exportProject } from "./export/exportProject.js";
export { exportStandaloneHtml } from "./export/standaloneHtml.js";
export {
  editNodeText,
  insertCalloutAfterNode,
} from "./document/editOperations.js";
export { renderTreeToHtml } from "./document/renderTreeHtml.js";
export { importHtml } from "./import/htmlImport.js";
export { importMarkdown } from "./import/markdownImport.js";
export { sanitizeHtml } from "./sanitize/sanitizeHtml.js";
export type {
  CompatibilityRule,
  CompatibilityRuleId,
} from "./compatibility/rules.js";
export type * from "./document/types.js";
export type { ExportProjectOptions } from "./export/exportProject.js";
export type { ImportHtmlInput } from "./import/htmlImport.js";
export type { ImportMarkdownInput } from "./import/markdownImport.js";
export type { SanitizedHtml } from "./sanitize/sanitizeHtml.js";
