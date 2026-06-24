import {
  deleteNode,
  duplicateNode,
  editNodeText,
  getNodeEditability,
  getNodeStructureMutability,
  importHtml,
  importMarkdown,
  insertCalloutAfterNode,
  insertMaterialBlockAfterNode,
  listEditableTextTargets,
  moveNode,
  renderTreeToHtml,
  updateThemeTokens,
  type EditableTextTarget,
  type ExportResult,
  type CompatibilityWarning,
  type ExportTarget,
  type MaterialBlockType,
  type NodeEditability,
  type NodeStructureMutability,
  type ProjectDoc,
  type RenderNode,
  type SemanticRole,
  type ThemeTokenPatch,
} from "@htmleditor/core/browser";

export type ImportFixtureInput = {
  kind: "html" | "markdown";
  title: string;
  content: string;
};

export type PreviewWidth = "desktop" | "tablet" | "mobile";

export type AppHistoryEntry = {
  doc: ProjectDoc;
  selectedNodeId: string | undefined;
};

export type AppHistory = {
  undo: AppHistoryEntry[];
  redo: AppHistoryEntry[];
};

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
  history: AppHistory;
};

export type EditabilityCountSummary = {
  editable: number;
  partiallyEditable: number;
  preservedOnly: number;
};

type WarningRuleId = CompatibilityWarning["ruleId"];

export type TargetImpactSummary = {
  target: ExportTarget;
  warningCount: number;
  ruleIds: WarningRuleId[];
};

export type ImportReviewSummary = {
  sanitizerWarningCount: number;
  sanitizerRuleIds: WarningRuleId[];
  editabilityCounts: EditabilityCountSummary;
  targetImpact: TargetImpactSummary[];
  targetImpactStatus:
    | "pending-export-evidence"
    | "import-sanitize-only"
    | "export-evidence";
  targetImpactNote: string;
  sourceBaselineNote: string;
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
    history: { undo: [], redo: [] },
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
    history: { undo: [], redo: [] },
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

  if (getSelectedText(state) === text) {
    return state;
  }

  const doc = editNodeText(state.doc, {
    nodeId: state.selectedNodeId,
    text,
    createdAt: state.now,
  });

  return applyDocMutation(state, doc, state.selectedNodeId);
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

  return applyDocMutation(state, doc, calloutEntry?.nodeId ?? state.selectedNodeId);
}

export function insertMaterialBlockAfterSelection(
  state: AppState,
  blockType: MaterialBlockType,
): AppState {
  if (!state.doc || !state.selectedNodeId) {
    return state;
  }

  const doc = insertMaterialBlockAfterNode(state.doc, {
    anchorNodeId: state.selectedNodeId,
    blockType,
    createdAt: state.now,
  });

  if (doc === state.doc) {
    return state;
  }

  const insertedEntry = doc.semanticOverlay.at(-1);

  return applyDocMutation(state, doc, insertedEntry?.nodeId ?? state.selectedNodeId);
}

export function duplicateSelection(state: AppState): AppState {
  if (!state.doc || !state.selectedNodeId) {
    return state;
  }

  const doc = duplicateNode(state.doc, {
    nodeId: state.selectedNodeId,
    createdAt: state.now,
  });

  return applyDocMutation(
    state,
    doc,
    nextSiblingId(doc.renderTree, state.selectedNodeId) ?? state.selectedNodeId,
  );
}

export function deleteSelection(state: AppState): AppState {
  if (!state.doc || !state.selectedNodeId) {
    return state;
  }

  const fallbackSelection = selectionAfterDelete(
    state.doc.renderTree,
    state.selectedNodeId,
  );
  const doc = deleteNode(state.doc, {
    nodeId: state.selectedNodeId,
    createdAt: state.now,
  });

  return applyDocMutation(state, doc, fallbackSelection);
}

export function moveSelection(
  state: AppState,
  direction: "up" | "down",
): AppState {
  if (!state.doc || !state.selectedNodeId) {
    return state;
  }

  const doc = moveNode(state.doc, {
    nodeId: state.selectedNodeId,
    direction,
    createdAt: state.now,
  });

  return applyDocMutation(state, doc, state.selectedNodeId);
}

export function updateTheme(
  state: AppState,
  themeTokens: ThemeTokenPatch,
): AppState {
  if (!state.doc) {
    return state;
  }

  const doc = updateThemeTokens(state.doc, {
    themeTokens,
    createdAt: state.now,
  });

  return applyDocMutation(state, doc, state.selectedNodeId);
}

export function undo(state: AppState): AppState {
  const previous = state.history.undo.at(-1);

  if (!previous || !state.doc) {
    return state;
  }

  return {
    ...state,
    doc: previous.doc,
    selectedNodeId: previous.selectedNodeId,
    history: {
      undo: state.history.undo.slice(0, -1),
      redo: [
        ...state.history.redo,
        { doc: state.doc, selectedNodeId: state.selectedNodeId },
      ],
    },
  };
}

export function redo(state: AppState): AppState {
  const next = state.history.redo.at(-1);

  if (!next || !state.doc) {
    return state;
  }

  return {
    ...state,
    doc: next.doc,
    selectedNodeId: next.selectedNodeId,
    history: {
      undo: [
        ...state.history.undo,
        { doc: state.doc, selectedNodeId: state.selectedNodeId },
      ],
      redo: state.history.redo.slice(0, -1),
    },
  };
}

export function getSelectedEditability(state: AppState): NodeEditability {
  if (!state.doc || !state.selectedNodeId) {
    return {
      status: "preserved-only",
      reason: "Select a canvas element to inspect editability.",
    };
  }

  return getNodeEditability(state.doc, state.selectedNodeId);
}

export function getSelectedStructureMutability(
  state: AppState,
): NodeStructureMutability {
  if (!state.doc || !state.selectedNodeId) {
    return {
      canMutate: false,
      reason: "Select a canvas element before using document controls.",
    };
  }

  return getNodeStructureMutability(state.doc, state.selectedNodeId);
}

export function getSelectedEditableTextTargets(
  state: AppState,
): EditableTextTarget[] {
  if (!state.doc || !state.selectedNodeId) {
    return [];
  }

  return listEditableTextTargets(state.doc, state.selectedNodeId);
}

export function shouldShowEditableTextTargetList(state: AppState): boolean {
  return (
    getSelectedEditability(state).status === "partially-editable" &&
    getSelectedEditableTextTargets(state).length > 0
  );
}

export function getCanvasHtml(state: AppState): string {
  return state.doc
    ? renderTreeToHtml(state.doc.renderTree, {
        includeNodeIds: true,
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

export function getImportReviewSummary(
  doc: ProjectDoc | undefined,
  exportResult?: ExportResult,
): ImportReviewSummary {
  if (!doc) {
    return {
      sanitizerWarningCount: 0,
      sanitizerRuleIds: [],
      editabilityCounts: emptyEditabilityCounts(),
      targetImpact: [],
      targetImpactStatus: "pending-export-evidence",
      targetImpactNote:
        "Import a document before reviewing target compatibility impact.",
      sourceBaselineNote: "Source baseline unavailable until import.",
    };
  }

  const sanitizerWarningEntries = doc.transformationTrace.filter(
    (entry) => entry.stage === "sanitize" && entry.ruleId,
  );
  const sanitizerRuleIds = uniqueRuleIds(
    sanitizerWarningEntries
      .map((entry) => entry.ruleId)
      .filter((ruleId): ruleId is WarningRuleId => Boolean(ruleId)),
  );
  const warnings =
    exportResult?.compatibilityReport.warnings ??
    doc.transformationTrace
      .filter((entry) => entry.ruleId)
      .map((entry) => traceWarningFallback(entry.ruleId!, entry.message));

  return {
    sanitizerWarningCount: sanitizerWarningEntries.length,
    sanitizerRuleIds,
    editabilityCounts: summarizeEditability(doc),
    targetImpact: summarizeTargetImpact(warnings),
    targetImpactStatus: targetImpactStatus(exportResult, warnings),
    targetImpactNote: targetImpactNote(exportResult),
    sourceBaselineNote: doc.sourceArtifact
      ? `Source baseline available from immutable ${doc.sourceArtifact.kind} import.`
      : "Source baseline unavailable until import.",
  };
}

export function formatCompatibilityWarningDetail(
  warning: CompatibilityWarning,
): string {
  return `${warning.severity} | ${warning.target} | ${warning.ruleId} | ${warning.message} Recommendation: ${warning.recommendation}`;
}

export function setPreviewWidth(
  state: AppState,
  previewWidth: PreviewWidth,
): AppState {
  return { ...state, previewWidth };
}

export async function exportCurrentProject(
  state: AppState,
): Promise<ExportResult> {
  if (!state.doc) {
    throw new Error("Cannot export before importing a document.");
  }

  const { exportProject } = await import("@htmleditor/core/export");

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

function summarizeEditability(doc: ProjectDoc): EditabilityCountSummary {
  const counts = emptyEditabilityCounts();

  visitNode(doc.renderTree, (node) => {
    if (node.tag === "#text") {
      return;
    }

    const status = getNodeEditability(doc, node.id).status;

    if (status === "editable") {
      counts.editable += 1;
    } else if (status === "partially-editable") {
      counts.partiallyEditable += 1;
    } else {
      counts.preservedOnly += 1;
    }
  });

  return counts;
}

function summarizeTargetImpact(
  warnings: CompatibilityWarning[],
): TargetImpactSummary[] {
  const byTarget = new Map<
    ExportTarget,
    { warningCount: number; ruleIds: Set<WarningRuleId> }
  >();

  for (const warning of warnings) {
    const impact = byTarget.get(warning.target) ?? {
      warningCount: 0,
      ruleIds: new Set<WarningRuleId>(),
    };
    impact.warningCount += 1;
    impact.ruleIds.add(warning.ruleId);
    byTarget.set(warning.target, impact);
  }

  return Array.from(byTarget.entries()).map(([target, impact]) => ({
    target,
    warningCount: impact.warningCount,
    ruleIds: Array.from(impact.ruleIds),
  }));
}

function traceWarningFallback(
  ruleId: WarningRuleId,
  message: string,
): CompatibilityWarning {
  return {
    ruleId,
    target: ruleId.startsWith("CF_FRAGMENT")
      ? "confluence-fragment"
      : ruleId.startsWith("CF_NATIVE")
        ? "native-mapping"
        : "standalone-html",
    severity: ruleId === "HTML_JAVASCRIPT_URL" ? "error" : "warning",
    message,
    recommendation: "Open export evidence for full recommendation.",
  };
}

function uniqueRuleIds(ruleIds: WarningRuleId[]): WarningRuleId[] {
  return Array.from(new Set(ruleIds));
}

function targetImpactStatus(
  exportResult: ExportResult | undefined,
  warnings: CompatibilityWarning[],
): ImportReviewSummary["targetImpactStatus"] {
  if (exportResult) {
    return "export-evidence";
  }

  return warnings.length > 0 ? "import-sanitize-only" : "pending-export-evidence";
}

function targetImpactNote(
  exportResult: ExportResult | undefined,
): string {
  if (exportResult) {
    return "Target impact is based on export compatibility evidence.";
  }

  return "Target impact is based on import/sanitize warnings only. Export evidence calculates final compatibility warnings.";
}

function emptyEditabilityCounts(): EditabilityCountSummary {
  return {
    editable: 0,
    partiallyEditable: 0,
    preservedOnly: 0,
  };
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

function applyDocMutation(
  state: AppState,
  doc: ProjectDoc,
  selectedNodeId: string | undefined,
): AppState {
  if (!state.doc || doc === state.doc) {
    return state;
  }

  return {
    ...state,
    doc,
    selectedNodeId,
    history: {
      undo: [
        ...state.history.undo,
        { doc: state.doc, selectedNodeId: state.selectedNodeId },
      ],
      redo: [],
    },
  };
}

function nextSiblingId(
  node: RenderNode,
  nodeId: string,
): string | undefined {
  const childIndex = node.children.findIndex((child) => child.id === nodeId);

  if (childIndex !== -1) {
    return node.children[childIndex + 1]?.id;
  }

  for (const child of node.children) {
    const found = nextSiblingId(child, nodeId);

    if (found) {
      return found;
    }
  }

  return undefined;
}

function selectionAfterDelete(
  node: RenderNode,
  nodeId: string,
): string | undefined {
  const childIndex = node.children.findIndex((child) => child.id === nodeId);

  if (childIndex !== -1) {
    return (
      node.children[childIndex - 1]?.id ??
      node.children[childIndex + 1]?.id ??
      node.id
    );
  }

  for (const child of node.children) {
    const found = selectionAfterDelete(child, nodeId);

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
