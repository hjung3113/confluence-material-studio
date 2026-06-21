# Verification Strategy

## Verification Layers

### Unit Tests

Required for:

- document model helpers
- sanitizer rules
- HTML import
- Markdown import
- export adapters
- compatibility rules

### Golden Tests

Required for:

- imported render tree snapshots
- semantic overlay snapshots
- export artifact snapshots
- compatibility report snapshots

### Visual Regression Tests

Required for:

- original HTML preview versus imported render tree preview
- standalone HTML export screenshot comparison
- Confluence-width fragment preview

Visual regression thresholds apply to fixture-defined surfaces, not to arbitrary imported HTML outside the supported subset.

### End-to-End Tests

Required flows:

- HTML import -> text edit -> theme edit -> standalone export
- Markdown import -> section reorder -> Confluence fragment export
- hostile HTML import -> sanitizer warnings -> safe export
- visual block import -> native mapping report with expected unmapped layout rules

## Current Verification Command

For the first core vertical slice, run:

```bash
npm run verify
```

This command typechecks `packages/core` and runs the Vitest suite for document model, compatibility rules, sanitizer, import, and export behavior.

## Completion Rule

Work is not complete until relevant verification commands have been run and their results are recorded in the final status.
