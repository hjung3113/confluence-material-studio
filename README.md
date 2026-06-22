# Confluence Material Studio

Confluence Material Studio creates and edits presentation-style internal materials for standalone HTML and Confluence-oriented outputs.

It is not a presentation runtime, PPT replacement, raw HTML IDE, or verified Confluence storage-format publisher. MVP native Confluence output is a mapping report, not a page body.

## Current MVP Core

The implemented core slice lives in `packages/core` and supports:

- static HTML import with immutable `sourceArtifact`
- Markdown/outline import for headings, paragraphs, lists, and fenced code
- sanitizer handling for scripts, inline handlers, JavaScript URLs, and remote resources
- render-tree-first standalone HTML export
- scoped Confluence fragment export
- compatibility reports with stable rule IDs
- native mapping reports for Confluence-native and macro candidates

MVP export artifacts are:

- `standalone.html`
- `confluence-fragment.html`
- `compatibility-report.json`
- `native-mapping-report.json`

## Confluence Compatibility Boundary

`confluence-fragment.html` is a scoped HTML artifact for HTML-capable Confluence contexts. It is not guaranteed to be a universal Confluence storage-format page body.

`native-mapping-report.json` keeps `isConfluencePageBody: false` and reports which nodes are candidates for native content, macros, fragment output, or future iframe/Forge handling.

Current macro-oriented candidates include status, callout, panel, expand, and code blocks. Fragment CSS risk detection reports fixed positioning, viewport units, global selectors, and overflow/wide-layout risks.

## Verification

Install dependencies:

```bash
npm install
```

Run the full verification suite:

```bash
npm run verify
```

Run the MVP smoke flow:

```bash
npm run smoke
```

The smoke flow imports the core HTML, Markdown, hostile, and Confluence-friendly fixtures, exports all four MVP artifacts, checks hostile output remains inert, and checks Confluence macro/risk reporting.

## Key Files

- `docs/product/mvp-scope.md`
- `docs/architecture/import-export-pipeline.md`
- `docs/confluence/export-targets.md`
- `docs/confluence/compatibility-rules.md`
- `docs/confluence/macro-mapping.md`
- `docs/testing/fixture-catalog.md`
- `docs/testing/verification-strategy.md`
- `AGENTS.md`
