# AGENTS.md

## Project Identity

This repository builds a Confluence material studio for creating and editing presentation-style internal materials. It is not a presentation runtime, not a PPT replacement, and not a generic raw HTML IDE.

## Non-negotiable Product Constraints

- Preserve imported HTML visual output for standalone export as much as possible.
- Treat standalone HTML, Confluence fragment, and native mapping as separate targets with different fidelity promises.
- Do not claim Confluence-native page export unless verified against a documented export contract.
- MVP native Confluence output is `native-mapping-report.json`, not a page body.
- Runtime generated output must not depend on external CDN or network resources.
- Imported scripts and inline event handlers are not executed in MVP.
- Unknown imported structures must be preserved or explicitly reported.

## Architecture Rules

- `packages/core` owns document model, import, export, sanitization, compatibility, and assets.
- `packages/app` owns UI only and must call `packages/core` for product logic.
- `packages/test-harness` owns fixture rendering, screenshots, visual diffs, and artifact checks.
- Standalone HTML export must depend on the render tree, not semantic overlay.
- Native mapping must depend on semantic overlay and emit compatibility reports.
- Every persisted document has a version.
- Every import records immutable `sourceArtifact`.

## Export Contracts

MVP export artifacts are:

- `standalone.html`
- `confluence-fragment.html`
- `compatibility-report.json`
- `native-mapping-report.json`

Any new export target needs a documented contract before implementation.

## Testing Rules

- Parser, sanitizer, exporter, and compatibility changes require tests.
- Import/export changes require fixture updates.
- Visual fidelity-sensitive changes require screenshot or golden evidence.
- Compatibility reports must reference stable rule IDs.
- Do not mark work complete without running the relevant verification command.

## Documentation Rules

- Update relevant docs under `docs/` when changing product scope, export contracts, sanitizer behavior, Confluence mapping, or architecture boundaries.
- Brainstorming records stay under `docs/superpowers/`.
- Implementation-facing docs live under `docs/product`, `docs/architecture`, `docs/confluence`, `docs/security`, `docs/testing`, and `docs/engineering`.

## Current Authoritative Docs

- `docs/product/product-brief.md`
- `docs/product/mvp-scope.md`
- `docs/architecture/render-tree-and-overlay.md`
- `docs/architecture/import-export-pipeline.md`
- `docs/architecture/editor-boundaries.md`
- `docs/confluence/export-targets.md`
- `docs/confluence/compatibility-rules.md`
- `docs/confluence/macro-mapping.md`
- `docs/security/sanitizer-policy.md`
- `docs/security/import-risk-model.md`
- `docs/testing/fixture-catalog.md`
- `docs/testing/verification-strategy.md`
- `docs/engineering/conventions.md`
- `docs/engineering/decision-log.md`
