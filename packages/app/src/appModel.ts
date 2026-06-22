import {
  exportProject,
  importHtml,
  importMarkdown,
  type ExportResult,
  type ProjectDoc,
  type RenderNode,
  type SemanticRole,
} from "@htmleditor/core";

export type ImportFixtureInput = {
  kind: "html" | "markdown";
  title: string;
  content: string;
};

export type PreviewWidth = "desktop" | "tablet" | "mobile";

export type AppState = {
  doc: ProjectDoc | undefined;
  selectedNodeId: string | undefined;
  previewWidth: PreviewWidth;
  now: string;
  generatedAt: string;
};

export function createAppState(options: {
  now: string;
  generatedAt: string;
}): AppState {
  return {
    doc: undefined,
    selectedNodeId: undefined,
    previewWidth: "desktop",
    now: options.now,
    generatedAt: options.generatedAt,
  };
}

export function importFixture(
  state: AppState,
  input: ImportFixtureInput,
): AppState {
  const doc =
    input.kind === "markdown"
      ? importMarkdown({
          markdown: input.content,
          title: input.title,
          now: state.now,
        })
      : importHtml({
          html: input.content,
          title: input.title,
          now: state.now,
        });

  return {
    ...state,
    doc,
    selectedNodeId: firstEditableNode(doc)?.id,
  };
}

export function selectNodeByRole(
  state: AppState,
  role: SemanticRole,
): AppState {
  const entry = state.doc?.semanticOverlay.find((item) => item.role === role);

  return {
    ...state,
    selectedNodeId: entry?.nodeId ?? state.selectedNodeId,
  };
}

export function editSelectedText(state: AppState, text: string): AppState {
  if (!state.doc || !state.selectedNodeId) {
    return state;
  }

  return {
    ...state,
    doc: {
      ...state.doc,
      renderTree: updateNode(state.doc.renderTree, state.selectedNodeId, (node) =>
        replaceText(node, text),
      ),
    },
  };
}

export function getSelectedText(state: AppState): string {
  if (!state.doc || !state.selectedNodeId) {
    return "";
  }

  const selectedNode = findNode(state.doc.renderTree, state.selectedNodeId);

  if (!selectedNode) {
    return "";
  }

  return textContent(selectedNode);
}

export function getExportArtifact(
  exportResult: ExportResult,
  filename: string,
): string {
  return (
    exportResult.artifacts.find((artifact) => artifact.filename === filename)
      ?.content ?? ""
  );
}

export function updateThemeColor(
  state: AppState,
  color: keyof ProjectDoc["themeTokens"]["colors"],
  value: string,
): AppState {
  if (!state.doc) {
    return state;
  }

  return {
    ...state,
    doc: {
      ...state.doc,
      themeTokens: {
        ...state.doc.themeTokens,
        colors: {
          ...state.doc.themeTokens.colors,
          [color]: value,
        },
      },
    },
  };
}

export function setPreviewWidth(
  state: AppState,
  previewWidth: PreviewWidth,
): AppState {
  return { ...state, previewWidth };
}

export function reorderSelectedSection(
  state: AppState,
  direction: "up" | "down",
): AppState {
  if (!state.doc || !state.selectedNodeId) {
    return state;
  }

  return {
    ...state,
    doc: {
      ...state.doc,
      renderTree: reorderSection(
        state.doc.renderTree,
        state.selectedNodeId,
        direction,
      ),
    },
  };
}

export function duplicateSelectedSection(state: AppState): AppState {
  if (!state.doc || !state.selectedNodeId) {
    return state;
  }

  const selectedSectionId = findContainingSectionId(
    state.doc.renderTree,
    state.selectedNodeId,
  );

  if (!selectedSectionId) {
    return state;
  }

  return {
    ...state,
    doc: {
      ...state.doc,
      renderTree: duplicateSection(state.doc.renderTree, selectedSectionId),
      semanticOverlay: state.doc.semanticOverlay,
    },
  };
}

export function deleteSelectedSection(state: AppState): AppState {
  if (!state.doc || !state.selectedNodeId) {
    return state;
  }

  const selectedSectionId = findContainingSectionId(
    state.doc.renderTree,
    state.selectedNodeId,
  );

  if (!selectedSectionId) {
    return state;
  }

  return {
    ...state,
    doc: {
      ...state.doc,
      renderTree: deleteSection(state.doc.renderTree, selectedSectionId),
    },
  };
}

export function exportCurrentProject(state: AppState): ExportResult {
  if (!state.doc) {
    throw new Error("Cannot export before importing a document.");
  }

  return exportProject(state.doc, {
    generatedAt: state.generatedAt,
    fragmentId: "app-preview",
  });
}

export function listSections(doc: ProjectDoc): RenderNode[] {
  const sections: RenderNode[] = [];
  visitNode(doc.renderTree, (node) => {
    if (node.tag === "section") {
      sections.push(node);
    }
  });
  return sections;
}

function firstEditableNode(doc: ProjectDoc): RenderNode | undefined {
  const preferredTitle = doc.semanticOverlay.find(
    (entry) => entry.role === "title" && entry.editableFields.includes("text"),
  );

  if (preferredTitle) {
    return findNode(doc.renderTree, preferredTitle.nodeId);
  }

  const editableEntry = doc.semanticOverlay.find((entry) =>
    entry.editableFields.includes("text"),
  );

  return editableEntry
    ? findNode(doc.renderTree, editableEntry.nodeId)
    : undefined;
}

function replaceText(node: RenderNode, text: string): RenderNode {
  const textChild = node.children.find((child) => child.tag === "#text");

  if (node.tag === "#text") {
    return { ...node, text };
  }

  if (textChild) {
    return {
      ...node,
      children: node.children.map((child) =>
        child.id === textChild.id ? { ...child, text } : child,
      ),
    };
  }

  return {
    ...node,
    children: [
      {
        id: `${node.id}-text`,
        tag: "#text",
        attrs: {},
        classList: [],
        inlineStyle: {},
        children: [],
        text,
      },
    ],
  };
}

function textContent(node: RenderNode): string {
  if (node.tag === "#text") {
    return node.text ?? "";
  }

  return node.children.map((child) => textContent(child)).join("");
}

function updateNode(
  node: RenderNode,
  nodeId: string,
  update: (node: RenderNode) => RenderNode,
): RenderNode {
  if (node.id === nodeId) {
    return update(node);
  }

  return {
    ...node,
    children: node.children.map((child) => updateNode(child, nodeId, update)),
  };
}

function reorderSection(
  node: RenderNode,
  selectedNodeId: string,
  direction: "up" | "down",
): RenderNode {
  const selectedSectionId = findContainingSectionId(node, selectedNodeId);

  if (!selectedSectionId) {
    return node;
  }

  return updateSectionList(node, (sections) => {
    const index = sections.findIndex((section) => section.id === selectedSectionId);
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (index === -1 || targetIndex < 0 || targetIndex >= sections.length) {
      return sections;
    }

    const nextSections = [...sections];
    const [section] = nextSections.splice(index, 1);

    if (!section) {
      return sections;
    }

    nextSections.splice(targetIndex, 0, section);
    return nextSections;
  });
}

function duplicateSection(node: RenderNode, sectionId: string): RenderNode {
  return updateSectionList(node, (sections) => {
    const index = sections.findIndex((section) => section.id === sectionId);

    if (index === -1) {
      return sections;
    }

    const duplicate = cloneNodeWithSuffix(sections[index]!, "-copy");
    const nextSections = [...sections];
    nextSections.splice(index + 1, 0, duplicate);
    return nextSections;
  });
}

function deleteSection(node: RenderNode, sectionId: string): RenderNode {
  return updateSectionList(node, (sections) => {
    if (sections.length <= 1) {
      return sections;
    }

    return sections.filter((section) => section.id !== sectionId);
  });
}

function updateSectionList(
  node: RenderNode,
  update: (sections: RenderNode[]) => RenderNode[],
): RenderNode {
  if (node.children.some((child) => child.tag === "section")) {
    const sections = node.children.filter((child) => child.tag === "section");
    const sectionIds = new Set(sections.map((section) => section.id));
    const nextSections = update(sections);

    return {
      ...node,
      children: node.children.flatMap((child) => {
        if (sectionIds.has(child.id)) {
          return child.id === sections[0]?.id ? nextSections : [];
        }

        return [child];
      }),
    };
  }

  return {
    ...node,
    children: node.children.map((child) => updateSectionList(child, update)),
  };
}

function cloneNodeWithSuffix(node: RenderNode, suffix: string): RenderNode {
  return {
    ...node,
    id: `${node.id}${suffix}`,
    children: node.children.map((child) => cloneNodeWithSuffix(child, suffix)),
  };
}

function findContainingSectionId(
  root: RenderNode,
  nodeId: string,
): string | undefined {
  let found: string | undefined;

  function walk(node: RenderNode, currentSectionId: string | undefined): void {
    const nextSectionId = node.tag === "section" ? node.id : currentSectionId;

    if (node.id === nodeId) {
      found = nextSectionId;
      return;
    }

    for (const child of node.children) {
      walk(child, nextSectionId);
    }
  }

  walk(root, undefined);
  return found;
}

function findNode(node: RenderNode, nodeId: string): RenderNode | undefined {
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

function visitNode(node: RenderNode, visit: (node: RenderNode) => void): void {
  visit(node);

  for (const child of node.children) {
    visitNode(child, visit);
  }
}
