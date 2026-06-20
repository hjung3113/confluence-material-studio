# Decision Log

## 2026-06-20: Product is Confluence Material Studio

Decision: The product is a Confluence material studio, not a PPT replacement and not a raw HTML editor.

Rationale: Users need presentation-style material creation and Confluence-oriented outputs, not presentation runtime features.

## 2026-06-20: Use Render Tree Plus Semantic Overlay

Decision: Persist a canonical render tree for visual output and semantic overlay for editing/mapping.

Rationale: Semantic-only models risk changing imported HTML appearance. Render-tree-first export preserves standalone HTML fidelity better.

## 2026-06-20: Preserve Immutable Source Artifact

Decision: Imported source is stored as `sourceArtifact`.

Rationale: Users need fallback, visual comparison, and auditability when import normalization changes output.

## 2026-06-20: MVP Does Not Claim Native Confluence Page Export

Decision: MVP produces `native-mapping-report.json`, not verified Confluence page serialization.

Rationale: Real native export requires separate validation against Confluence formats and rendering behavior.

## 2026-06-20: No Imported Script Execution in MVP

Decision: Imported scripts and inline event handlers are not executed.

Rationale: Security and output determinism matter more than preserving arbitrary dynamic behavior in MVP.

