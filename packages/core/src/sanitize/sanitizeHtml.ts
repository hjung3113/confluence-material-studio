import sanitizeHtmlLibrary from "sanitize-html";
import {
  ACTIVE_EMBED_TAG_NAMES,
  sanitizeHtmlWithStructuralSanitizer,
  type SanitizedHtml,
} from "./sanitizeHtmlBase.js";

export type { SanitizedHtml } from "./sanitizeHtmlBase.js";

export function sanitizeHtml(html: string): SanitizedHtml {
  return sanitizeHtmlWithStructuralSanitizer(html, (dirtyHtml) =>
    sanitizeHtmlLibrary(dirtyHtml, {
      allowedAttributes: false,
      allowedTags: false,
      allowVulnerableTags: true,
      exclusiveFilter: (frame) =>
        frame.tag === "script" || ACTIVE_EMBED_TAG_NAMES.has(frame.tag),
    }),
  );
}
