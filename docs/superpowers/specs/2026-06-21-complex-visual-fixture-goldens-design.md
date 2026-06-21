# Complex Visual Fixture Goldens Design

Date: 2026-06-21

## Purpose

This slice strengthens the core MVP artifact contract by adding a complex visual HTML fixture and deterministic golden tests for the four MVP export artifacts.

The goal is not to build browser screenshot comparison yet. The goal is to prove that `packages/core` can import a visually richer, safe HTML document and emit stable artifacts without weakening the existing render-tree-first export contract.

## Scope

In scope:

- Add `fixtures/html/complex-visual.html`.
- Add expected golden artifacts under `fixtures/expected/`:
  - `complex-visual.standalone.html`
  - `complex-visual.confluence-fragment.html`
  - `complex-visual.compatibility-report.json`
  - `complex-visual.native-mapping-report.json`
- Add a focused Vitest file for import/export golden comparison.
- Keep verification inside the existing `npm run verify` command.
- Make only minimal deterministic-output adjustments in `packages/core` if the new fixture exposes unstable serialization.

Out of scope:

- Browser screenshot or visual diff harness.
- `packages/test-harness` scaffolding.
- Markdown or outline import.
- Confluence API publishing or verified storage-format export.
- App UI work.
- Hostile HTML sanitizer expansion.

## Fixture Requirements

`fixtures/html/complex-visual.html` must represent a visual document that is more demanding than the simple AI deck fixture while staying inside the MVP safe-import lane.

It should include:

- A top-level presentation-style wrapper.
- Safe embedded CSS in a `<style>` tag.
- Nested visual sections.
- Repeated card or metric blocks.
- A comparison, callout, status, or timeline-like visual structure that may remain semantically unmapped.
- Inline styles that verify style attribute preservation.
- No external network resources.
- No script tags.
- No inline event handlers.
- No `javascript:` URLs.

The fixture is intentionally visual-preservation oriented, not sanitizer oriented. Existing hostile fixture coverage remains responsible for executable and remote-resource risks.

## Core Behavior

The test flow imports the fixture through `importHtml()` and exports through `exportProject()`.

`sourceArtifact` remains immutable and records the original fixture HTML. The original source is not used as an executable export artifact.

The standalone HTML golden verifies render-tree-first preservation. Semantic recognition must not be required for standalone export to succeed.

The Confluence fragment golden verifies scoped HTML output only. It must not claim to be a verified Confluence storage-format page body.

The compatibility report golden verifies the current compatibility-report shape for a safe visual fixture. This fixture should not force new sanitizer or Confluence CSS detectors into the slice. If implementation adds any warnings, they must use stable rule IDs from the existing compatibility catalog and be covered by an explicit assertion.

The native mapping report golden verifies that unmapped or visually complex structures are represented as report entries with their current mapping recommendation and expected visual-loss fields. It must keep `isConfluencePageBody: false`.

## Test Design

Create `packages/core/test/complex-visual-fixture.test.ts`.

The test should:

- Read `fixtures/html/complex-visual.html`.
- Import it with fixed inputs:
  - `title: "Complex Visual Fixture"`
  - `now: "2026-06-21T00:00:00.000Z"`
- Export it with fixed options:
  - `generatedAt: "2026-06-21T00:00:00.000Z"`
  - `fragmentId: "complex-visual-fragment"`
- Assert the artifact filenames remain in the MVP contract order:
  - `standalone.html`
  - `confluence-fragment.html`
  - `compatibility-report.json`
  - `native-mapping-report.json`
- Compare each artifact content against the corresponding file in `fixtures/expected/`.
- Parse JSON expected artifacts before comparison where useful, so formatting changes do not hide semantic regressions.
- Normalize line endings before exact HTML comparison so platform line endings do not create false failures.
- Treat the expected files as reviewed golden outputs. The test must not generate expected files dynamically or compare an artifact to itself.
- Assert at least one native mapping entry recommends `fragment` or reports `material` visual loss, so the fixture proves complex visual structure is being preserved and reported rather than silently treated as fully native.

The test may include a small fixture-presence assertion for important visual markers, but the golden artifact comparisons are the main contract.

## Documentation

Update `docs/testing/fixture-catalog.md` after the fixture is implemented so `fixtures/html/complex-visual.html` moves from remaining catalog fixture to implemented fixture status.

No product scope or export-contract docs should change unless implementation reveals a missing contract rule. If that happens, the implementation should update the relevant authoritative doc in the same slice.

## Verification

The implementation is complete only after:

```bash
npm run verify
```

passes on the working tree.

During development, the focused command is:

```bash
npm test --workspace @htmleditor/core -- complex-visual-fixture.test.ts
```

## Non-Goals And Cautions

- Do not introduce browser visual regression tooling in this slice.
- Do not claim native Confluence page export.
- Do not export executable original HTML from `sourceArtifact`.
- Do not add fixture dependencies on CDN, remote images, web fonts, or network resources.
- Do not move parser, sanitizer, compatibility, or export logic into `packages/app`.
