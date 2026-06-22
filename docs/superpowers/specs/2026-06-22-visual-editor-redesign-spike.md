# Visual Editor Redesign Spike

Date: 2026-06-22

## Purpose

The current app shell proves that `packages/core` can import, mutate, preview, and export a document, but it does not prove the actual product experience.

The product must feel like a usable Confluence material editor: import an HTML draft, see it as a document, click the part you want to change, edit it in context, then export with target-specific evidence.

This spike resets the app direction from an export-demo dashboard to a canvas-first visual editor.

## Product Diagnosis

The current `packages/app` direction is wrong for the MVP user promise.

It has:

- Source textarea as the primary surface.
- A canvas that displays imported HTML but does not support element selection.
- Section buttons that expose internal structure instead of natural editing.
- A right inspector that edits selected state only after the user understands the model.
- Export artifacts and compatibility reports as prominent panels, even though they are downstream checks.

It lacks:

- Click-to-select on the visual canvas.
- Visible selection outline and parent/child selection affordances.
- Inline or near-inline text editing.
- Block insertion from the canvas.
- Real file import.
- A constrained component/block palette aligned to Confluence materials.
- Theme controls beyond a single accent color.
- A credible visual design model borrowed from modern editing products.

This is not a styling problem. It is an interaction-model problem.

## Reference Products

The editor should borrow from these patterns, not copy their full scope.

- Webflow: canvas is the primary workspace; users select elements and edit content on the page.
- Framer: content editing happens directly on the page/canvas instead of in a disconnected form.
- Canva: selecting an element reveals context-specific controls.
- Confluence: block insertion should use a toolbar, plus button, or slash-command pattern rather than raw HTML controls.

The MVP should not become a generic website builder. The visual editor must stay constrained to presentation-style internal materials and Confluence-oriented outputs.

## Open Source Assessment

### GrapesJS

GrapesJS is the best spike candidate.

Reasons:

- It is an open-source visual web builder framework.
- It already supports canvas selection, drag/drop, blocks, traits, and HTML/CSS output.
- It can get this project to a usable editor faster than hand-rolling canvas selection and editing.

Risks:

- It can pull the product toward a generic website builder.
- Its default panels and blocks may be too broad.
- Its output model must be treated as app-layer editing state, not as a replacement for `packages/core`.

Use it only with a constrained block palette and a core-backed export path.

### Craft.js

Craft.js is a weaker immediate fit.

Reasons:

- It is a framework for building custom page editors, but it does not provide a ready-made editor UI.
- It is useful if the app becomes a React-based custom editor later.

Do not choose it for the first usability rescue.

### Tiptap / Lexical

Tiptap and Lexical are good rich-text engines, not page-layout editors.

They may be useful later for rich text inside selected text blocks. They should not be the first canvas editor engine.

## Recommended Spike

Build a GrapesJS-backed editor spike inside `packages/app` while preserving `packages/core` ownership of import, sanitization, compatibility, and export.

GrapesJS is an app-layer canvas adapter only. It is not the product document model, not the sanitizer, and not an export source of truth. `ProjectDoc` remains the authoritative edited state. GrapesJS may render safe editor HTML with stable node IDs, report the selected component, and host constrained editor interactions, but export still calls `packages/core` with the current `ProjectDoc`.

The spike is successful only if the user can complete this loop:

1. Open the app.
2. See an editable example material already loaded in the central canvas.
3. Click a heading or paragraph in the canvas.
4. See a visible selection outline and matching inspector state.
5. Edit the selected text.
6. Add one constrained Confluence-material block.
7. Import or paste a safe HTML draft from the top bar.
8. Preview desktop/tablet/mobile widths.
9. Export through `packages/core`.
10. See compatibility warnings and the four MVP artifacts.

The primary screen must not be a source textarea or export dashboard. Source import and export evidence are commands or drawers around the canvas workflow.

## Spike Cuts

The spike must deliberately cut generic website-builder scope:

- No GrapesJS default blocks, default panels, default layer manager, default style manager, forms, embeds, iframes, scripts, navigation menus, ecommerce blocks, or remote asset widgets.
- No broad arbitrary CSS editor.
- No drag/drop layout authoring beyond adding the single supported callout block.
- No duplicate/delete/reorder toolbar actions unless they fall out naturally from the existing core model without extra UI complexity.
- No Markdown/outline import in the visual-editor spike UI, even though it remains an MVP core capability.

The spike keeps only:

- Editable sample first screen.
- Safe HTML paste and `.html` file import.
- Canvas click selection.
- Parent/child selection affordance through a breadcrumb or outline.
- Text editing for text-bearing nodes.
- One constrained callout/note block insert.
- Desktop/tablet/mobile preview widths.
- Core-backed export drawer with target-specific evidence.

## UX Shape

### Layout

Top bar:

- Import
- Add block
- Preview width segmented control
- Export

Left rail:

- Document outline
- Parent/child selection breadcrumb or compact outline
- Confluence-material block palette with only the spike-allowed blocks

Center:

- Visual canvas
- Click-to-select elements
- Selection outline
- Floating mini-toolbar for text edit and add-nearby callout only

Right inspector:

- Selected element name and role
- Text content
- Locked/unsupported state for preserved-but-not-editable imported structures
- Confluence compatibility hints for the selected element where available

Bottom or export drawer:

- Compatibility report
- `standalone.html`
- `confluence-fragment.html`
- `native-mapping-report.json`
- `compatibility-report.json`

### First Screen

The first screen should not be a source form.

It should show an editable example material on the canvas, with import available in the top bar. This lets a user immediately understand that the app is an editor.

On first load, without importing anything, the user must be able to click the sample heading, see the selection outline, edit text, add a callout block, and export. The source textarea must not be visible on the primary screen.

## Constrained Block Palette

Initial blocks:

- Title / heading
- Paragraph
- Callout / note
- Divider

Excluded from the first spike:

- Arbitrary forms
- Ecommerce blocks
- Navigation menus
- Script widgets
- Embed/iframe widgets
- Remote asset widgets
- Hero sections
- Two-column sections
- Status pills
- Expand/details
- Code blocks
- Metric cards

## Architecture

`packages/core` remains authoritative for:

- HTML import
- sanitizer policy
- compatibility reports
- standalone export
- Confluence fragment export
- native mapping report
- stable rule IDs
- canonical `ProjectDoc` mutations that affect export

`packages/app` owns:

- GrapesJS editor setup
- panels and commands
- selection and inspector UI
- import/export drawers
- conversion between safe core document state and disposable canvas state

The app may hold GrapesJS editing state, but exported output must still pass through `packages/core`. UI files outside the GrapesJS adapter must not import `grapesjs` directly.

Core needs explicit document operations for text edit and block insert so `renderTree`, `semanticOverlay`, and transformation evidence do not drift. The current app-level direct render-tree mutation is acceptable only as a prior prototype, not as the visual-editor architecture.

## Data Flow

Import flow:

1. User imports HTML.
2. App passes HTML into `packages/core` import/sanitize path.
3. App renders safe editor HTML derived from the resulting `ProjectDoc` into GrapesJS.
4. App keeps original `sourceArtifact` through the core document model.

Raw imported HTML must never be passed directly into GrapesJS. The app must not call a canvas load API with unsanitized pasted/file HTML.

Edit flow:

1. User selects an element on the canvas.
2. GrapesJS selection updates app inspector state.
3. Inspector or inline edit dispatches a core document operation.
4. Core updates `ProjectDoc`; the app refreshes the canvas from that state.

Export flow:

1. App reads the current `ProjectDoc`.
2. App calls `packages/core` export APIs.
3. Core emits the four MVP artifacts.
4. App displays artifacts and compatibility warnings.

GrapesJS `getHtml()` or `getCss()` output is not an MVP export contract. If later style editing requires additional CSS persistence, the CSS field must be documented in core before it becomes export input.

## UI States

The spike must cover these explicit states:

- Editor initializing.
- Editable example ready.
- Imported HTML ready.
- Selected text node.
- Selected non-text block.
- Preserved but not editable imported structure.
- Dirty document after edit or block insert.
- Export drawer closed.
- Export drawer open with successful artifacts.
- Export failed with a visible error.
- Compatibility warnings present.

## Acceptance Criteria

The spike must prove:

- First load starts with editable sample material on the canvas.
- No source textarea is visible on the primary screen.
- Canvas click selection works for headings, paragraphs, and sections.
- The selected element has a visible outline.
- A nested fixture can select child text and then parent section with distinct inspector labels.
- The inspector displays selected text for text-bearing elements.
- Editing selected text updates the canvas.
- Adding one constrained callout/note block works.
- The exposed block palette contains only Title, Paragraph, Callout/Note, and Divider.
- Importing pasted HTML and a `.html` file renders sanitized content into the canvas.
- Export still emits:
  - `standalone.html`
  - `confluence-fragment.html`
  - `compatibility-report.json`
  - `native-mapping-report.json`
- Export UI labels `native-mapping-report.json` as a report/plan, not as native page export.
- Compatibility warnings still use stable rule IDs.
- The app does not execute imported scripts or inline event handlers.
- Raw imported HTML never enters GrapesJS before core sanitization.
- Standalone visual evidence exists for the edited sample or representative fixture.

## Testing Strategy

Unit tests:

- Editor adapter converts imported HTML into an editable document.
- Export adapter sends current editor HTML through `packages/core`.
- Block palette only exposes allowed blocks.

Browser smoke test:

- Load app.
- Confirm editable sample is visible without import.
- Click heading on canvas.
- Edit heading text.
- Add a callout block.
- Import a small HTML draft.
- Export.
- Assert exported standalone HTML contains the edited text and callout.
- Assert compatibility report is visible and parseable.
- Assert no forbidden generic builder blocks are visible.

Visual smoke:

- Desktop and mobile screenshots should show:
  - no overlapping panels
  - visible canvas
  - visible selected element outline
  - usable inspector

Implementation planning must add a real browser automation gate for this spike. The existing static built-bundle smoke is not enough for click selection, editing, block insertion, export, or screenshot evidence.

## Implementation Plan Boundary

Do not implement this as incremental patches on the current `main.ts` string-rendered UI.

The current app shell should be treated as disposable scaffolding. The implementation plan should replace the app surface with a dedicated visual-editor module structure.

Suggested files:

- `packages/app/src/editor/visualEditor.ts`
- `packages/app/src/editor/grapesAdapter.ts`
- `packages/app/src/editor/coreExportAdapter.ts`
- `packages/app/src/editor/blockPalette.ts`
- `packages/app/src/ui/appShell.ts`
- `packages/app/src/ui/inspector.ts`
- `packages/app/src/ui/importDrawer.ts`
- `packages/app/src/ui/exportDrawer.ts`
- `packages/app/test/visualEditor.test.ts`

## Non-Goals

- Do not build a full website builder.
- Do not support arbitrary JavaScript widgets.
- Do not promise lossless editing for every imported HTML/CSS construct.
- Do not implement Confluence API publishing.
- Do not claim `native-mapping-report.json` is a native page body.
- Do not move sanitizer, compatibility, or export logic into `packages/app`.

## Decision

Proceed with a GrapesJS spike unless install or integration reveals a blocking issue.

If GrapesJS proves too invasive, fall back to a custom canvas-selection adapter only for static HTML nodes, but this should be the fallback, not the starting assumption.

As of this review, the local environment cannot fetch `grapesjs` from npm because `registry.npmjs.org` DNS resolution fails. The implementation plan therefore needs a dependency-install gate before claiming the GrapesJS-backed version complete.

## References

- Webflow intro: canvas-centered element selection and page editing.
  - https://help.webflow.com/hc/en-us/articles/33961260162323-Intro-to-Webflow
- Webflow CMS on-canvas editing.
  - https://webflow.com/updates/cms-on-canvas-editing
- Framer on-page editing.
  - https://www.framer.com/help/articles/on-page-editing/
- Atlassian Confluence editor guide: toolbar, plus, and slash-command insertion patterns.
  - https://www.atlassian.com/software/confluence/resources/guides/confluence-essentials/formatting-editing
- GrapesJS GitHub repository and license.
  - https://github.com/GrapesJS/grapesjs
- GrapesJS product site.
  - https://grapesjs.com/
- Craft.js documentation.
  - https://craft.js.org/
- Tiptap editor product page.
  - https://tiptap.dev/product/editor
- Lexical GitHub repository.
  - https://github.com/facebook/lexical
