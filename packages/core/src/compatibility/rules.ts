import type {
  CompatibilitySeverity,
  ExportTarget,
} from "../document/types.js";

export type CompatibilityRuleId =
  | "HTML_REMOTE_RESOURCE"
  | "HTML_SCRIPT_REMOVED"
  | "HTML_INLINE_HANDLER_REMOVED"
  | "HTML_JAVASCRIPT_URL"
  | "CF_FRAGMENT_FIXED_POSITION"
  | "CF_FRAGMENT_VIEWPORT_UNIT"
  | "CF_FRAGMENT_GLOBAL_SELECTOR"
  | "CF_FRAGMENT_OVERFLOW_RISK"
  | "CF_NATIVE_UNMAPPED_LAYOUT"
  | "CF_NATIVE_VISUAL_LOSS";

export type CompatibilityRule = {
  id: CompatibilityRuleId;
  target: ExportTarget;
  severity: CompatibilitySeverity;
  detector: string;
  message: string;
  recommendation: string;
};

const COMPATIBILITY_RULES: CompatibilityRule[] = [
  {
    id: "HTML_REMOTE_RESOURCE",
    target: "standalone-html",
    severity: "warning",
    detector: "src/href points to remote URL",
    message: "Output depends on a remote resource.",
    recommendation: "Replace with local asset or embedded data.",
  },
  {
    id: "HTML_SCRIPT_REMOVED",
    target: "standalone-html",
    severity: "warning",
    detector: "<script> found",
    message: "Imported script is excluded in MVP.",
    recommendation: "Replace behavior with a supported declarative block later.",
  },
  {
    id: "HTML_INLINE_HANDLER_REMOVED",
    target: "standalone-html",
    severity: "warning",
    detector: "on* attribute found",
    message: "Inline event handler is excluded in MVP.",
    recommendation: "Remove interaction or model it as a future widget.",
  },
  {
    id: "HTML_JAVASCRIPT_URL",
    target: "standalone-html",
    severity: "error",
    detector: "javascript: URL found",
    message: "JavaScript URL is unsafe and unsupported.",
    recommendation: "Replace with a safe URL or remove the link.",
  },
  {
    id: "CF_FRAGMENT_FIXED_POSITION",
    target: "confluence-fragment",
    severity: "warning",
    detector: "CSS position: fixed",
    message: "Fixed positioning may render incorrectly in Confluence containers.",
    recommendation:
      "Use normal flow or absolute positioning inside a bounded section.",
  },
  {
    id: "CF_FRAGMENT_VIEWPORT_UNIT",
    target: "confluence-fragment",
    severity: "warning",
    detector: "vh, vw, vmin, vmax",
    message: "Viewport units may not match Confluence content area.",
    recommendation: "Use container-relative sizing where possible.",
  },
  {
    id: "CF_FRAGMENT_GLOBAL_SELECTOR",
    target: "confluence-fragment",
    severity: "warning",
    detector: "global CSS selector",
    message: "Global selectors can leak or be overridden.",
    recommendation: "Scope selectors under the generated wrapper.",
  },
  {
    id: "CF_FRAGMENT_OVERFLOW_RISK",
    target: "confluence-fragment",
    severity: "warning",
    detector: "overflow or wide fixed width",
    message: "Content may clip or scroll in Confluence.",
    recommendation: "Add responsive constraints.",
  },
  {
    id: "CF_NATIVE_UNMAPPED_LAYOUT",
    target: "native-mapping",
    severity: "info",
    detector: "visual layout has no native equivalent",
    message: "This block has no safe native Confluence mapping.",
    recommendation: "Keep as fragment or future iframe/Forge target.",
  },
  {
    id: "CF_NATIVE_VISUAL_LOSS",
    target: "native-mapping",
    severity: "warning",
    detector: "mapping changes layout/styling materially",
    message: "Native mapping will not preserve visual appearance.",
    recommendation: "Use HTML fragment if visual fidelity is more important.",
  },
];

export function listCompatibilityRules(): CompatibilityRule[] {
  return COMPATIBILITY_RULES.map((rule) => ({ ...rule }));
}

export function getCompatibilityRule(
  ruleId: CompatibilityRuleId,
): CompatibilityRule | undefined {
  const rule = COMPATIBILITY_RULES.find(({ id }) => id === ruleId);
  return rule ? { ...rule } : undefined;
}
