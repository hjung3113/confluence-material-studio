# Fixture Catalog

## Fixture Requirements

Every fixture defines:

- source file
- import kind
- expected import warnings
- expected semantic roles
- expected export artifacts
- expected compatibility rule IDs

## Initial Fixtures

| Fixture | Path | Purpose |
| --- | --- | --- |
| Simple AI HTML deck | `fixtures/html/simple-ai-deck.html` | Basic section, heading, cards, and styling import |
| Complex visual HTML | `fixtures/html/complex-visual.html` | Stress layout preservation and Confluence fragment warnings |
| Markdown outline | `fixtures/markdown/product-outline.md` | Validate Markdown section/block creation |
| Confluence-friendly doc | `fixtures/html/confluence-friendly.html` | Validate native mapping report coverage |
| Hostile HTML | `fixtures/hostile/script-and-remote-assets.html` | Validate sanitizer and risk reports |

## Expected Outputs

Expected outputs live under `fixtures/expected/`:

- `*.standalone.html`
- `*.confluence-fragment.html`
- `*.compatibility-report.json`
- `*.native-mapping-report.json`

Fixtures should be added before importer/exporter implementation work that depends on them.

