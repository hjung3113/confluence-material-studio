import {
  parseFragment,
  serialize,
  type DefaultTreeAdapterTypes,
} from "parse5";
import {
  getCompatibilityRule,
  listCompatibilityRules,
} from "../compatibility/rules.js";
import type { CompatibilityRuleId } from "../compatibility/rules.js";
import type { CompatibilityWarning } from "../document/types.js";

export type SanitizedHtml = {
  html: string;
  warnings: CompatibilityWarning[];
};

const URL_ATTRIBUTE_NAMES = new Set([
  "action",
  "formaction",
  "href",
  "poster",
  "src",
  "srcset",
  "xlink:href",
]);
const REMOTE_URL_PATTERN = /\bhttps?:\/\//i;
const CSS_REMOTE_URL_FUNCTION_PATTERN =
  /url\(\s*(?:"https?:\/\/[^"]*"|'https?:\/\/[^']*'|https?:\/\/[^)]*)\s*\)/gi;
const CSS_REMOTE_IMPORT_PATTERN =
  /@import\s+(?:url\(\s*)?(?:"https?:\/\/[^"]*"|'https?:\/\/[^']*'|https?:\/\/[^;)]*)(?:\s*\))?\s*;?/gi;

export function sanitizeHtml(html: string): SanitizedHtml {
  const fragment = parseFragment(html);
  const warnings = new Map<CompatibilityRuleId, CompatibilityWarning>();

  sanitizeChildren(fragment, warnings);

  return {
    html: serialize(fragment),
    warnings: sortWarningsByCatalog(warnings),
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
  sanitizeStyleElement(node, warnings);
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
      if (attrName === "style") {
        const sanitizedStyle = sanitizeCss(attr.value, warnings);
        attr.value = sanitizedStyle;
      }

      return true;
    }

    const url = attr.value.trimStart().toLowerCase();

    if (url.startsWith("javascript:")) {
      addWarning(warnings, "HTML_JAVASCRIPT_URL");
      return false;
    }

    if (REMOTE_URL_PATTERN.test(url)) {
      addWarning(warnings, "HTML_REMOTE_RESOURCE");
      return false;
    }

    return true;
  });
}

function sanitizeStyleElement(
  element: DefaultTreeAdapterTypes.Element,
  warnings: Map<CompatibilityRuleId, CompatibilityWarning>,
): void {
  if (element.tagName.toLowerCase() !== "style") {
    return;
  }

  for (const child of element.childNodes) {
    if (isTextNode(child)) {
      child.value = sanitizeCss(child.value, warnings);
    }
  }
}

function sanitizeCss(
  css: string,
  warnings: Map<CompatibilityRuleId, CompatibilityWarning>,
): string {
  let sanitizedCss = css;

  sanitizedCss = sanitizedCss.replace(CSS_REMOTE_IMPORT_PATTERN, () => {
    addWarning(warnings, "HTML_REMOTE_RESOURCE");
    return "";
  });
  sanitizedCss = sanitizedCss.replace(CSS_REMOTE_URL_FUNCTION_PATTERN, () => {
    addWarning(warnings, "HTML_REMOTE_RESOURCE");
    return "url(\"\")";
  });

  return sanitizedCss;
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

function sortWarningsByCatalog(
  warnings: Map<CompatibilityRuleId, CompatibilityWarning>,
): CompatibilityWarning[] {
  return listCompatibilityRules()
    .map(({ id }) => warnings.get(id))
    .filter((warning): warning is CompatibilityWarning => Boolean(warning));
}

function isElement(
  node: DefaultTreeAdapterTypes.ChildNode,
): node is DefaultTreeAdapterTypes.Element {
  return "tagName" in node;
}

function isTextNode(
  node: DefaultTreeAdapterTypes.ChildNode,
): node is DefaultTreeAdapterTypes.TextNode {
  return node.nodeName === "#text";
}

function isTemplate(
  node: DefaultTreeAdapterTypes.Element,
): node is DefaultTreeAdapterTypes.Template {
  return node.tagName.toLowerCase() === "template" && "content" in node;
}
