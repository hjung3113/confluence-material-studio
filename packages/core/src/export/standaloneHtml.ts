import type { ExportArtifact, ProjectDoc, RenderNode } from "../document/types.js";

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
  "meta",
  "source",
  "track",
  "wbr",
]);

export function exportStandaloneHtml(doc: ProjectDoc): ExportArtifact {
  return {
    filename: "standalone.html",
    mediaType: "text/html",
    content: [
      "<!doctype html>",
      '<html lang="en">',
      "<head>",
      '<meta charset="utf-8">',
      `<title>${escapeHtml(doc.title)}</title>`,
      "</head>",
      "<body>",
      renderNode(doc.renderTree),
      "</body>",
      "</html>",
    ].join("\n"),
  };
}

function renderNode(node: RenderNode): string {
  if (node.tag === "#text") {
    return escapeHtml(node.text ?? "");
  }

  if (node.tag === "document") {
    return node.children.map((child) => renderNode(child)).join("");
  }

  const attrs = attrsToString(node);

  if (VOID_TAGS.has(node.tag)) {
    return `<${node.tag}${attrs}>`;
  }

  return `<${node.tag}${attrs}>${node.children
    .map((child) => renderNode(child))
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
