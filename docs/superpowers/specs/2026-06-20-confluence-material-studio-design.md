# Confluence Material Studio Design

Date: 2026-06-20

## Summary

Build a Confluence material studio for creating and editing presentation-style internal materials, not a presentation runtime and not a raw HTML IDE.

The product lets users import HTML or Markdown/outline drafts, visually edit the material as section-based content, then export to multiple targets:

- Standalone self-contained HTML
- Confluence HTML fragment
- Confluence-native draft/report
- Future hosted iframe or Forge macro package

The core design choice is a hybrid architecture: preserve visual output through a canonical render tree, then layer semantic metadata on top for editing tools and Confluence-native export.

## Goals

- Let users create and modify presentation-style HTML/materials without directly editing raw HTML.
- Support Confluence-oriented outputs without forcing every artifact into HTML.
- Preserve imported HTML appearance as much as possible for standalone HTML export.
- Make export trade-offs explicit: visual fidelity, Confluence editability, and dynamic capability are separate concerns.
- Support theme, layout, text, content block, and limited canvas editing from the first useful version.
- Avoid runtime external CDN or network dependencies in generated artifacts.

## Non-goals

- Presenter mode, timers, speaker view, remotes, or live presentation tooling.
- Direct internal LLM/API integration in MVP.
- Full lossless editing for arbitrary HTML/CSS/JS.
- Real-time Confluence synchronization in MVP.
- Forge macro deployment in MVP.
- A general-purpose web page builder for every possible HTML layout.

## Product Positioning

The product is a Confluence material studio. It can produce standalone HTML, but HTML is one export target rather than the whole product identity.

The primary workflow is:

1. Import an AI-generated or human-authored draft.
2. Normalize it into an editable project while preserving its visual structure.
3. Edit sections, blocks, themes, and layouts visually.
4. Preview target-specific rendering.
5. Export the artifact best suited to the destination.

## Core User Flow

1. Start from one of:
   - HTML paste or file import
   - Markdown or outline import
   - Empty document or template
2. Review import warnings:
   - External CSS, fonts, or assets
   - Script dependency
   - iframe or embed dependency
   - unsupported CSS/layout features
   - Confluence compatibility risks
3. Edit in the studio:
   - Navigate by section
   - Edit text inline
   - Add, remove, duplicate, and reorder blocks
   - Change theme tokens and section layouts
   - Use constrained free-position regions for visual sections
4. Preview export targets:
   - Standalone HTML
   - Confluence constrained-width fragment
   - Confluence-native draft/report
5. Export with a compatibility report.

## Editor UX

The editor has four main regions.

### Section Navigator

The left panel shows section thumbnails and titles. It supports adding, duplicating, deleting, and reordering sections. Users experience the document like presentation pages, while the internal model remains section-first and exportable as a long document.

### Live Canvas

The center renders the selected section close to final output. Users can select blocks, edit text inline, move or duplicate blocks, and change section layouts. Some layouts may include constrained canvas regions for cover, hero, and visual sections.

### Inspector

The right panel changes based on selection:

- Document: theme and export profile settings
- Section: layout, background, spacing, and responsive behavior
- Block: content, style, data, and Confluence mapping

The inspector always includes Confluence compatibility status:

- Native possible
- HTML fragment only
- iframe or Forge recommended
- visual loss expected

### Command Bar

The top bar includes import, export, undo/redo, preview width, theme controls, and compatibility checks.

## Data Model

The source of truth is a `ProjectDoc` JSON file. Its central structure is not a semantic block tree alone. It is a canonical render tree with semantic overlay metadata.

```ts
type ProjectDoc = {
  version: string;
  title: string;
  themeTokens: ThemeTokens;
  renderTree: RenderNode;
  semanticOverlay: SemanticOverlayEntry[];
  assets: Asset[];
  exportProfiles: ExportProfile[];
};

type RenderNode = {
  id: string;
  tag: string;
  attrs: Record<string, string>;
  classList: string[];
  inlineStyle: Record<string, string>;
  children: RenderNode[];
  text?: string;
  locked?: boolean;
  sourceMeta?: SourceMeta;
};

type SemanticOverlayEntry = {
  nodeId: string;
  role:
    | "document"
    | "section"
    | "title"
    | "paragraph"
    | "image"
    | "table"
    | "cardGrid"
    | "comparison"
    | "timeline"
    | "callout"
    | "status"
    | "panel"
    | "expand"
    | "code"
    | "canvasGroup"
    | "rawHtml";
  editableFields: string[];
  confluenceMapping: ConfluenceMapping;
  warnings: CompatibilityWarning[];
};
```

### Render Tree

The render tree preserves HTML-like structure and styling. Standalone HTML export is generated from this tree, so visual fidelity does not depend on perfect semantic recognition.

### Semantic Overlay

The semantic overlay tells the editor what a node means. It powers block-specific controls and Confluence-native export. If semantic recognition fails, the render tree still preserves the artifact for HTML export.

## Import Pipeline

### HTML Import

HTML import uses browser parsing APIs to build a render tree. The importer should:

- Preserve DOM structure, class names, inline styles, and local style rules where feasible.
- Remove, disable, or isolate scripts.
- Detect external resources and require local replacement or explicit risk acknowledgement.
- Promote recognized patterns into semantic overlay entries.
- Lock or partially lock nodes that are risky to edit but important for visual preservation.
- Produce an import report.

The importer should not promise arbitrary HTML/CSS/JS lossless editing. It should promise best-effort visual preservation plus clear warnings.

### Markdown and Outline Import

Markdown import maps headings to sections, then maps paragraphs, lists, tables, code blocks, and images to render nodes with semantic overlay entries. It can suggest section layouts based on heading depth and content density.

## Export Pipeline

### Standalone HTML

Standalone export prioritizes visual fidelity.

- Generated from the render tree
- Self-contained by default
- No external CDN dependency
- Styles emitted in a scoped `<style>` block or inline where needed
- Assets embedded or bundled by export profile

### Confluence HTML Fragment

Fragment export balances fidelity with Confluence constraints.

- Generated from the render tree
- Wrapped in a scoped class such as `.cf-material-<id>`
- External dependencies removed or converted
- Script dependency excluded from MVP output
- Width, overflow, fixed positioning, viewport units, and font fallback checked
- Includes a compatibility report and copyable fragment

### Confluence-native Draft or Report

Native export prioritizes Confluence editability, search, reuse, and collaboration. It uses semantic overlay entries rather than raw visual preservation.

Candidate mappings:

- Headings, paragraphs, lists, tables, and images to native content
- `status` to Status macro
- `callout`, `panel`, `warning`, `tip`, and `note` to Confluence panel/note-style structures
- `expand` to Expand macro
- `toc` candidates to Table of Contents macro
- reusable sections to Excerpt or Include candidates
- structured metadata to Content Properties candidates

Native export may look different from standalone HTML. The UI must make that trade-off explicit.

### Future Forge or iFrame Package

For visual and interactive artifacts that do not fit native Confluence, a future export target can produce:

- iframe-ready self-contained bundle
- Forge Custom UI macro package structure
- static ADF export fallback for Confluence export/history surfaces

This is not part of MVP implementation.

## Block Palette

MVP blocks:

- heading
- paragraph
- list
- image/figure
- table
- card grid
- comparison
- steps/timeline
- callout/panel
- status
- expand/detail
- code
- raw HTML/render node preservation
- canvas group for constrained free-position regions

Confluence-oriented templates:

- Status row
- Decision panel
- Risk callout
- Expand detail
- Excerpt section candidate
- Properties table candidate
- TOC-ready heading structure
- Include page marker

## Compatibility Report

Every export should include target-specific checks.

Report dimensions:

- Visual fidelity estimate
- Confluence editability estimate
- Unsupported features
- External dependencies
- Asset handling
- Responsive behavior risks
- Macro/native conversion coverage
- Recommended export target

Example scoring:

- Standalone HTML: high visual fidelity, no native Confluence editability
- Confluence fragment: medium to high visual fidelity, low native editability
- Confluence-native: medium visual fidelity, high native editability

## MVP Scope

### Include

- HTML paste/file import
- Markdown/outline import
- Render tree storage
- Semantic overlay storage
- Section navigator
- Live canvas
- Inspector
- Inline text editing
- Section/block add, duplicate, delete, and reorder
- Theme token editing for color, font stack, spacing, radius, and simple shadows
- Limited canvas regions for visual sections
- Desktop/tablet/mobile preview widths
- Standalone HTML export
- Confluence HTML fragment export
- Confluence-native draft/report export
- Compatibility report

### Exclude

- Confluence API publish/update
- Attachment upload
- Forge macro deployment
- Live sync
- Direct AI generation
- Full JavaScript interactivity export
- Arbitrary raw CSS IDE workflow

## Technical Constraints

- Runtime output must not rely on external CDN or network calls.
- npm dependencies may be bundled into the application build.
- Generated HTML should be self-contained or explicitly bundled with local assets.
- Imported scripts are disabled or excluded in MVP.
- The app should avoid presenting Confluence-native export as visually equivalent to standalone HTML.

## Testing Strategy

### Unit Tests

- HTML parsing and sanitization
- render tree serialization/deserialization
- semantic overlay detection
- Markdown import
- export adapters
- compatibility rules

### Golden Tests

- sample HTML import and export snapshots
- Markdown import to section/block snapshots
- block export mappings per target
- compatibility report fixtures

### Visual Regression Tests

- original HTML preview versus imported render tree preview
- standalone HTML export screenshot comparison
- Confluence-width fragment preview screenshot comparison
- common responsive breakpoints

### End-to-End Tests

- HTML import, text edit, theme edit, standalone export
- Markdown import, section reorder, Confluence fragment export
- raw visual structure preservation
- unsupported feature warning
- target-specific compatibility report generation

## Key Decisions

- Use a hybrid Confluence asset studio approach.
- Use sections as the main editing unit.
- Use block/layout editing by default with constrained free-position regions.
- Support both HTML import and Markdown/outline import.
- Keep direct AI integration out of MVP.
- Treat HTML as one export target, not the entire product.
- Preserve visual fidelity through a canonical render tree.
- Add semantic overlay metadata for editing and Confluence-native conversion.
- Separate visual fidelity from Confluence editability in the UI.

## References Checked

- Atlassian Confluence elements documentation: https://support.atlassian.com/confluence-cloud/docs/insert-elements-into-a-page/
- Atlassian Confluence macros documentation: https://support.atlassian.com/confluence-cloud/docs/what-are-macros/
- Confluence REST content body API documentation: https://developer.atlassian.com/cloud/confluence/rest/v1/api-group-content-body/
- Atlassian Forge macro module documentation: https://developer.atlassian.com/platform/forge/manifest-reference/modules/macro/
- Atlassian Forge rich-text bodied macro documentation: https://developer.atlassian.com/platform/forge/using-rich-text-bodied-macros/
