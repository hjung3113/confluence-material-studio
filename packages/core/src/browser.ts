export const CORE_PACKAGE_NAME = "@htmleditor/core";

export {
  deleteNode,
  duplicateNode,
  editNodeText,
  getNodeEditability,
  getNodeStructureMutability,
  insertCalloutAfterNode,
  insertMaterialBlockAfterNode,
  listEditableTextTargets,
  moveNode,
  updateThemeTokens,
} from "./document/editOperations.js";
export type {
  DeleteNodeInput,
  DuplicateNodeInput,
  EditableTextTarget,
  MaterialBlockType,
  MoveNodeInput,
  NodeEditability,
  NodeEditabilityStatus,
  NodeStructureMutability,
  ThemeTokenPatch,
  UpdateThemeTokensInput,
} from "./document/editOperations.js";
export { renderTreeToHtml } from "./document/renderTreeHtml.js";
export { importHtml } from "./import/htmlImport.js";
export { importMarkdown } from "./import/markdownImport.js";
export type * from "./document/types.js";
export type { ImportHtmlInput } from "./import/htmlImport.js";
export type { ImportMarkdownInput } from "./import/markdownImport.js";
