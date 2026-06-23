import {
  sanitizeHtmlWithStructuralSanitizer,
  type SanitizedHtml,
} from "./sanitizeHtmlBase.js";

export type { SanitizedHtml } from "./sanitizeHtmlBase.js";

export function sanitizeHtml(html: string): SanitizedHtml {
  return sanitizeHtmlWithStructuralSanitizer(html);
}
