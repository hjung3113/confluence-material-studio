# Pre-Implementation Rules and Document Structure

Date: 2026-06-20

This document proposes the documentation split, repository structure, conventions, and AGENTS.md rules to create before implementation.

It is a planning artifact. It does not create the application scaffold.

## Recommended Document Split

The current design spec should remain as the original brainstorming record. Before implementation, create smaller authoritative documents with narrower purposes.

### Product Docs

- `docs/product/product-brief.md`
  - product identity
  - target users
  - core workflow
  - explicit non-goals

- `docs/product/mvp-scope.md`
  - MVP include/exclude list
  - milestone boundaries
  - first fixture set
  - release gates

### Architecture Docs

- `docs/architecture/render-tree-and-overlay.md`
  - `ProjectDoc`
  - immutable `sourceArtifact`
  - `RenderNode`
  - `SemanticOverlayEntry`
  - migration/versioning rules

- `docs/architecture/import-export-pipeline.md`
  - import stages
  - export stages
  - transformation trace
  - failure modes

- `docs/architecture/editor-boundaries.md`
  - core versus UI responsibilities
  - allowed dependencies by layer
  - undo/redo ownership
  - asset ownership

### Confluence Docs

- `docs/confluence/export-targets.md`
  - standalone HTML
  - Confluence HTML fragment
  - native mapping report
  - future Forge/iFrame package

- `docs/confluence/compatibility-rules.md`
  - rule IDs
  - target
  - severity
  - detector
  - message
  - recommended fix

- `docs/confluence/macro-mapping.md`
  - block-to-macro mapping
  - limitations
  - unsupported cases

### Security and Safety Docs

- `docs/security/sanitizer-policy.md`
  - script policy
  - inline event handler policy
  - URL policy
  - remote resource policy
  - iframe/embed policy

- `docs/security/import-risk-model.md`
  - risk classification
  - user-facing warnings
  - safe defaults

### Testing Docs

- `docs/testing/fixture-catalog.md`
  - fixture names
  - source
  - expected warnings
  - expected export outputs

- `docs/testing/verification-strategy.md`
  - unit tests
  - golden tests
  - visual regression tests
  - E2E tests
  - required commands

### Engineering Docs

- `docs/engineering/conventions.md`
  - TypeScript style
  - module boundaries
  - naming
  - error handling
  - comments
  - dependency rules

- `docs/engineering/decision-log.md`
  - durable decisions
  - date, decision, rationale, alternatives, consequences

## Proposed Repository Structure

```text
.
├── AGENTS.md
├── docs/
│   ├── architecture/
│   ├── confluence/
│   ├── engineering/
│   ├── product/
│   ├── security/
│   ├── superpowers/
│   │   ├── reviews/
│   │   └── specs/
│   └── testing/
├── fixtures/
│   ├── html/
│   ├── markdown/
│   ├── hostile/
│   └── expected/
├── packages/
│   ├── core/
│   │   ├── src/
│   │   │   ├── document/
│   │   │   ├── import/
│   │   │   ├── export/
│   │   │   ├── compatibility/
│   │   │   ├── sanitize/
│   │   │   └── assets/
│   │   └── test/
│   ├── app/
│   │   ├── src/
│   │   │   ├── editor/
│   │   │   ├── inspector/
│   │   │   ├── navigator/
│   │   │   ├── preview/
│   │   │   └── export-ui/
│   │   └── test/
│   └── test-harness/
│       ├── src/
│       └── test/
└── scripts/
```

## Layering Rules

### `packages/core`

Owns deterministic product logic:

- document model
- migrations
- HTML import
- Markdown import
- sanitization
- export adapters
- compatibility rules
- asset normalization

Rules:

- No React dependency.
- No browser UI state dependency.
- No network calls in MVP.
- Pure functions where practical.
- All exported behavior must have unit or golden tests.

### `packages/app`

Owns user interface:

- section navigator
- live canvas
- inspector
- command bar
- preview panes
- export dialogs

Rules:

- Calls `core` APIs rather than reimplementing parsing/export logic.
- UI state may wrap core document operations but must not bypass them.
- Visual editing must produce valid `ProjectDoc` mutations.

### `packages/test-harness`

Owns verification helpers:

- fixture rendering
- screenshot capture
- visual diff helpers
- export artifact checks

Rules:

- May depend on browser automation tooling.
- Does not contain production app logic.

## Implementation Conventions

### Document Model

- Every persisted document has a `version`.
- Every render node has a stable `id`.
- Every import records `sourceArtifact`.
- Every transformation records a trace entry.
- Semantic overlay must never be required for standalone HTML export.

### Export

- Each export target has a named adapter.
- Each adapter returns artifacts plus a compatibility report.
- Adapters must not silently drop content.
- If content cannot be represented, the report must include a rule ID.

### Compatibility Rules

Rule shape:

```ts
type CompatibilityRule = {
  id: string;
  target: "standalone-html" | "confluence-fragment" | "native-mapping";
  severity: "info" | "warning" | "error";
  detect: string;
  message: string;
  recommendation: string;
};
```

Rule ID format:

- `HTML_REMOTE_RESOURCE`
- `HTML_SCRIPT_REMOVED`
- `CF_FRAGMENT_FIXED_POSITION`
- `CF_NATIVE_UNMAPPED_LAYOUT`

### Sanitizer

- MVP does not execute imported scripts.
- MVP strips or disables inline event handlers.
- MVP rejects or warns on `javascript:` URLs.
- MVP records removed content in the import report.
- MVP does not fetch remote assets automatically.

### Fixtures

Every fixture should define:

- source file
- expected import warnings
- expected semantic roles
- expected standalone export
- expected Confluence fragment warnings
- expected native mapping report

## AGENTS.md Draft Rules

Create root `AGENTS.md` before implementation with rules like these:

```md
# AGENTS.md

## Project Identity

This repository builds a Confluence material studio for creating and editing presentation-style internal materials. It is not a presentation runtime and not a generic raw HTML IDE.

## Non-negotiable Product Constraints

- Preserve imported HTML visual output for standalone export as much as possible.
- Treat Confluence-native output and HTML output as separate targets with different fidelity promises.
- Do not claim Confluence-native page export unless verified against the documented export contract.
- Runtime output must not depend on external CDN or network resources.
- Imported scripts are not executed in MVP.

## Architecture Rules

- `packages/core` owns document model, import, export, sanitization, compatibility, and assets.
- `packages/app` owns UI only and must call `packages/core` for product logic.
- Standalone HTML export must depend on the render tree, not semantic overlay.
- Confluence-native mapping must depend on semantic overlay and emit compatibility reports.
- Unknown imported structures must be preserved or explicitly reported.

## Testing Rules

- Parser, sanitizer, exporter, and compatibility changes require tests.
- Import/export changes require fixture updates.
- Visual fidelity-sensitive changes require screenshot or golden evidence.
- Do not mark work complete without running the relevant verification command.

## Documentation Rules

- Update the relevant document under `docs/` when changing product scope, export contracts, sanitizer behavior, or Confluence mapping.
- Keep brainstorming records under `docs/superpowers/`; implementation-facing docs live under `docs/product`, `docs/architecture`, `docs/confluence`, `docs/security`, `docs/testing`, and `docs/engineering`.
```

## Recommended Next Step

Before implementation planning, create the authoritative docs in this order:

1. `docs/product/mvp-scope.md`
2. `docs/architecture/render-tree-and-overlay.md`
3. `docs/security/sanitizer-policy.md`
4. `docs/confluence/export-targets.md`
5. `docs/confluence/compatibility-rules.md`
6. `docs/testing/fixture-catalog.md`
7. `docs/engineering/conventions.md`
8. root `AGENTS.md`

Then write the implementation plan against those documents, not against the brainstorming spec alone.

