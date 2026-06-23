# Sanitizer Policy

## Default Policy

MVP does not execute imported scripts or imported inline event handlers.

The sanitizer classifies unsafe content, records it in reports, and prevents execution in generated MVP artifacts.

The browser import sanitizer is the project-owned parse5/CSS policy so the app does not pull Node-oriented sanitizer code into the initial browser graph. The full Node `sanitizeHtml()` API applies `sanitize-html` as an additional structural hardening layer, then keeps the project-owned parse5/CSS classifier for compatibility warnings and extra URL cleanup.

## Script Policy

- `<script>` content is not executed.
- `<script>` nodes are excluded from MVP exports.
- Removed scripts produce `HTML_SCRIPT_REMOVED`.
- Script text may be retained only in non-executable metadata for audit/debug.
- Sanitizer removal must not mutate `sourceArtifact`.

## Inline Event Handler Policy

- Attributes such as `onclick`, `onload`, and `onerror` are disabled or removed.
- Removed handlers produce `HTML_INLINE_HANDLER_REMOVED`.

## URL Policy

- `javascript:` URLs are rejected and produce `HTML_JAVASCRIPT_URL`.
- Remote `http` or `https` assets are allowed only as recorded unresolved references during import.
- Export must not fetch remote assets automatically.
- `srcset` candidates are classified individually; remote candidates are removed while local/data candidates may remain.
- CSS `url(...)` and `@import` forms are normalized for comments/escapes before remote or `javascript:` detection.

## Remote Resource Policy

- Remote images, CSS, fonts, scripts, iframes, and embeds produce `HTML_REMOTE_RESOURCE`.
- Users may later replace remote assets with local files.
- Generated MVP output must not depend on external CDN/runtime network resources unless an explicit non-default export profile is introduced later.
- Remote references may remain recorded as unresolved asset metadata; they must not be fetched automatically during import or export.

## iFrame and Embed Policy

- Imported iframes and embeds are not executed in MVP.
- They are represented as locked or inert stand-in render nodes with warnings.
- Future iframe/Forge targets can revisit this policy.
- In the current sanitizer, active embed tags such as `iframe`, `object`, and `embed` are removed from executable output and reported as remote-resource risk.

## Library Hardening And Fallback

`sanitize-html` is the preferred Node structural sanitizer for broad HTML cleanup, but it is not the only security boundary and must not be assumed to run in the browser import path.

- parse5 classification runs before structural cleanup so removed content still produces audit warnings.
- project-owned URL/CSS cleanup runs after structural cleanup so escaped CSS and preserved style text remain classified.
- browser-safe behavior must not re-enable scripts, active embeds, inline handlers, `javascript:` URLs, or remote runtime dependencies.
- tests must cover both the Node library path and the browser-safe path.

## Audit Requirements

Sanitization must emit transformation trace entries with:

- rule ID
- affected node or attribute
- action taken
- user-facing message

Import review surfaces these entries as operator evidence. It should report sanitizer warning count/rule IDs separately from editability evidence and export-target compatibility warnings.
