import type { ExportArtifact, ProjectDoc, RenderNode } from "../document/types.js";

const UNWRAPPED_FRAGMENT_TAGS = new Set(["document", "html", "head", "body"]);
const OMITTED_FRAGMENT_TAGS = new Set(["title", "meta"]);
const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "source",
  "track",
  "wbr",
]);

export function exportConfluenceFragment(
  doc: ProjectDoc,
  fragmentId: string,
): ExportArtifact {
  const safeId = fragmentId.replace(/[^a-zA-Z0-9_-]/g, "-");

  return {
    filename: "confluence-fragment.html",
    mediaType: "text/html",
    content: `<div class="cf-material-${safeId}">\n${renderNode(
      doc.renderTree,
      `cf-material-${safeId}`,
    )}\n</div>`,
  };
}

function renderNode(node: RenderNode, scopeClass: string): string {
  if (node.tag === "#text") {
    return escapeHtml(node.text ?? "");
  }

  if (OMITTED_FRAGMENT_TAGS.has(node.tag)) {
    return "";
  }

  if (UNWRAPPED_FRAGMENT_TAGS.has(node.tag)) {
    return node.children.map((child) => renderNode(child, scopeClass)).join("");
  }

  if (node.tag === "style") {
    return `<style>${escapeHtml(scopeCss(textContent(node), scopeClass))}</style>`;
  }

  const attrs = attrsToString(node);

  if (VOID_TAGS.has(node.tag)) {
    return `<${node.tag}${attrs}>`;
  }

  return `<${node.tag}${attrs}>${node.children
    .map((child) => renderNode(child, scopeClass))
    .join("")}</${node.tag}>`;
}

function textContent(node: RenderNode): string {
  if (node.tag === "#text") {
    return node.text ?? "";
  }

  return node.children.map((child) => textContent(child)).join("");
}

function scopeCss(css: string, scopeClass: string): string {
  return scopeCssBlock(css, scopeClass, false);
}

function scopeCssBlock(
  css: string,
  scopeClass: string,
  insideKeyframes: boolean,
): string {
  let output = "";
  let cursor = 0;

  while (cursor < css.length) {
    const semicolonAtRule = readLeadingSemicolonAtRule(css, cursor);

    if (semicolonAtRule) {
      output += semicolonAtRule.text;
      cursor = semicolonAtRule.endIndex;
      continue;
    }

    const openIndex = css.indexOf("{", cursor);

    if (openIndex === -1) {
      output += css.slice(cursor);
      break;
    }

    const prelude = css.slice(cursor, openIndex);
    const closeIndex = findMatchingBrace(css, openIndex);

    if (closeIndex === -1) {
      output += css.slice(cursor);
      break;
    }

    const body = css.slice(openIndex + 1, closeIndex);
    const trimmedPrelude = prelude.trim();

    if (trimmedPrelude.startsWith("@media") || trimmedPrelude.startsWith("@supports")) {
      output += `${prelude}{${scopeCssBlock(body, scopeClass, false)}}`;
    } else if (trimmedPrelude.startsWith("@keyframes")) {
      output += `${prelude}{${scopeCssBlock(body, scopeClass, true)}}`;
    } else if (trimmedPrelude.startsWith("@")) {
      output += `${prelude}{${body}}`;
    } else if (insideKeyframes) {
      output += `${prelude}{${body}}`;
    } else {
      output += `${scopeSelectorList(prelude, scopeClass)}{${body}}`;
    }

    cursor = closeIndex + 1;
  }

  return output;
}

function readLeadingSemicolonAtRule(
  css: string,
  cursor: number,
): { text: string; endIndex: number } | undefined {
  const prefix = css.slice(cursor);
  const atRuleMatch = prefix.match(/^(\s*@[\w-][^{};]*;)/);

  if (!atRuleMatch?.[1]) {
    return undefined;
  }

  return {
    text: atRuleMatch[1],
    endIndex: cursor + atRuleMatch[1].length,
  };
}

function findMatchingBrace(css: string, openIndex: number): number {
  let depth = 0;

  for (let index = openIndex; index < css.length; index += 1) {
    const character = css[index];

    if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;

      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function scopeSelectorList(selectorList: string, scopeClass: string): string {
  const leadingWhitespace = selectorList.match(/^\s*/)?.[0] ?? "";
  const trailingWhitespace = selectorList.match(/\s*$/)?.[0] ?? "";
  const scopedSelectors = selectorList
    .trim()
    .split(",")
    .map((selector) => scopeSelector(selector.trim(), scopeClass))
    .join(", ");

  return `${leadingWhitespace}${scopedSelectors}${trailingWhitespace}`;
}

function scopeSelector(selector: string, scopeClass: string): string {
  if (!selector) {
    return selector;
  }

  if (selector === ":root" || selector === "html" || selector === "body") {
    return `.${scopeClass}`;
  }

  if (selector.startsWith(`.${scopeClass}`)) {
    return selector;
  }

  return `.${scopeClass} ${selector}`;
}

function attrsToString(node: RenderNode): string {
  const attrs = { ...node.attrs };

  delete attrs.class;
  delete attrs.style;

  if (node.classList.length > 0) {
    attrs.class = node.classList.join(" ");
  }

  const style = Object.entries(node.inlineStyle)
    .map(([name, value]) => `${name}: ${value}`)
    .join("; ");

  if (style) {
    attrs.style = style;
  }

  return Object.entries(attrs)
    .map(([name, value]) => ` ${name}="${escapeAttribute(value)}"`)
    .join("");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll('"', "&quot;");
}
