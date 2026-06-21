# Compatibility Rules

## Rule Shape

Compatibility reports must reference stable rule IDs.

```ts
type CompatibilityRule = {
  id: string;
  target: "standalone-html" | "confluence-fragment" | "native-mapping";
  severity: "info" | "warning" | "error";
  detector: string;
  message: string;
  recommendation: string;
};
```

## Initial Rule Catalog

| ID | Target | Severity | Detector | Message | Recommendation |
| --- | --- | --- | --- | --- | --- |
| `HTML_REMOTE_RESOURCE` | standalone-html | warning | `src`/`href` points to remote URL | Output depends on a remote resource. | Replace with local asset or embedded data. |
| `HTML_SCRIPT_REMOVED` | standalone-html | warning | `<script>` found | Imported script is excluded in MVP. | Replace behavior with a supported declarative block later. |
| `HTML_INLINE_HANDLER_REMOVED` | standalone-html | warning | `on*` attribute found | Inline event handler is excluded in MVP. | Remove interaction or model it as a future widget. |
| `HTML_JAVASCRIPT_URL` | standalone-html | error | `javascript:` URL found | JavaScript URL is unsafe and unsupported. | Replace with a safe URL or remove the link. |
| `CF_FRAGMENT_FIXED_POSITION` | confluence-fragment | warning | CSS `position: fixed` | Fixed positioning may render incorrectly in Confluence containers. | Use normal flow or absolute positioning inside a bounded section. |
| `CF_FRAGMENT_VIEWPORT_UNIT` | confluence-fragment | warning | `vh`, `vw`, `vmin`, `vmax` | Viewport units may not match Confluence content area. | Use container-relative sizing where possible. |
| `CF_FRAGMENT_GLOBAL_SELECTOR` | confluence-fragment | warning | global CSS selector | Global selectors can leak or be overridden. | Scope selectors under the generated wrapper. |
| `CF_FRAGMENT_OVERFLOW_RISK` | confluence-fragment | warning | overflow or wide fixed width | Content may clip or scroll in Confluence. | Add responsive constraints. |
| `CF_NATIVE_UNMAPPED_LAYOUT` | native-mapping | info | visual layout has no native equivalent | This block has no safe native Confluence mapping. | Keep as fragment or future iframe/Forge target. |
| `CF_NATIVE_VISUAL_LOSS` | native-mapping | warning | mapping changes layout/styling materially | Native mapping will not preserve visual appearance. | Use HTML fragment if visual fidelity is more important. |

## Report Rules

- Reports must include rule IDs, affected node IDs where available, target, severity, and recommendation.
- UI text may be localized later, but rule IDs remain stable.
- New compatibility behavior requires adding or updating this catalog.
- `error` blocks the affected export target or requires explicit user resolution.
- `warning` permits export but must be visible in import or export review.
- `info` documents expected loss, unmapped content, or non-blocking caveats.
