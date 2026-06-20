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

### End-to-End Tests

Required flows:

- HTML import -> text edit -> theme edit -> standalone export
- Markdown import -> section reorder -> Confluence fragment export
- hostile HTML import -> sanitizer warnings -> safe export
- visual block import -> native mapping report with expected unmapped layout rules

## Completion Rule

Work is not complete until relevant verification commands have been run and their results are recorded in the final status.

