# MVP Scope

## MVP Definition

MVP proves the import, edit, preview, and export loop with real fixtures. It does not prove full Confluence-native page publishing.

## Included

- HTML paste/file import for the supported static subset.
- Markdown/outline import.
- Immutable `sourceArtifact` storage for imports.
- Canonical render tree storage.
- Semantic overlay storage.
- Section navigator.
- Live canvas.
- Inspector.
- Inline text editing.
- Section/block add, duplicate, delete, and reorder.
- Theme token editing for colors, font stack, spacing, radius, and simple shadows.
- Limited canvas regions for cover, hero, and visual sections.
- Desktop/tablet/mobile preview widths.
- Standalone HTML export as `standalone.html`.
- Confluence HTML fragment export as `confluence-fragment.html`.
- Compatibility report as `compatibility-report.json`.
- Native mapping report as `native-mapping-report.json`.

## Excluded

- Real Confluence-native page serialization as an MVP promise.
- Confluence API publish/update.
- Attachment upload.
- Forge macro deployment.
- Live sync.
- Direct AI generation.
- Full JavaScript interactivity export.
- Arbitrary raw CSS IDE workflow.

## Supported HTML Import Subset

- Static HTML.
- Local or embedded images.
- `<style>` tags and inline styles.
- CSS flex and grid, with Confluence fragment warnings where relevant.
- Safe imported CSS preserved for standalone output where practical, without promising full CSS editability.
- No script execution.
- No inline event handler execution.
- No automatic remote asset fetching.
- No iframe execution.
- No remote font dependency in exported output.

## MVP Export Artifacts

| Artifact | Purpose | Verification |
| --- | --- | --- |
| `standalone.html` | Open directly in browser with best-effort visual fidelity | HTML fixture render and screenshot comparison |
| `confluence-fragment.html` | Scoped fragment for Confluence HTML-capable contexts | Scope check and constrained-width preview |
| `compatibility-report.json` | Target-specific warning and error report | Schema and rule ID validation |
| `native-mapping-report.json` | Native Confluence mapping plan, not page export | Schema and mapping coverage validation |

## Release Gates

- Every fixture imports without crashing.
- Every fixture emits expected compatibility rule IDs.
- Exporters do not silently drop content.
- Visual regression checks exist for the fixture set.
- Fixture evidence distinguishes standalone visual preservation from Confluence-native editability.
- `AGENTS.md` and implementation-facing docs are current.
