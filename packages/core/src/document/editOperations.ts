import type {
  ConfluenceMapping,
  ProjectDoc,
  RenderNode,
  SemanticOverlayEntry,
  SemanticRole,
  ThemeTokens,
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

export type MaterialBlockType = "title" | "paragraph" | "callout" | "divider";

export type InsertMaterialBlockAfterNodeInput = {
  anchorNodeId: string;
  blockType: MaterialBlockType;
  createdAt: string;
};

export type NodeEditabilityStatus =
  | "editable"
  | "partially-editable"
  | "preserved-only";

export type NodeEditability = {
  status: NodeEditabilityStatus;
  reason: string;
};

export type NodeStructureMutability = {
  canMutate: boolean;
  reason: string;
};

export type EditableTextTarget = {
  nodeId: string;
  role: SemanticRole;
  label: string;
  textPreview: string;
};

export type DuplicateNodeInput = {
  nodeId: string;
  createdAt: string;
};

export type DeleteNodeInput = {
  nodeId: string;
  createdAt: string;
};

export type MoveNodeInput = {
  nodeId: string;
  direction: "up" | "down";
  createdAt: string;
};

export type ThemeTokenPatch = Partial<Omit<ThemeTokens, "colors">> & {
  colors?: Partial<ThemeTokens["colors"]>;
};

export type UpdateThemeTokensInput = {
  themeTokens: ThemeTokenPatch;
  createdAt: string;
};

export function getNodeEditability(
  doc: ProjectDoc,
  nodeId: string,
): NodeEditability {
  const node = findNode(doc.renderTree, nodeId);

  if (!node) {
    return {
      status: "preserved-only",
      reason: "Selected node was not found.",
    };
  }

  if (isLockedNode(node)) {
    return {
      status: "preserved-only",
      reason: "Selected node is locked or raw preserved structure.",
    };
  }

  if (isEditableTextTarget(doc, node)) {
    return {
      status: "editable",
      reason: "Selected node has editable text.",
    };
  }

  if (listEditableTextTargets(doc, nodeId).length > 0) {
    return {
      status: "partially-editable",
      reason: "Selected node contains editable text targets.",
    };
  }

  if (isRawNode(doc, node)) {
    return {
      status: "preserved-only",
      reason: "Selected node is locked or raw preserved structure.",
    };
  }

  return {
    status: "preserved-only",
    reason: "Selected node has no editable text targets.",
  };
}

export function getNodeStructureMutability(
  doc: ProjectDoc,
  nodeId: string,
): NodeStructureMutability {
  if (doc.renderTree.id === nodeId) {
    return {
      canMutate: false,
      reason: "Root document cannot be duplicated, deleted, or moved.",
    };
  }

  const node = findNode(doc.renderTree, nodeId);

  if (!node) {
    return {
      canMutate: false,
      reason: "Selected node was not found.",
    };
  }

  if (!canStructurallyMutateNode(doc, node)) {
    return {
      canMutate: false,
      reason: "Preserved imported structure cannot be duplicated, deleted, or moved in MVP.",
    };
  }

  return {
    canMutate: true,
    reason: "Selected node can be duplicated, deleted, or reordered.",
  };
}

export function listEditableTextTargets(
  doc: ProjectDoc,
  nodeId: string,
): EditableTextTarget[] {
  const node = findNode(doc.renderTree, nodeId);

  if (!node || isLockedNode(node)) {
    return [];
  }

  return flattenUnlockedNodes(node)
    .filter((candidate) => isEditableTextTarget(doc, candidate))
    .map((candidate) => {
      const preview = textPreview(candidate);
      return {
        nodeId: candidate.id,
        role: overlayForNode(doc, candidate.id)?.role ?? "rawHtml",
        label: preview,
        textPreview: preview,
      };
    });
}

export function duplicateNode(
  doc: ProjectDoc,
  input: DuplicateNodeInput,
): ProjectDoc {
  if (doc.renderTree.id === input.nodeId) {
    return doc;
  }

  const sourceNode = findNode(doc.renderTree, input.nodeId);
  if (!sourceNode || !canStructurallyMutateNode(doc, sourceNode)) {
    return doc;
  }

  const sequence = { value: maxNodeNumber(doc.renderTree) };
  const nodeIdMap = new Map<string, string>();
  const duplicatedNode = duplicateRenderNode(sourceNode, sequence, nodeIdMap);
  const duplicatedIds = new Set(nodeIdMap.values());
  const overlayEntries = duplicateOverlayEntries(doc, nodeIdMap);

  return {
    ...doc,
    renderTree: insertAfterNode(doc.renderTree, input.nodeId, duplicatedNode),
    semanticOverlay: [
      ...doc.semanticOverlay,
      ...overlayEntries.filter((entry) => duplicatedIds.has(entry.nodeId)),
    ],
    transformationTrace: [
      ...doc.transformationTrace,
      traceEntry(doc, {
        message: "Duplicated selected node.",
        nodeId: duplicatedNode.id,
        createdAt: input.createdAt,
      }),
    ],
  };
}

export function deleteNode(doc: ProjectDoc, input: DeleteNodeInput): ProjectDoc {
  if (
    doc.renderTree.id === input.nodeId ||
    !hasNode(doc.renderTree, input.nodeId)
  ) {
    return doc;
  }

  const deletedNode = findNode(doc.renderTree, input.nodeId);
  if (!canStructurallyMutateNode(doc, deletedNode)) {
    return doc;
  }

  const deletedIds = new Set(flattenNodes(deletedNode).map((node) => node.id));

  return {
    ...doc,
    renderTree: removeNode(doc.renderTree, input.nodeId),
    semanticOverlay: doc.semanticOverlay.filter(
      (entry) => !deletedIds.has(entry.nodeId),
    ),
    transformationTrace: [
      ...doc.transformationTrace,
      traceEntry(doc, {
        message: "Deleted selected node.",
        nodeId: input.nodeId,
        createdAt: input.createdAt,
      }),
    ],
  };
}

export function moveNode(doc: ProjectDoc, input: MoveNodeInput): ProjectDoc {
  if (
    doc.renderTree.id === input.nodeId ||
    !hasNode(doc.renderTree, input.nodeId)
  ) {
    return doc;
  }

  const movedNode = findNode(doc.renderTree, input.nodeId);
  if (!canStructurallyMutateNode(doc, movedNode)) {
    return doc;
  }

  const renderTree = moveNodeWithinSiblings(
    doc.renderTree,
    input.nodeId,
    input.direction,
  );

  if (renderTree === doc.renderTree) {
    return doc;
  }

  return {
    ...doc,
    renderTree,
    transformationTrace: [
      ...doc.transformationTrace,
      traceEntry(doc, {
        message: `Moved selected node ${input.direction}.`,
        nodeId: input.nodeId,
        createdAt: input.createdAt,
      }),
    ],
  };
}

export function updateThemeTokens(
  doc: ProjectDoc,
  input: UpdateThemeTokensInput,
): ProjectDoc {
  return {
    ...doc,
    themeTokens: {
      ...doc.themeTokens,
      ...input.themeTokens,
      colors: {
        ...doc.themeTokens.colors,
        ...input.themeTokens.colors,
      },
    },
    transformationTrace: [
      ...doc.transformationTrace,
      traceEntry(doc, {
        message: "Updated theme tokens.",
        nodeId: doc.renderTree.id,
        createdAt: input.createdAt,
      }),
    ],
  };
}

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

export function insertMaterialBlockAfterNode(
  doc: ProjectDoc,
  input: InsertMaterialBlockAfterNodeInput,
): ProjectDoc {
  if (!hasNode(doc.renderTree, input.anchorNodeId)) {
    return doc;
  }

  if (input.blockType === "callout") {
    return insertCalloutAfterNode(doc, {
      anchorNodeId: input.anchorNodeId,
      title: "Review note",
      body: "Confirm the Confluence fragment before sharing.",
      createdAt: input.createdAt,
    });
  }

  const sequence = { value: maxNodeNumber(doc.renderTree) };
  const block = createMaterialBlockNode(sequence, input.blockType);

  return {
    ...doc,
    renderTree: insertAfterNode(doc.renderTree, input.anchorNodeId, block),
    semanticOverlay: [...doc.semanticOverlay, materialBlockOverlay(block.id, input.blockType)],
    transformationTrace: [
      ...doc.transformationTrace,
      traceEntry(doc, {
        message: `Inserted ${input.blockType} block.`,
        nodeId: block.id,
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

function findNode(
  node: RenderNode | undefined,
  nodeId: string,
): RenderNode | undefined {
  if (!node) {
    return undefined;
  }

  if (node.id === nodeId) {
    return node;
  }

  for (const child of node.children) {
    const found = findNode(child, nodeId);
    if (found) {
      return found;
    }
  }

  return undefined;
}

function hasNode(node: RenderNode, nodeId: string): boolean {
  if (node.id === nodeId) {
    return true;
  }

  return node.children.some((child) => hasNode(child, nodeId));
}

function flattenNodes(node: RenderNode | undefined): RenderNode[] {
  if (!node) {
    return [];
  }

  return [node, ...node.children.flatMap((child) => flattenNodes(child))];
}

function flattenUnlockedNodes(node: RenderNode | undefined): RenderNode[] {
  if (!node || isLockedNode(node)) {
    return [];
  }

  return [
    node,
    ...node.children.flatMap((child) => flattenUnlockedNodes(child)),
  ];
}

function overlayForNode(
  doc: ProjectDoc,
  nodeId: string,
): SemanticOverlayEntry | undefined {
  return doc.semanticOverlay.find((entry) => entry.nodeId === nodeId);
}

function isLockedNode(node: RenderNode): boolean {
  return node.locked === true;
}

function isRawNode(doc: ProjectDoc, node: RenderNode): boolean {
  const overlay = overlayForNode(doc, node.id);
  return overlay?.role === "rawHtml";
}

function isPreservedOnlyNode(doc: ProjectDoc, node: RenderNode): boolean {
  return isLockedNode(node) || isRawNode(doc, node);
}

function canStructurallyMutateNode(
  doc: ProjectDoc,
  node: RenderNode | undefined,
): boolean {
  return node !== undefined && !isPreservedOnlyNode(doc, node);
}

function isEditableTextTarget(doc: ProjectDoc, node: RenderNode): boolean {
  const overlay = overlayForNode(doc, node.id);
  return (
    overlay?.editableFields.includes("text") === true &&
    !isPreservedOnlyNode(doc, node) &&
    directText(node).length > 0
  );
}

function directText(node: RenderNode): string {
  const ownText = node.text ?? "";
  const childText = node.children
    .filter((child) => child.tag === "#text")
    .map((child) => child.text ?? "")
    .join(" ");

  return normalizePreview([ownText, childText].filter(Boolean).join(" "));
}

function textPreview(node: RenderNode): string {
  return directText(node).slice(0, 80);
}

function normalizePreview(value: string): string {
  return value.replace(/\s+/g, " ").trim();
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

function removeNode(node: RenderNode, nodeId: string): RenderNode {
  return {
    ...node,
    children: node.children
      .filter((child) => child.id !== nodeId)
      .map((child) => removeNode(child, nodeId)),
  };
}

function moveNodeWithinSiblings(
  node: RenderNode,
  nodeId: string,
  direction: "up" | "down",
): RenderNode {
  const childIndex = node.children.findIndex((child) => child.id === nodeId);

  if (childIndex !== -1) {
    const targetIndex = direction === "up" ? childIndex - 1 : childIndex + 1;
    if (targetIndex < 0 || targetIndex >= node.children.length) {
      return node;
    }

    const children = [...node.children];
    const [moved] = children.splice(childIndex, 1);
    if (!moved) {
      return node;
    }
    children.splice(targetIndex, 0, moved);
    return { ...node, children };
  }

  let changed = false;
  const children = node.children.map((child) => {
    const movedChild = moveNodeWithinSiblings(child, nodeId, direction);
    if (movedChild !== child) {
      changed = true;
    }
    return movedChild;
  });

  return changed ? { ...node, children } : node;
}

function duplicateRenderNode(
  node: RenderNode,
  sequence: { value: number },
  nodeIdMap: Map<string, string>,
): RenderNode {
  const id = nextNodeId(sequence);
  nodeIdMap.set(node.id, id);

  const duplicatedNode: RenderNode = {
    ...node,
    id,
    attrs: { ...node.attrs },
    classList: [...node.classList],
    inlineStyle: { ...node.inlineStyle },
    children: node.children.map((child) =>
      duplicateRenderNode(child, sequence, nodeIdMap),
    ),
  };

  if (node.sourceMeta) {
    duplicatedNode.sourceMeta = { ...node.sourceMeta };
  }

  return duplicatedNode;
}

function duplicateOverlayEntries(
  doc: ProjectDoc,
  nodeIdMap: Map<string, string>,
): SemanticOverlayEntry[] {
  return doc.semanticOverlay.flatMap((entry) => {
    const nodeId = nodeIdMap.get(entry.nodeId);
    if (!nodeId) {
      return [];
    }

    return [
      {
        ...entry,
        nodeId,
        editableFields: [...entry.editableFields],
        warnings: [...entry.warnings],
      },
    ];
  });
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

function createMaterialBlockNode(
  sequence: { value: number },
  blockType: Exclude<MaterialBlockType, "callout">,
): RenderNode {
  if (blockType === "title") {
    return {
      id: nextNodeId(sequence),
      tag: "h2",
      attrs: {},
      classList: [],
      inlineStyle: {},
      children: [textNode(sequence, "New title")],
    };
  }

  if (blockType === "paragraph") {
    return {
      id: nextNodeId(sequence),
      tag: "p",
      attrs: {},
      classList: [],
      inlineStyle: {},
      children: [textNode(sequence, "New paragraph")],
    };
  }

  return {
    id: nextNodeId(sequence),
    tag: "hr",
    attrs: {},
    classList: [],
    inlineStyle: {},
    children: [],
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

function materialBlockOverlay(
  nodeId: string,
  blockType: Exclude<MaterialBlockType, "callout">,
): SemanticOverlayEntry {
  if (blockType === "title") {
    return {
      nodeId,
      role: "title",
      editableFields: ["text", "style"],
      confluenceMapping: nativeMapping(),
      warnings: [],
    };
  }

  if (blockType === "paragraph") {
    return {
      nodeId,
      role: "paragraph",
      editableFields: ["text", "style"],
      confluenceMapping: nativeMapping(),
      warnings: [],
    };
  }

  return {
    nodeId,
    role: "rawHtml",
    editableFields: [],
    confluenceMapping: nativeMapping(),
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

function nativeMapping(): ConfluenceMapping {
  return {
    recommendedTarget: "native",
    expectedVisualLoss: "minor",
    rationale: "Role has an MVP native mapping candidate.",
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
