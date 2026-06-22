# Visual Editor Redesign Agent Review

Date: 2026-06-22

## Review Setup

Three read-only review personas examined `docs/superpowers/specs/2026-06-22-visual-editor-redesign-spike.md`:

- Product/UX skeptic: whether the spike rescues the MVP user promise.
- Conservative architecture reviewer: whether GrapesJS preserves core ownership and export contracts.
- Frontend/test reviewer: whether the implementation plan can prove the browser editing loop.

## Shared Verdict

The visual-editor direction is correct, but the original spike was not constrained enough for an MVP-safe implementation. The implementation must treat GrapesJS as a disposable app-layer canvas adapter while `ProjectDoc` remains authoritative.

## Agreed Changes

- First screen must be editable sample material on a canvas, not a source form.
- GrapesJS default website-builder panels and blocks must be disabled.
- The spike exposes only Title, Paragraph, Callout/Note, and Divider blocks.
- Raw imported HTML must go through `packages/core` import and sanitizer before any canvas load.
- Export must call `packages/core` from the current `ProjectDoc`; GrapesJS HTML/CSS is not an export contract.
- Text edit and block insert should become core document operations so `renderTree`, `semanticOverlay`, and export evidence stay aligned.
- Browser smoke must exercise real selection, edit, block insertion, export, compatibility JSON parsing, and screenshots.
- `native-mapping-report.json` must be labeled as a report/plan, not a native Confluence page body.

## Cuts

- No generic GrapesJS layer manager, style manager, forms, embeds, iframes, ecommerce blocks, navigation blocks, script widgets, or remote asset widgets.
- No broad CSS editor.
- No Markdown/outline import in this visual-editor spike UI.
- No Confluence API publish/update.

## Implementation Blocker

`npm install grapesjs --workspace @htmleditor/app --save` failed in this environment with:

```text
getaddrinfo ENOTFOUND registry.npmjs.org
```

The implementation plan must start with a dependency-install gate. Without npm registry access or a vendored dependency, the GrapesJS-backed version cannot be completed here. A custom DOM canvas fallback can still improve the app, but it would not satisfy the GrapesJS-backed design.
