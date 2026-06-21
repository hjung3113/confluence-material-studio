# Sanitizer Policy

## Default Policy

MVP does not execute imported scripts or imported inline event handlers.

The sanitizer classifies unsafe content, records it in reports, and prevents execution in generated MVP artifacts.

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

## Remote Resource Policy

- Remote images, CSS, fonts, scripts, iframes, and embeds produce `HTML_REMOTE_RESOURCE`.
- Users may later replace remote assets with local files.
- Generated MVP output must not depend on external CDN/runtime network resources unless an explicit non-default export profile is introduced later.
- Remote references may remain recorded as unresolved asset metadata; they must not be fetched automatically during import or export.

## iFrame and Embed Policy

- Imported iframes and embeds are not executed in MVP.
- They are represented as locked or inert stand-in render nodes with warnings.
- Future iframe/Forge targets can revisit this policy.

## Audit Requirements

Sanitization must emit transformation trace entries with:

- rule ID
- affected node or attribute
- action taken
- user-facing message
