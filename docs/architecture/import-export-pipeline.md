# Import and Export Pipeline

## Import Pipeline

HTML import stages:

1. Capture `sourceArtifact`.
2. Parse input with browser-compatible HTML parsing.
3. Apply sanitizer policy.
4. Build canonical render tree.
5. Extract assets and classify remote references.
6. Detect semantic overlay roles.
7. Run compatibility rules.
8. Emit import report and transformation trace.

CSS handling:

- Preserve inline styles, class names, and local style text where safe.
- Do not attempt to convert arbitrary CSS into fully editable semantic fields.
- Promote only supported style controls into `themeTokens` or section/block settings.
- Preserve unsupported but safe CSS for standalone output or report target-specific risks.

Markdown/outline import stages:

1. Capture `sourceArtifact`.
2. Parse headings and content blocks.
3. Build section-oriented render tree.
4. Assign semantic overlay roles.
5. Apply default theme tokens.
6. Run compatibility rules.
7. Emit import report.

The current MVP Markdown subset covers headings, paragraphs, ordered and unordered lists, and fenced code blocks.

## Export Pipeline

All exporters return:

```ts
type ExportResult = {
  artifacts: ExportArtifact[];
  compatibilityReport: CompatibilityReport;
};
```

Rules:

- Exporters must not silently drop content.
- If a node cannot be represented, the report must include a rule ID.
- Exporters must be deterministic for the same `ProjectDoc`.

## Standalone HTML Export

Artifact: `standalone.html`

Input:

- `renderTree`
- `themeTokens`
- normalized local assets

Contract:

- Prioritize visual fidelity.
- Include CSS locally.
- Preserve safe imported CSS where practical, even when the editor cannot expose every property as an editable control.
- Avoid external CDN/runtime network dependency.
- Do not execute imported scripts in MVP.

## Confluence Fragment Export

Artifact: `confluence-fragment.html`

Input:

- `renderTree`
- `themeTokens`
- compatibility rules for Confluence fragment target

Contract:

- Scope CSS under a generated wrapper class.
- Emit constrained-width safe HTML.
- Emit warnings for fixed positioning, viewport units, overflow risks, remote assets, and unsupported dynamic behavior.
- The fragment is a scoped HTML artifact for HTML-capable Confluence contexts, not a verified universal Confluence page body.

## Native Mapping Report Export

Artifact: `native-mapping-report.json`

Input:

- `semanticOverlay`
- Confluence macro mapping rules

Contract:

- Explain which nodes can map to native Confluence content or macros.
- Explain which nodes are fragment-only or future iframe/Forge candidates.
- Do not claim to be a Confluence page body.
- Treat status, callout, panel, expand, and code roles as macro candidates in the mapping report.

## Failure Modes

- Invalid input: importer returns a typed failure with no partial project unless recoverable.
- Unsafe script/dynamic content: importer records inert metadata where useful, removes executable behavior from MVP outputs, and emits warnings.
- Unsupported but safe structure or CSS: importer preserves renderable output where practical and emits compatibility warnings when target fidelity is at risk.
- Missing assets: importer records unresolved references and marks affected exports at risk.
- Export mismatch risk: compatibility report marks target and rule ID.
