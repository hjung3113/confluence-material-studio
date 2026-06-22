import type { CompatibilityRuleId } from "./rules.js";
import { getCompatibilityRule } from "./rules.js";
import type {
  CompatibilityWarning,
  ProjectDoc,
  RenderNode,
} from "../document/types.js";

type DetectedRule = {
  ruleId: CompatibilityRuleId;
  nodeId: string;
};

const FRAGMENT_RULE_ORDER: CompatibilityRuleId[] = [
  "CF_FRAGMENT_GLOBAL_SELECTOR",
  "CF_FRAGMENT_OVERFLOW_RISK",
  "CF_FRAGMENT_VIEWPORT_UNIT",
  "CF_FRAGMENT_FIXED_POSITION",
];

export function detectCompatibilityWarnings(
  doc: ProjectDoc,
): CompatibilityWarning[] {
  const detected = new Map<CompatibilityRuleId, DetectedRule>();

  visitNode(doc.renderTree, (node) => {
    for (const ruleId of detectFragmentCssRules(node)) {
      if (!detected.has(ruleId)) {
        detected.set(ruleId, { ruleId, nodeId: node.id });
      }
    }
  });

  return FRAGMENT_RULE_ORDER.flatMap((ruleId) => {
    const detection = detected.get(ruleId);
    const rule = getCompatibilityRule(ruleId);

    if (!detection || !rule) {
      return [];
    }

    return [
      {
        ruleId: rule.id,
        target: rule.target,
        severity: rule.severity,
        message: rule.message,
        recommendation: rule.recommendation,
        nodeId: detection.nodeId,
      },
    ];
  });
}

function detectFragmentCssRules(node: RenderNode): CompatibilityRuleId[] {
  const css = [
    node.tag === "style" ? textContent(node) : "",
    styleRecordToCss(node.inlineStyle),
  ]
    .filter(Boolean)
    .join("\n");

  if (!css) {
    return [];
  }

  const rules = new Set<CompatibilityRuleId>();

  if (hasGlobalSelector(css)) {
    rules.add("CF_FRAGMENT_GLOBAL_SELECTOR");
  }

  if (
    /(^|[;\s{])overflow(?:-[xy])?\s*:|(^|[;\s{])width\s*:\s*(?:[1-9]\d{3,}px|[2-9]\d{2}vw)/i.test(
      css,
    )
  ) {
    rules.add("CF_FRAGMENT_OVERFLOW_RISK");
  }

  if (/\b\d*\.?\d+(?:vh|vw|vmin|vmax)\b/i.test(css)) {
    rules.add("CF_FRAGMENT_VIEWPORT_UNIT");
  }

  if (/(^|[;\s{])position\s*:\s*fixed\b/i.test(css)) {
    rules.add("CF_FRAGMENT_FIXED_POSITION");
  }

  return [...rules];
}

function hasGlobalSelector(css: string): boolean {
  const withoutAtRules = css.replace(
    /@(?:media|supports|keyframes)[^{]*{/g,
    "{",
  );

  return /(^|})\s*(?::root|html|body)(?:\s|,|{)/i.test(withoutAtRules);
}

function styleRecordToCss(style: Record<string, string>): string {
  return Object.entries(style)
    .map(([name, value]) => `${name}: ${value};`)
    .join(" ");
}

function textContent(node: RenderNode): string {
  if (node.tag === "#text") {
    return node.text ?? "";
  }

  return node.children.map((child) => textContent(child)).join("");
}

function visitNode(node: RenderNode, visit: (node: RenderNode) => void): void {
  visit(node);

  for (const child of node.children) {
    visitNode(child, visit);
  }
}
