import type { ExportArtifact, ProjectDoc, RenderNode } from "../document/types.js";

const OMITTED_FRAGMENT_TAGS = new Set(["html", "head", "body", "title", "meta"]);
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
    )}\n</div>`,
  };
}

function renderNode(node: RenderNode): string {
  if (node.tag === "#text") {
    return escapeHtml(node.text ?? "");
  }

  if (node.tag === "document" || OMITTED_FRAGMENT_TAGS.has(node.tag)) {
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
