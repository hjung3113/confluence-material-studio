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

For the core MVP slices, run:

```bash
npm run verify
```

This command typechecks `packages/core` and runs the Vitest suite for document model, compatibility rules, sanitizer, import, and export behavior.

For a focused MVP smoke flow, run:

```bash
npm run smoke
```

This imports the supported HTML fixtures, Markdown outline fixture, hostile fixture, and Confluence-friendly fixture, then exports all four MVP artifacts and checks hostile sanitization plus Confluence macro/risk reporting.

For the app shell smoke flow, run:

```bash
npm run app:smoke
```

This builds `packages/app` and verifies the built editor shell includes source selection, section navigation, live canvas, inspector, export artifact markers, compatibility warning markers, and Confluence macro/risk markers. In restricted environments where local HTTP listen is unavailable, the harness validates built assets directly from disk.

## Completion Rule

Work is not complete until relevant verification commands have been run and their results are recorded in the final status.
