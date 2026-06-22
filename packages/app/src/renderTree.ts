import type { RenderNode } from "@htmleditor/core";

const VOID_TAGS = new Set(["br", "hr", "img", "input", "meta", "link"]);
const UNWRAPPED_TAGS = new Set(["document", "html", "head", "body"]);
const OMITTED_TAGS = new Set(["title", "meta"]);

export function renderTreeToHtml(node: RenderNode): string {
  if (node.tag === "#text") {
    return escapeHtml(node.text ?? "");
  }

  if (OMITTED_TAGS.has(node.tag)) {
    return "";
  }

  if (UNWRAPPED_TAGS.has(node.tag)) {
    return node.children.map((child) => renderTreeToHtml(child)).join("");
  }

  const attrs = attrsToString(node);

  if (VOID_TAGS.has(node.tag)) {
    return `<${node.tag}${attrs}>`;
  }

  return `<${node.tag}${attrs}>${node.children
    .map((child) => renderTreeToHtml(child))
    .join("")}</${node.tag}>`;
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
