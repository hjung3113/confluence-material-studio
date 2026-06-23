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

export type StructuralSanitizer = (html: string) => string;

const URL_ATTRIBUTE_NAMES = new Set([
  "action",
  "data",
  "formaction",
  "href",
  "poster",
  "src",
  "srcset",
  "xlink:href",
]);
const REMOTE_URL_PATTERN = /^(?:https?:)?\/\//i;
const CSS_COMMENT_PATTERN = /\/\*[\s\S]*?\*\//g;
const CSS_REMOTE_IMPORT_PATTERN =
  /@import\s*(?:url\(\s*)?(?:"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|(?:\\.|[^;)])*)(?:\s*\))?\s*;?/gi;
const CSS_URL_FUNCTION_PATTERN =
  /url\(\s*(?:"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|(?:\\.|[^)])*)\s*\)/gi;
export const ACTIVE_EMBED_TAG_NAMES = new Set(["embed", "iframe", "object"]);

export function sanitizeHtmlWithStructuralSanitizer(
  html: string,
  structuralSanitizer?: StructuralSanitizer,
): SanitizedHtml {
  const warnings = new Map<CompatibilityRuleId, CompatibilityWarning>();

  const classificationFragment = parseFragment(html);
  sanitizeChildren(classificationFragment, warnings);

  const fragment = parseFragment(structuralSanitizer?.(html) ?? html);
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
    if (isElement(child)) {
      const tagName = child.tagName.toLowerCase();

      if (tagName === "script") {
        addWarning(warnings, "HTML_SCRIPT_REMOVED");
        return false;
      }

      if (ACTIVE_EMBED_TAG_NAMES.has(tagName)) {
        addWarning(warnings, "HTML_REMOTE_RESOURCE");
        return false;
      }
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
        attr.value = sanitizeCss(attr.value, warnings);
      }

      return true;
    }

    if (attrName === "srcset") {
      const sanitizedSrcset = sanitizeSrcset(attr.value, warnings);

      if (sanitizedSrcset === "") {
        return false;
      }

      attr.value = sanitizedSrcset;
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
  let sanitizedCss = normalizeCssSyntax(css);

  sanitizedCss = sanitizedCss.replace(CSS_REMOTE_IMPORT_PATTERN, (match) =>
    sanitizeCssImport(match, warnings),
  );
  sanitizedCss = sanitizedCss.replace(CSS_URL_FUNCTION_PATTERN, (match) =>
    sanitizeCssUrl(match, warnings),
  );

  return sanitizedCss;
}

function normalizeCssSyntax(css: string): string {
  return decodeCssEscapes(css.replace(CSS_COMMENT_PATTERN, " "));
}

function sanitizeSrcset(
  srcset: string,
  warnings: Map<CompatibilityRuleId, CompatibilityWarning>,
): string {
  const candidates = splitSrcsetCandidates(srcset);
  const safeCandidates = candidates.filter((candidate) => {
    const url = candidate.trimStart().split(/\s+/, 1)[0] ?? "";

    if (REMOTE_URL_PATTERN.test(url.toLowerCase())) {
      addWarning(warnings, "HTML_REMOTE_RESOURCE");
      return false;
    }

    return true;
  });

  return safeCandidates.join(", ");
}

function splitSrcsetCandidates(srcset: string): string[] {
  const dataUrlPlaceholders: string[] = [];
  const placeholderPrefix = "__HTMLEDITOR_DATA_URL_";
  const protectedSrcset = srcset.replace(/data:[^\s,]+,[^\s]+/gi, (match) => {
    const placeholder = `${placeholderPrefix}${dataUrlPlaceholders.length}__`;
    dataUrlPlaceholders.push(match);
    return placeholder;
  });

  return protectedSrcset
    .split(",")
    .map((candidate) =>
      candidate
        .trim()
        .replace(
          new RegExp(`${placeholderPrefix}(\\d+)__`, "g"),
          (_match, index: string) => dataUrlPlaceholders[Number(index)] ?? "",
        ),
    )
    .filter((candidate) => candidate !== "");
}

function containsRemoteUrl(css: string): boolean {
  return /(?:https?:)?\/\//i.test(css.replace(/\s+/g, ""));
}

function containsJavascriptUrl(css: string): boolean {
  return css.replace(/\s+/g, "").toLowerCase().includes("javascript:");
}

function sanitizeCssImport(
  cssImport: string,
  warnings: Map<CompatibilityRuleId, CompatibilityWarning>,
): string {
  if (containsJavascriptUrl(cssImport)) {
    return removeCssJavascriptUrl(warnings);
  }

  if (containsRemoteUrl(cssImport)) {
    return removeCssImport(warnings);
  }

  return cssImport;
}

function sanitizeCssUrl(
  cssUrl: string,
  warnings: Map<CompatibilityRuleId, CompatibilityWarning>,
): string {
  if (containsJavascriptUrl(cssUrl)) {
    return removeCssJavascriptUrl(warnings);
  }

  if (containsRemoteUrl(cssUrl)) {
    return removeCssUrl(warnings);
  }

  return cssUrl;
}

function removeCssImport(
  warnings: Map<CompatibilityRuleId, CompatibilityWarning>,
): string {
  addWarning(warnings, "HTML_REMOTE_RESOURCE");
  return "";
}

function removeCssUrl(
  warnings: Map<CompatibilityRuleId, CompatibilityWarning>,
): string {
  addWarning(warnings, "HTML_REMOTE_RESOURCE");
  return 'url("")';
}

function removeCssJavascriptUrl(
  warnings: Map<CompatibilityRuleId, CompatibilityWarning>,
): string {
  addWarning(warnings, "HTML_JAVASCRIPT_URL");
  return 'url("")';
}

function decodeCssEscapes(value: string): string {
  return value.replace(
    /\\([0-9a-f]{1,6}\s?|.)/gi,
    (_match, escapeSequence: string) => {
      const hexMatch = /^([0-9a-f]{1,6})\s?$/i.exec(escapeSequence);

      if (!hexMatch) {
        return escapeSequence;
      }

      const codePoint = Number.parseInt(hexMatch[1] ?? "", 16);
      return Number.isNaN(codePoint) ? "" : String.fromCodePoint(codePoint);
    },
  );
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
    ruleId,
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
    .map((rule) => warnings.get(rule.id))
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
  return "value" in node;
}

function isTemplate(
  node: DefaultTreeAdapterTypes.Element,
): node is DefaultTreeAdapterTypes.Template {
  return node.tagName.toLowerCase() === "template" && "content" in node;
}
