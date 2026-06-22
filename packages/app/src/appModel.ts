import {
  exportProject,
  editNodeText,
  importHtml,
  importMarkdown,
  insertCalloutAfterNode,
  renderTreeToHtml,
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

export const sampleMaterial: ImportFixtureInput = {
  kind: "html",
  title: "Release Readiness",
  content:
    '<main class="material-sample"><section><h1>Release Readiness</h1><p>All export targets need explicit compatibility evidence before the material is shared.</p><aside class="callout" data-confluence-macro="note"><h2>Migration note</h2><p>Native mapping is a report, not a page body.</p></aside></section></main>',
};

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

export function importSampleMaterial(state: AppState): AppState {
  return importFixture(state, sampleMaterial);
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

  if (!canEditSelectedText(state)) {
    return state;
  }

  return {
    ...state,
    doc: editNodeText(state.doc, {
      nodeId: state.selectedNodeId,
      text,
      createdAt: state.now,
    }),
  };
}

export function canEditSelectedText(state: AppState): boolean {
  return Boolean(
    state.doc &&
      state.selectedNodeId &&
      findDirectTextChild(state.doc.renderTree, state.selectedNodeId),
  );
}

export function insertCalloutAfterSelection(
  state: AppState,
  input: { title: string; body: string },
): AppState {
  if (!state.doc || !state.selectedNodeId) {
    return state;
  }

  const doc = insertCalloutAfterNode(state.doc, {
    anchorNodeId: state.selectedNodeId,
    title: input.title,
    body: input.body,
    createdAt: state.now,
  });
  const calloutEntry = [...doc.semanticOverlay]
    .reverse()
    .find((entry) => entry.role === "callout");

  return {
    ...state,
    doc,
    selectedNodeId: calloutEntry?.nodeId ?? state.selectedNodeId,
  };
}

export function getCanvasHtml(state: AppState): string {
  return state.doc
    ? renderTreeToHtml(state.doc.renderTree, {
        includeNodeIds: true,
        omitStyleTags: true,
      })
    : "";
}

export function getSelectedText(state: AppState): string {
  if (!state.doc || !state.selectedNodeId) {
    return "";
  }

  const selectedNode = findNode(state.doc.renderTree, state.selectedNodeId);

  if (!selectedNode) {
    return "";
  }

  return selectedNode.children
    .filter((child) => child.tag === "#text")
    .map((child) => child.text ?? "")
    .join("");
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

export function setPreviewWidth(
  state: AppState,
  previewWidth: PreviewWidth,
): AppState {
  return { ...state, previewWidth };
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

function findDirectTextChild(
  node: RenderNode,
  nodeId: string,
): RenderNode | undefined {
  return findNode(node, nodeId)?.children.find((child) => child.tag === "#text");
}

function visitNode(node: RenderNode, visit: (node: RenderNode) => void): void {
  visit(node);

  for (const child of node.children) {
    visitNode(child, visit);
  }
}
