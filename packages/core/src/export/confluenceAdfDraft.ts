import { createSchema, type DocNode } from "@atlaskit/adf-schema";
import type {
  ProjectDoc,
  RenderNode,
  SemanticOverlayEntry,
} from "../document/types.js";

export type ConfluenceAdfDraft = {
  schemaSource: "@atlaskit/adf-schema";
  validation: {
    status: "valid";
    validator: "@atlaskit/adf-schema";
  };
  document: DocNode;
  mappedNodeIds: string[];
  unmappedNodeIds: string[];
};

type AdfBlockNode =
  | {
      type: "heading";
      attrs: { level: number };
      content: AdfTextNode[];
    }
  | {
      type: "paragraph";
      content?: Array<AdfTextNode | AdfStatusNode>;
    }
  | {
      type: "panel";
      attrs: { panelType: "info" | "note" };
      content: Array<{ type: "paragraph"; content: AdfTextNode[] }>;
    }
  | {
      type: "codeBlock";
      attrs: { language: "text" };
      content: AdfTextNode[];
    }
  | {
      type: "rule";
    };

type AdfTextNode = {
  type: "text";
  text: string;
};

type AdfStatusNode = {
  type: "status";
  attrs: {
    text: string;
    color: "neutral" | "green";
  };
};

const ADF_SCHEMA = createSchema({
  nodes: [
    "doc",
    "paragraph",
    "text",
    "heading",
    "panel",
    "status",
    "codeBlock",
    "rule",
  ],
  marks: ["strong", "em", "code"],
});

export function buildConfluenceAdfDraft(doc: ProjectDoc): ConfluenceAdfDraft {
  const overlayByNodeId = new Map(
    doc.semanticOverlay.map((entry) => [entry.nodeId, entry]),
  );
  const mappedNodeIds = new Set<string>();
  const content = renderChildrenToAdfBlocks(
    doc.renderTree.children,
    overlayByNodeId,
    mappedNodeIds,
  );
  const document: DocNode = {
    type: "doc",
    version: 1,
    content: content.length > 0 ? content : [paragraphNode(doc.title)],
  } as DocNode;

  ADF_SCHEMA.nodeFromJSON(document);

  return {
    schemaSource: "@atlaskit/adf-schema",
    validation: {
      status: "valid",
      validator: "@atlaskit/adf-schema",
    },
    document,
    mappedNodeIds: [...mappedNodeIds],
    unmappedNodeIds: doc.semanticOverlay
      .filter((entry) => shouldReportAsUnmapped(entry, mappedNodeIds))
      .map((entry) => entry.nodeId),
  };
}

function renderChildrenToAdfBlocks(
  nodes: RenderNode[],
  overlayByNodeId: Map<string, SemanticOverlayEntry>,
  mappedNodeIds: Set<string>,
): AdfBlockNode[] {
  return nodes.flatMap((node) =>
    renderNodeToAdfBlocks(node, overlayByNodeId, mappedNodeIds),
  );
}

function renderNodeToAdfBlocks(
  node: RenderNode,
  overlayByNodeId: Map<string, SemanticOverlayEntry>,
  mappedNodeIds: Set<string>,
): AdfBlockNode[] {
  const role = overlayByNodeId.get(node.id)?.role;

  if (role === "title") {
    mappedNodeIds.add(node.id);
    return [headingNode(node)];
  }

  if (role === "paragraph") {
    mappedNodeIds.add(node.id);
    return [paragraphNode(compactText(node))];
  }

  if (role === "status") {
    mappedNodeIds.add(node.id);
    return [statusParagraphNode(compactText(node))];
  }

  if (role === "callout" || role === "panel") {
    mappedNodeIds.add(node.id);
    return [panelNode(compactText(node), role === "callout" ? "note" : "info")];
  }

  if (role === "code") {
    mappedNodeIds.add(node.id);
    return [codeBlockNode(compactText(node))];
  }

  if (node.tag === "hr") {
    mappedNodeIds.add(node.id);
    return [{ type: "rule" }];
  }

  if (isContainerNode(node)) {
    return renderChildrenToAdfBlocks(node.children, overlayByNodeId, mappedNodeIds);
  }

  return [];
}

function headingNode(node: RenderNode): AdfBlockNode {
  const level = Number(node.tag.match(/^h([1-6])$/)?.[1] ?? 1);

  return {
    type: "heading",
    attrs: { level },
    content: textContent(compactText(node)),
  };
}

function paragraphNode(text: string): AdfBlockNode {
  const content = textContent(text);

  return content.length > 0
    ? { type: "paragraph", content }
    : { type: "paragraph" };
}

function statusParagraphNode(text: string): AdfBlockNode {
  return {
    type: "paragraph",
    content: [
      {
        type: "status",
        attrs: {
          text: text || "Status",
          color: statusColor(text),
        },
      },
    ],
  };
}

function panelNode(
  text: string,
  panelType: "info" | "note",
): AdfBlockNode {
  return {
    type: "panel",
    attrs: { panelType },
    content: [
      {
        type: "paragraph",
        content: textContent(text),
      },
    ],
  };
}

function codeBlockNode(text: string): AdfBlockNode {
  return {
    type: "codeBlock",
    attrs: { language: "text" },
    content: textContent(text),
  };
}

function textContent(text: string): AdfTextNode[] {
  const normalized = text.replace(/\s+/g, " ").trim();

  return normalized ? [{ type: "text", text: normalized }] : [];
}

function statusColor(text: string): "neutral" | "green" {
  return /done|green|ok|on track|완료|정상/i.test(text) ? "green" : "neutral";
}

function isContainerNode(node: RenderNode): boolean {
  return ["document", "main", "body", "section", "article", "div"].includes(
    node.tag,
  );
}

function compactText(node: RenderNode): string {
  if (node.tag === "#text") {
    return node.text ?? "";
  }

  return node.children.map((child) => compactText(child)).join(" ");
}

function shouldReportAsUnmapped(
  entry: SemanticOverlayEntry,
  mappedNodeIds: Set<string>,
): boolean {
  return (
    !mappedNodeIds.has(entry.nodeId) &&
    (entry.confluenceMapping.recommendedTarget === "fragment" ||
      entry.confluenceMapping.recommendedTarget === "future-iframe")
  );
}
