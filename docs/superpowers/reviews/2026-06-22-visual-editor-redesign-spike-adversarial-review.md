# Adversarial Design Review: Visual Editor Redesign Spike

Date: 2026-06-22

Reviewed spec:

- `docs/superpowers/specs/2026-06-22-visual-editor-redesign-spike.md`

Reviewer stance:

- Assume a visual-editor spike will drift into a generic website builder unless scope is actively constrained.
- Assume imported HTML is messy, visually important, and only partially editable.
- Treat the editor engine as replaceable app-layer implementation, not as the product model.
- Preserve `packages/core` as the authority for import, sanitization, compatibility, and export.

## Verdict

The redesign is directionally correct. The previous app shell optimized for proving export artifacts; this spec correctly recenters the product on canvas selection, in-context editing, and constrained Confluence-material blocks.

The main risk is that "use GrapesJS" becomes a shortcut around the product model. GrapesJS can provide a usable visual editor quickly, but only if the spike defines a narrow adapter interface and refuses default website-builder scope.

Confidence: 76%.

## P0 / Must Fix Before Implementation

### P0-1. Define the GrapesJS adapter interface before installing the dependency

The spec says `packages/app` owns GrapesJS setup and conversion between editor state and core calls, but it does not define the interface the rest of the app will call.

Without that interface, GrapesJS leaks everywhere: panels, inspector, import, export, tests, and future editor choices all become coupled to one library.

Required change in the implementation plan:

- Add a small app-layer interface before writing UI code:
  - `mountEditor(container, initialDocument)`
  - `setHtml(html)`
  - `getHtmlForExport()`
  - `getSelectedElement()`
  - `updateSelectedText(text)`
  - `insertBlock(blockId)`
  - `onSelectionChange(callback)`
- Keep raw GrapesJS editor objects inside `grapesAdapter.ts`.

Acceptance gate:

- Inspector and export drawer must not import `grapesjs` directly.

### P0-2. Clarify import truth: source artifact, sanitized HTML, and editable HTML are three different things

The spec currently says the app passes HTML into core, then renders sanitized/editable HTML into GrapesJS. That compresses three artifacts into one phrase.

Required change in the implementation plan:

- `sourceArtifact`: immutable original input for audit/fallback.
- `sanitizedHtml`: safe static HTML from core import/sanitizer.
- `editableHtml`: app/editor-friendly HTML loaded into GrapesJS.

Acceptance gate:

- Tests must prove scripts and inline handlers are absent from `editableHtml`.
- Export must be generated from the current editor state, not from `sourceArtifact`.
- Compatibility reports must be based on the current edited document, not only the original import.

### P0-3. Do not let GrapesJS default blocks ship

The spec says the block palette is constrained, but it does not explicitly ban default GrapesJS blocks and panels.

This is a product-scope trap. Default blocks will turn the app into a website builder and introduce unsupported export expectations.

Required change in the implementation plan:

- Start GrapesJS with default panels/blocks disabled where possible.
- Register only the approved Confluence-material blocks.
- Add a test asserting the exported block registry contains only allowed IDs.

Acceptance gate:

- No form, nav, script, iframe, embed, ecommerce, or remote asset block is visible in the first spike.

### P0-4. Browser smoke is mandatory for this spike

The previous app smoke verified bundle text, not actual editing behavior. That is insufficient for a visual editor.

Required change:

- Add Playwright or equivalent browser smoke as part of the spike acceptance path.
- The smoke must click inside the canvas, edit text, insert a block, and export.

Acceptance gate:

- A command exists that fails if click-to-select or edit-in-canvas breaks.

## P1 / Should Fix Before First Build Plan

### P1-1. Define "editable enough" for imported HTML

The spec correctly rejects lossless arbitrary HTML editing, but it does not say what happens when a user clicks an imported structure that cannot be cleanly edited.

Required design detail:

- Text-bearing elements should be editable.
- Recognized block patterns should expose block controls.
- Unknown structures should be selectable and preservable, but may show limited controls.
- Unsupported structures should show a compatibility hint, not silently fail.

### P1-2. Separate visual fidelity from editability in the UI

The product has two promises that conflict:

- Preserve imported visual output.
- Let users edit it safely.

The UI must show that some imported regions are preserved but only partially editable.

Recommended UI language:

- `Editable`
- `Preserved`
- `Export risk`

Avoid implying every visual element can become a clean native Confluence block.

### P1-3. Make Confluence-material blocks semantic first, visual second

The initial block palette is reasonable, but each block needs a semantic role or native mapping expectation.

Required design detail:

- Each block ID maps to a role such as `title`, `paragraph`, `callout`, `status`, `expand`, `code`, or `metric`.
- Native mapping report should identify these roles.
- Visual-only blocks must be marked as fragment-preserved unless mapping is proven.

### P1-4. Theme controls need a smaller first slice

The MVP scope includes color, font stack, spacing, radius, and simple shadows. That is too much for the first GrapesJS spike.

Recommended first slice:

- Text content
- Section duplicate/delete/move
- Accent/background color
- Spacing preset

Defer font stack, radius, shadows, and detailed style editing until click selection and export are proven.

### P1-5. Decide whether the spike replaces or coexists with the current app shell

The spec says the current shell is disposable scaffolding, which is correct. The implementation plan must make the replacement explicit.

Required change:

- Do not build GrapesJS behind the existing source/inspector/export layout.
- Replace `main.ts` with a new app shell entry that mounts the visual editor.
- Keep old app model tests only if they still describe behavior behind the new adapter.

## P2 / Useful But Deferrable

- Inline text editing inside the canvas can be deferred if inspector text editing works immediately after canvas selection.
- Slash commands can be deferred behind a visible `+ Add block` affordance.
- Image replacement can wait until local asset handling is designed.
- Rich-text formatting inside text blocks can wait for a Tiptap/Lexical decision.
- Confluence live preview can wait until fragment export has browser smoke coverage.

## Recommended Implementation Gate

Before coding, write a short implementation plan that includes:

- The GrapesJS adapter interface.
- The import artifact model: source, sanitized, editable.
- The constrained block registry.
- Browser smoke command and acceptance assertions.
- The old app shell replacement plan.

Do not proceed with a broad visual-editor implementation until those five items are explicit.

## CUT / Defer

Cut from the first spike:

- Full style manager.
- Arbitrary GrapesJS block library.
- Drag-and-drop layout freedom beyond approved blocks.
- Rich text editor integration.
- Image upload/replacement.
- Confluence API publish.

Keep in the first spike:

- Import HTML.
- Canvas click selection.
- Visible selection outline.
- Selected text editing.
- One constrained block insertion.
- Core-backed export artifacts.
- Compatibility report display.
