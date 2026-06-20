# Confluence Export Targets

## Target Summary

The app supports multiple export targets with different fidelity promises.

| Target | Artifact | Primary Goal |
| --- | --- | --- |
| Standalone HTML | `standalone.html` | Visual fidelity |
| Confluence Fragment | `confluence-fragment.html` | Scoped HTML for Confluence HTML-capable contexts |
| Compatibility Report | `compatibility-report.json` | Target-specific warnings and errors |
| Native Mapping Report | `native-mapping-report.json` | Explain native Confluence conversion potential |

## Standalone HTML

Standalone HTML is generated from `renderTree`. It should open directly in a browser with no external CDN/runtime network dependency.

This target does not promise Confluence editability.

## Confluence HTML Fragment

Confluence fragment export is generated from `renderTree` but wrapped and scoped for Confluence-like constraints.

Rules:

- Scope CSS under `.cf-material-<id>`.
- Avoid global selectors where possible.
- Warn on layout features likely to break in Confluence containers.
- Exclude imported executable scripts in MVP.
- Do not fetch remote resources during export.

## Native Mapping Report

Native mapping report is generated from `semanticOverlay`.

It is not a Confluence page body. It is a plan that explains:

- nodes that can become native content,
- nodes that can become Confluence macros,
- nodes that should remain HTML fragments,
- nodes that need future iframe or Forge support,
- expected visual loss.

## Future Targets

Post-MVP targets may include:

- Confluence API page publish/update.
- Forge Custom UI macro package.
- iframe-ready hosted bundle.
- ADF/storage serialization after a dedicated validation milestone.

