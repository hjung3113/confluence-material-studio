import {
  importHtml as importHtmlWithOptions,
  type ImportHtmlInput,
} from "./htmlImport.js";
import { sanitizeHtml } from "../sanitize/sanitizeHtml.js";

export type { ImportHtmlInput } from "./htmlImport.js";

export function importHtml(input: ImportHtmlInput) {
  return importHtmlWithOptions(input, { sanitize: sanitizeHtml });
}
