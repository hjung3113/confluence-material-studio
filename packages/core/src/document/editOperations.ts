import type {
  ConfluenceMapping,
  ProjectDoc,
  RenderNode,
  SemanticOverlayEntry,
  TransformationTraceEntry,
} from "./types.js";

export type EditNodeTextInput = {
  nodeId: string;
  text: string;
  createdAt: string;
};

export type InsertCalloutAfterNodeInput = {
  anchorNodeId: string;
  title: string;
  body: string;
  createdAt: string;
};

export function editNodeText(
  doc: ProjectDoc,
  input: EditNodeTextInput,
): ProjectDoc {
  if (!hasNode(doc.renderTree, input.nodeId)) {
    return doc;
  }

  return {
    ...doc,
    renderTree: updateNode(doc.renderTree, input.nodeId, (node) =>
      replaceText(node, input.text),
    ),
    transformationTrace: [
      ...doc.transformationTrace,
      traceEntry(doc, {
        message: "Edited selected text.",
        nodeId: input.nodeId,
        createdAt: input.createdAt,
      }),
    ],
  };
}

export function insertCalloutAfterNode(
  doc: ProjectDoc,
  input: InsertCalloutAfterNodeInput,
): ProjectDoc {
  if (!hasNode(doc.renderTree, input.anchorNodeId)) {
    return doc;
  }

  const sequence = { value: maxNodeNumber(doc.renderTree) };
  const callout = createCalloutNode(sequence, input.title, input.body);

  return {
    ...doc,
    renderTree: insertAfterNode(doc.renderTree, input.anchorNodeId, callout),
    semanticOverlay: [...doc.semanticOverlay, calloutOverlay(callout.id)],
    transformationTrace: [
      ...doc.transformationTrace,
      traceEntry(doc, {
        message: "Inserted callout block.",
        nodeId: callout.id,
        createdAt: input.createdAt,
      }),
    ],
  };
}

function updateNode(
  node: RenderNode,
  nodeId: string,
  updater: (node: RenderNode) => RenderNode,
): RenderNode {
  if (node.id === nodeId) {
    return updater(node);
  }

  return {
    ...node,
    children: node.children.map((child) => updateNode(child, nodeId, updater)),
  };
}

function hasNode(node: RenderNode, nodeId: string): boolean {
  if (node.id === nodeId) {
    return true;
  }

  return node.children.some((child) => hasNode(child, nodeId));
}

function replaceText(node: RenderNode, text: string): RenderNode {
  if (node.tag === "#text") {
    return { ...node, text };
  }

  const textChildIndex = node.children.findIndex((child) => child.tag === "#text");

  if (textChildIndex === -1) {
    return node;
  }

  return {
    ...node,
    children: node.children.map((child, index) =>
      index === textChildIndex ? { ...child, text } : child,
    ),
  };
}

function insertAfterNode(
  node: RenderNode,
  anchorNodeId: string,
  newNode: RenderNode,
): RenderNode {
  const childIndex = node.children.findIndex((child) => child.id === anchorNodeId);

  if (childIndex !== -1) {
    return {
      ...node,
      children: [
        ...node.children.slice(0, childIndex + 1),
        newNode,
        ...node.children.slice(childIndex + 1),
      ],
    };
  }

  return {
    ...node,
    children: node.children.map((child) =>
      insertAfterNode(child, anchorNodeId, newNode),
    ),
  };
}

function createCalloutNode(
  sequence: { value: number },
  title: string,
  body: string,
): RenderNode {
  return {
    id: nextNodeId(sequence),
    tag: "aside",
    attrs: { "data-confluence-macro": "note" },
    classList: ["callout"],
    inlineStyle: {},
    children: [
      {
        id: nextNodeId(sequence),
        tag: "h2",
        attrs: {},
        classList: [],
        inlineStyle: {},
        children: [textNode(sequence, title)],
      },
      {
        id: nextNodeId(sequence),
        tag: "p",
        attrs: {},
        classList: [],
        inlineStyle: {},
        children: [textNode(sequence, body)],
      },
    ],
  };
}

function textNode(sequence: { value: number }, text: string): RenderNode {
  return {
    id: nextNodeId(sequence),
    tag: "#text",
    attrs: {},
    classList: [],
    inlineStyle: {},
    children: [],
    text,
  };
}

function calloutOverlay(nodeId: string): SemanticOverlayEntry {
  return {
    nodeId,
    role: "callout",
    editableFields: ["text"],
    confluenceMapping: macroMapping(),
    warnings: [],
  };
}

function macroMapping(): ConfluenceMapping {
  return {
    recommendedTarget: "macro",
    expectedVisualLoss: "minor",
    rationale: "Role has an MVP Confluence macro mapping candidate.",
  };
}

function traceEntry(
  doc: ProjectDoc,
  input: {
    message: string;
    nodeId: string;
    createdAt: string;
  },
): TransformationTraceEntry {
  return {
    id: `trace-edit-${doc.transformationTrace.length + 1}`,
    stage: "edit",
    message: input.message,
    nodeId: input.nodeId,
    createdAt: input.createdAt,
  };
}

function maxNodeNumber(node: RenderNode): number {
  const own = Number(node.id.match(/^node-(\d+)$/)?.[1] ?? 0);
  return Math.max(own, ...node.children.map((child) => maxNodeNumber(child)));
}

function nextNodeId(sequence: { value: number }): string {
  sequence.value += 1;
  return `node-${sequence.value}`;
}
