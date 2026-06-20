import {
  parseFragment,
  serialize,
  type DefaultTreeAdapterTypes,
} from "parse5";
import { getCompatibilityRule } from "../compatibility/rules.js";
import type { CompatibilityRuleId } from "../compatibility/rules.js";
import type { CompatibilityWarning } from "../document/types.js";

export type SanitizedHtml = {
  html: string;
  warnings: CompatibilityWarning[];
};

const URL_ATTRIBUTE_NAMES = new Set(["href", "src"]);

export function sanitizeHtml(html: string): SanitizedHtml {
  const fragment = parseFragment(html);
  const warnings = new Map<CompatibilityRuleId, CompatibilityWarning>();

  sanitizeChildren(fragment, warnings);

  return {
    html: serialize(fragment),
    warnings: Array.from(warnings.values()),
  };
}

function sanitizeChildren(
  parent: DefaultTreeAdapterTypes.ParentNode,
  warnings: Map<CompatibilityRuleId, CompatibilityWarning>,
): void {
  parent.childNodes = parent.childNodes.filter((child) => {
    if (isElement(child) && child.tagName.toLowerCase() === "script") {
      addWarning(warnings, "HTML_SCRIPT_REMOVED");
      return false;
    }

    sanitizeNode(child, warnings);
    return true;
  });
}

function sanitizeNode(
  node: DefaultTreeAdapterTypes.ChildNode,
  warnings: Map<CompatibilityRuleId, CompatibilityWarning>,
): void {
  if (!isElement(node)) {
    return;
  }

  sanitizeAttributes(node, warnings);
  sanitizeChildren(node, warnings);

  if (isTemplate(node)) {
    sanitizeChildren(node.content, warnings);
  }
}

function sanitizeAttributes(
  element: DefaultTreeAdapterTypes.Element,
  warnings: Map<CompatibilityRuleId, CompatibilityWarning>,
): void {
  element.attrs = element.attrs.filter((attr) => {
    const attrName = attr.name.toLowerCase();

    if (attrName.startsWith("on")) {
      addWarning(warnings, "HTML_INLINE_HANDLER_REMOVED");
      return false;
    }

    if (!URL_ATTRIBUTE_NAMES.has(attrName)) {
      return true;
    }

    const url = attr.value.trimStart().toLowerCase();

    if (url.startsWith("javascript:")) {
      addWarning(warnings, "HTML_JAVASCRIPT_URL");
      return false;
    }

    if (url.startsWith("http://") || url.startsWith("https://")) {
      addWarning(warnings, "HTML_REMOTE_RESOURCE");
    }

    return true;
  });
}

function addWarning(
  warnings: Map<CompatibilityRuleId, CompatibilityWarning>,
  ruleId: CompatibilityRuleId,
): void {
  if (warnings.has(ruleId)) {
    return;
  }

  const rule = getCompatibilityRule(ruleId);

  if (!rule) {
    throw new Error(`Unknown compatibility rule: ${ruleId}`);
  }

  warnings.set(ruleId, {
    ruleId: rule.id,
    target: rule.target,
    severity: rule.severity,
    message: rule.message,
    recommendation: rule.recommendation,
  });
}

function isElement(
  node: DefaultTreeAdapterTypes.ChildNode,
): node is DefaultTreeAdapterTypes.Element {
  return "tagName" in node;
}

function isTemplate(
  node: DefaultTreeAdapterTypes.Element,
): node is DefaultTreeAdapterTypes.Template {
  return node.tagName.toLowerCase() === "template" && "content" in node;
}
