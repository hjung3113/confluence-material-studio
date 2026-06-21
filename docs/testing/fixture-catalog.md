# Fixture Catalog

## Fixture Requirements

Every fixture defines:

- source file
- import kind
- expected import warnings
- expected semantic roles
- expected export artifacts
- expected compatibility rule IDs
- expected locked/raw nodes when semantic recognition is intentionally incomplete
- expected visual comparison target for standalone output where applicable

## Initial Fixtures

| Fixture | Path | Purpose |
| --- | --- | --- |
| Simple AI HTML deck | `fixtures/html/simple-ai-deck.html` | Basic section, heading, cards, and styling import |
| Complex visual HTML | `fixtures/html/complex-visual.html` | Stress layout preservation and native mapping report coverage |
| Markdown outline | `fixtures/markdown/product-outline.md` | Validate Markdown section/block creation |
| Confluence-friendly doc | `fixtures/html/confluence-friendly.html` | Validate native mapping report coverage |
| Hostile HTML | `fixtures/hostile/script-and-remote-assets.html` | Validate sanitizer and risk reports |

The complex visual HTML fixture must include safe CSS that is preserved for standalone export without requiring every CSS property to become an editable inspector control.

## Expected Outputs

Expected outputs live under `fixtures/expected/`:

- `*.standalone.html`
- `*.confluence-fragment.html`
- `*.compatibility-report.json`
- `*.native-mapping-report.json`

Fixtures should be added before importer/exporter implementation work that depends on them.

## Implemented Fixture Status

The first core vertical slice implements:

- `fixtures/html/simple-ai-deck.html`
- `fixtures/hostile/script-and-remote-assets.html`
- `fixtures/expected/hostile-compatibility-rules.json`

The complex visual golden slice implements:

- `fixtures/html/complex-visual.html`
- `fixtures/expected/complex-visual.standalone.html`
- `fixtures/expected/complex-visual.confluence-fragment.html`
- `fixtures/expected/complex-visual.compatibility-report.json`
- `fixtures/expected/complex-visual.native-mapping-report.json`

The remaining catalog fixtures are outside the implemented core slices and require separate implementation plans:

- `fixtures/markdown/product-outline.md`
- `fixtures/html/confluence-friendly.html`
