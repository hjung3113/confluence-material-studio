# Adversarial Design Review: Confluence Material Studio

Date: 2026-06-20

Reviewed spec:

- `docs/superpowers/specs/2026-06-20-confluence-material-studio-design.md`

Reviewer stance:

- Assume the product will fail if it overpromises HTML fidelity, Confluence-native fidelity, or editable import quality.
- Treat Confluence Cloud as a hostile rendering target: sanitization, macro availability, editor behavior, export behavior, permissions, and tenant configuration can differ.
- Favor a smaller MVP that proves the core editing/export loop with real fixtures.

## Verdict

The current design has the right product direction, but the MVP scope is still too broad. The highest-risk phrase is `Confluence-native draft/report export`: it bundles at least three different problems under one label:

- mapping internal nodes to Confluence-native concepts,
- serializing valid Confluence body formats,
- proving the result renders and remains editable in real Confluence.

That should not be a single MVP promise. Split it into:

1. compatibility analysis,
2. native mapping plan/report,
3. later real Confluence export adapter.

Confidence: 82%.

## P0 / Must Fix Before Implementation

### P0-1. Define MVP export promises as testable contracts

Current wording allows the team to claim `Confluence-native draft/report export` without proving what the artifact is. This will create false confidence.

Required change:

- MVP export targets must be stated as concrete artifacts:
  - `standalone.html`
  - `confluence-fragment.html`
  - `compatibility-report.json`
  - `native-mapping-report.json`
- Real Confluence body serialization should be post-MVP unless validated against a live or fixture-backed Confluence body format test.

Acceptance gate:

- Every export target has a file extension, schema, and verification command.

### P0-2. Preserve original imported HTML as an immutable source artifact

The render tree is not enough. If import normalization damages output, users need a fallback and tests need a baseline.

Required change:

- Store `sourceArtifact` alongside `renderTree`.
- Keep original HTML bytes or normalized original DOM snapshot.
- Track import transformations as explicit steps.

Acceptance gate:

- A project created from HTML can always re-export the untouched original as `source-original.html` or show a diff against it.

### P0-3. Separate sanitizer policy from parser behavior

The spec says scripts are removed, disabled, or isolated. That is ambiguous and security-sensitive.

Required change:

- Define sanitizer policy as its own document before implementation.
- MVP default: no executable script in imported or exported output.
- Any future dynamic behavior must be represented as a declarative widget or isolated future target.

Acceptance gate:

- Importer tests prove `<script>`, inline event handlers, `javascript:` URLs, and remote resources are classified consistently.

### P0-4. Confluence compatibility must be rule-driven, not prose-driven

Compatibility warnings need stable rule IDs or they will become inconsistent UI text.

Required change:

- Add `compatibility-rules.md`.
- Each rule has id, severity, target, detector, message, and recommended fix.

Acceptance gate:

- Compatibility report references rule IDs, not ad hoc strings.

## P1 / Should Fix Before First Build Plan

### P1-1. Split the spec into product, architecture, and contracts

One document currently mixes product intent, architecture, MVP scope, test strategy, and Confluence research. This is fine for brainstorming but poor as an implementation source.

Recommended split:

- `docs/product/product-brief.md`
- `docs/product/mvp-scope.md`
- `docs/architecture/render-tree-and-overlay.md`
- `docs/architecture/import-export-pipeline.md`
- `docs/confluence/export-targets.md`
- `docs/confluence/compatibility-rules.md`
- `docs/testing/verification-strategy.md`
- `docs/engineering/conventions.md`

### P1-2. Constrain the first import subset

HTML import is the most dangerous scope trap. Without a subset, every broken page becomes a bug.

Recommended MVP subset:

- static HTML only
- local or embedded images only
- style tags and inline style allowed
- no script execution
- no remote font dependency
- no iframe execution
- CSS grid/flex allowed but flagged for Confluence fragment risk

### P1-3. Decide the editor engine boundary before choosing UI libraries

The design allows bundled npm dependencies, but the editor model must not become coupled to one WYSIWYG library.

Recommended boundary:

- `core/` owns document model, import, export, compatibility, and serialization.
- `app/` owns UI state and interaction.
- UI components call core services through explicit APIs.

### P1-4. Add fixture-first development

This product cannot be built safely from abstract examples.

Required fixtures before implementation:

- simple AI-generated presentation HTML
- complex AI-generated visual HTML
- Markdown outline
- Confluence-friendly document sample
- hostile HTML sample with script/external assets/absolute layout

### P1-5. Make visual fidelity measurable

The spec says visual fidelity estimates, but does not define how they are computed or verified.

Recommended MVP:

- human-readable score in UI can be heuristic,
- automated verification uses screenshot diff against fixtures,
- threshold failures block changes to import/export code.

## P2 / Useful But Deferrable

- Forge macro packaging can stay as research.
- Confluence API publishing can stay out of MVP.
- Full native ADF/storage serialization can wait until export contracts are stable.
- Direct AI integration should remain excluded until import/edit/export are reliable.
- Advanced canvas editing should be limited to a small cover/hero region until layout export is proven.

## Recommended MVP Reframe

Replace the current MVP export language with:

- Produce standalone HTML with high visual fidelity.
- Produce scoped Confluence HTML fragment with compatibility warnings.
- Produce Confluence native mapping report that explains which blocks can become native Confluence elements or macros.
- Do not claim real Confluence-native page export until a later milestone.

This keeps the product honest while preserving the long-term Confluence-native direction.

## Implementation Readiness Checklist

Do not start implementation until these exist:

- Document model contract
- Sanitizer policy
- Import subset contract
- Export target contract
- Compatibility rule catalog
- Fixture catalog
- Visual regression policy
- Repository structure and AGENTS.md rules

