# Decision Log

## 2026-06-20: Product is Confluence Material Studio

Decision: The product is a Confluence material studio, not a PPT replacement and not a raw HTML editor.

Rationale: Users need presentation-style material creation and Confluence-oriented outputs, not presentation runtime features.

## 2026-06-20: Use Render Tree Plus Semantic Overlay

Decision: Persist a canonical render tree for visual output and semantic overlay for editing/mapping.

Rationale: Semantic-only models risk changing imported HTML appearance. Render-tree-first export preserves standalone HTML fidelity better.

## 2026-06-20: Preserve Immutable Source Artifact

Decision: Imported source is stored as `sourceArtifact` for audit, fallback, and visual comparison. It is not an official MVP export artifact.

Rationale: Users need fallback, visual comparison, and auditability when import normalization changes output, while executable original HTML re-export would conflict with MVP safety and export-contract boundaries.

## 2026-06-20: MVP Does Not Claim Native Confluence Page Export

Decision: MVP produces `native-mapping-report.json`, not verified Confluence page serialization.

Rationale: Real native export requires separate validation against Confluence formats and rendering behavior.

## 2026-06-20: No Imported Script Execution in MVP

Decision: Imported scripts and inline event handlers are not executed.

Rationale: Security and output determinism matter more than preserving arbitrary dynamic behavior in MVP.

## 2026-06-20: Preserve CSS for Output, Limit CSS Editability

Decision: MVP preserves safe imported CSS for standalone visual output where practical, but does not convert arbitrary CSS into a fully editable semantic model.

Rationale: Standalone visual fidelity is central to the product, but full CSS interpretation would turn the MVP into a browser/editor engine. Editor controls should expose theme tokens and supported section/block settings; unsupported safe CSS is preserved or reported rather than silently dropped.

## 2026-06-20: Confluence Fragment Is HTML-Capable Context Output

Decision: `confluence-fragment.html` is a scoped HTML artifact for HTML-capable Confluence contexts, not a verified Confluence storage-format page body.

Rationale: Confluence rendering and publishing behavior varies by format, tenant capability, and integration path. The MVP should make this boundary explicit while still producing a useful fragment artifact.

## 2026-06-20: Compatibility Severity Is Target-Scoped

Decision: Compatibility `error`, `warning`, and `info` severities apply to the affected export target, not necessarily to the entire project.

Rationale: A document may be unsafe for native mapping or Confluence fragment export while still being safely exportable as standalone HTML after sanitization.

## 2026-06-20: Locked Nodes Preserve Fidelity Before Editability

Decision: Unknown or complex imported structures may become locked nodes that remain displayable and exportable with reduced editing controls.

Rationale: Deleting or over-normalizing unknown structures would break the product's preservation promise. Locked nodes make the editability limitation explicit.

## 2026-06-20: First Implementation Slice Starts In Core

Decision: The first implementation slice builds `packages/core` import, sanitization, compatibility, and export behavior before any app UI.

Rationale: The product contract depends on deterministic artifact generation. Building core first gives the UI a stable API and avoids reimplementing parser/export logic in the app layer.
