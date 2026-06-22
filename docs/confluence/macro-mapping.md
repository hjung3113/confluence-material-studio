# Confluence Macro Mapping

## Purpose

This document defines candidate mappings from semantic overlay roles to Confluence-native content or macros.

MVP produces `native-mapping-report.json`; it does not produce a verified Confluence page body.

## Candidate Mappings

| Semantic Role | Native Candidate | Notes |
| --- | --- | --- |
| `title` | heading | Preserve hierarchy where possible. |
| `paragraph` | paragraph | Plain text and links are good candidates. |
| `list` | list | Nested lists require fixture coverage. |
| `table` | native table | Complex merged cells may be lossy. |
| `image` | image/attachment reference | Attachment upload is post-MVP. |
| `status` | Status macro | Requires color/text mapping. |
| `callout` | Info/Tip/Note/Warning or panel | Visual appearance may change. |
| `panel` | Panel macro | Width options may differ by Confluence editor. |
| `expand` | Expand macro | Exported PDF/HTML behavior may differ. |
| `code` | Code Block macro | Language metadata should be preserved. |
| `cardGrid` | fragment or future Forge/iframe | Native conversion likely loses layout. |
| `comparison` | table or fragment | Simple comparisons can become tables. |
| `timeline` | fragment or future Forge/iframe | Native conversion likely loses layout. |
| `canvasGroup` | fragment or future Forge/iframe | Native conversion not promised. |

## Mapping Report Requirements

For each mapped node, report:

- node ID
- semantic role
- recommended target
- expected visual loss
- compatibility rule IDs
- rationale

The current core smoke fixture covers status, callout, panel, expand, and code macro candidates. MVP still emits a mapping report only; it does not serialize these as Confluence storage-format macro XML.

`native-mapping-report.json` can also include a `confluenceAdfDraft` section.
That section is generated with `@atlaskit/adf-schema` to preview simple ADF
nodes such as headings, paragraphs, panels, statuses, rules, and code blocks.
It is intentionally nested inside the report so operators can inspect native
mapping progress without treating the output as a publishable Confluence body.
