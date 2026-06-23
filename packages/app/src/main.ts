import {
  createAppState,
  canEditSelectedText,
  deleteSelection,
  duplicateSelection,
  editSelectedText,
  exportCurrentProject,
  formatCompatibilityWarningDetail,
  getCanvasHtml,
  getExportArtifact,
  getImportReviewSummary,
  getSelectedEditability,
  getSelectedEditableTextTargets,
  getSelectedText,
  importFixture,
  importSampleMaterial,
  insertCalloutAfterSelection,
  insertMaterialBlockAfterSelection,
  listSections,
  moveSelection,
  redo,
  setPreviewWidth,
  shouldShowEditableTextTargetList,
  undo,
  updateTheme,
  type AppState,
  type PreviewWidth,
} from "./appModel.js";
import type {
  ExportResult,
  MaterialBlockType,
  RenderNode,
  SemanticOverlayEntry,
} from "@htmleditor/core/browser";
import type { GrapesCanvasAdapter } from "./editor/grapesAdapter.js";
import { allowedBlockLabels } from "./editor/blockPalette.js";
import "./styles.css";

const artifactFilenames = [
  "standalone.html",
  "confluence-fragment.html",
  "compatibility-report.json",
  "native-mapping-report.json",
];

let importDrawerOpen = false;
let exportDrawerOpen = false;
let draftTitle = "Imported HTML Draft";
let draftContent =
  "<main><section><h1>Imported roadmap</h1><p>Replace this copy from the visual editor.</p></section></main>";
let selectedArtifact = "standalone.html";
let canvasAdapter: GrapesCanvasAdapter | undefined;
let canvasAdapterModulePromise:
  | Promise<typeof import("./editor/grapesAdapter.js")>
  | undefined;
let canvasAdapterRequestId = 0;
let canvasLoadStatus: "idle" | "loading" | "ready" | "error" = "idle";
let canvasLoadError: string | undefined;
let exportResult: ExportResult | undefined;
let exportLoading = false;
let exportError: string | undefined;
let exportVersion = 0;

let state: AppState = importSampleMaterial(
  createAppState({
    now: "2026-06-22T00:00:00.000Z",
    generatedAt: "2026-06-22T00:00:00.000Z",
  }),
);

const appRoot = getAppRoot();

render();

function render(): void {
  const selectedText = getSelectedText(state);
  const selectedEntry = selectedOverlayEntry();
  const selectedEditability = getSelectedEditability(state);
  const editableTextTargets = getSelectedEditableTextTargets(state);

  appRoot.innerHTML = `
    <main class="studio-shell" data-testid="visual-editor-shell">
      <header class="topbar">
        <div class="brand-block">
          <h1>Confluence Material Studio</h1>
          <p>Canvas-first visual editor for Confluence-oriented internal materials.</p>
        </div>
        <div class="topbar-actions">
          <button data-action="undo" ${state.history.undo.length === 0 ? "disabled" : ""}>Undo</button>
          <button data-action="redo" ${state.history.redo.length === 0 ? "disabled" : ""}>Redo</button>
          <button data-action="toggle-import">Import</button>
          <button data-action="add-callout">Add callout</button>
          <div class="segmented" aria-label="Preview widths">
            ${previewButton("desktop")}
            ${previewButton("tablet")}
            ${previewButton("mobile")}
          </div>
          <button class="primary-action" data-action="toggle-export">Export evidence</button>
        </div>
      </header>

      <aside class="left-rail" aria-label="Document outline">
        <h2>Document outline</h2>
        <nav class="section-list">
          ${outlineButtons()}
        </nav>
        <h2>Allowed blocks</h2>
        <div class="block-palette" aria-label="Constrained block palette">
          ${allowedBlockButtons()}
        </div>
      </aside>

      <section class="canvas-panel">
        <div class="canvas-heading">
          <div>
            <h2>Visual canvas</h2>
            <p>${escapeHtml(state.doc?.title ?? "No document")}</p>
          </div>
          <p class="canvas-state">${escapeHtml(canvasStatusText())}</p>
        </div>
        <div class="canvas-frame canvas-${state.previewWidth}">
          ${canvasLoadStatus === "error" ? canvasErrorNotice() : ""}
          <div class="canvas-surface" data-editor-host aria-label="Visual canvas"></div>
        </div>
      </section>

      <aside class="inspector-panel">
        <h2>Inspector</h2>
        <p class="selected-node">Selected: ${escapeHtml(selectedLabel(selectedEntry))}</p>
        <div class="editability-status">
          <span class="editability-badge ${selectedEditability.status}">${escapeHtml(selectedEditability.status)}</span>
          <p>${escapeHtml(selectedEditability.reason)}</p>
        </div>
        ${selectedEntry?.editableFields.includes("text") && canEditSelectedText(state) ? textEditor(selectedText) : lockedNotice()}
        ${shouldShowEditableTextTargetList(state) ? editableTextTargetList(editableTextTargets) : ""}
        ${documentControls()}
        ${themeControls()}
        <h2>Compatibility hints</h2>
        <p class="compatibility-hint">${escapeHtml(selectedCompatibility(selectedEntry))}</p>
        ${importReviewPanel()}
      </aside>

      ${importDrawerOpen ? importDrawer() : ""}
      ${exportDrawerOpen ? exportDrawerContent() : ""}
    </main>
  `;

  syncCanvasAdapter();
  bindEvents();
}

function bindEvents(): void {
  appRoot.querySelector('[data-action="undo"]')?.addEventListener("click", () => {
    updateState(undo(state));
    render();
  });

  appRoot.querySelector('[data-action="redo"]')?.addEventListener("click", () => {
    updateState(redo(state));
    render();
  });

  appRoot.querySelector('[data-action="toggle-import"]')?.addEventListener(
    "click",
    () => {
      importDrawerOpen = !importDrawerOpen;
      render();
    },
  );

  appRoot.querySelector('[data-action="toggle-export"]')?.addEventListener(
    "click",
    () => {
      if (exportDrawerOpen) {
        exportDrawerOpen = false;
        render();
        return;
      }

      void openExportDrawer();
    },
  );

  appRoot.querySelector('[data-action="close-import"]')?.addEventListener(
    "click",
    () => {
      importDrawerOpen = false;
      render();
    },
  );

  appRoot.querySelector('[data-action="close-export"]')?.addEventListener(
    "click",
    () => {
      exportDrawerOpen = false;
      render();
    },
  );

  appRoot
    .querySelector('[data-action="draft-title"]')
    ?.addEventListener("input", (event) => {
      draftTitle = (event.target as HTMLInputElement).value;
    });

  appRoot
    .querySelector('[data-action="draft-content"]')
    ?.addEventListener("input", (event) => {
      draftContent = (event.target as HTMLTextAreaElement).value;
    });

  appRoot.querySelector('[data-action="file-import"]')?.addEventListener(
    "change",
    (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];

      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.addEventListener("load", () => {
        draftTitle = file.name.replace(/\.html?$/i, "") || draftTitle;
        draftContent = String(reader.result ?? "");
        importDraft();
      });
      reader.readAsText(file);
    },
  );

  appRoot.querySelector('[data-action="import-draft"]')?.addEventListener(
    "click",
    () => {
      importDraft();
    },
  );

  appRoot.querySelector('[data-action="apply-text"]')?.addEventListener(
    "click",
    () => {
      const field =
        appRoot.querySelector<HTMLTextAreaElement>('[data-action="text"]');
      updateState(editSelectedText(state, field?.value ?? ""));
      render();
    },
  );

  appRoot
    .querySelector('[data-action="duplicate-selection"]')
    ?.addEventListener("click", () => {
      updateState(duplicateSelection(state));
      render();
    });

  appRoot
    .querySelector('[data-action="delete-selection"]')
    ?.addEventListener("click", () => {
      updateState(deleteSelection(state));
      render();
    });

  appRoot.querySelectorAll<HTMLButtonElement>("[data-move-selection]").forEach(
    (button) => {
      button.addEventListener("click", () => {
        updateState(
          moveSelection(
            state,
            button.dataset.moveSelection === "up" ? "up" : "down",
          ),
        );
        render();
      });
    },
  );

  appRoot.querySelectorAll<HTMLButtonElement>("[data-edit-target-id]").forEach(
    (button) => {
      button.addEventListener("click", () => {
        state = { ...state, selectedNodeId: button.dataset.editTargetId };
        render();
      });
    },
  );

  appRoot.querySelectorAll<HTMLElement>("[data-theme-field]").forEach((field) => {
    field.addEventListener("change", () => {
      updateThemeFromControls();
      render();
    });
  });

  appRoot.querySelectorAll('[data-action="add-callout"]').forEach((button) => {
    button.addEventListener("click", () => {
      insertReviewCalloutAfterSelection();
      render();
    });
  });

  appRoot.querySelectorAll<HTMLButtonElement>("[data-block-type]").forEach(
    (button) => {
      button.addEventListener("click", () => {
        insertBlockAfterSelection(button.dataset.blockType as MaterialBlockType);
        render();
      });
    },
  );

  appRoot.querySelectorAll<HTMLButtonElement>("[data-preview]").forEach(
    (button) => {
      button.addEventListener("click", () => {
        updateState(
          setPreviewWidth(state, button.dataset.preview as PreviewWidth),
          false,
        );
        render();
      });
    },
  );

  appRoot.querySelectorAll<HTMLButtonElement>("[data-node-id]").forEach(
    (button) => {
      button.addEventListener("click", () => {
        state = { ...state, selectedNodeId: button.dataset.nodeId };
        render();
      });
    },
  );

  appRoot.querySelectorAll<HTMLButtonElement>('[data-action="artifact"]').forEach(
    (button) => {
      button.addEventListener("click", () => {
        selectedArtifact = button.dataset.filename ?? "standalone.html";
        render();
      });
    },
  );

  appRoot.querySelector(".canvas-surface")?.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const selected = target.closest<HTMLElement>("[data-core-node-id]");

    if (!selected) {
      return;
    }

    state = { ...state, selectedNodeId: selected.dataset.coreNodeId };
    render();
  });
}

function importDraft(): void {
  state = importFixture(state, {
    kind: "html",
    title: draftTitle.trim() || "Imported HTML Draft",
    content: draftContent,
  });
  invalidateExportResult();
  importDrawerOpen = false;
  exportDrawerOpen = false;
  selectedArtifact = "standalone.html";
  render();
}

function updateState(nextState: AppState, invalidate = true): void {
  const previousDoc = state.doc;
  state = nextState;

  if (invalidate && state.doc !== previousDoc) {
    invalidateExportResult();
  }
}

function insertReviewCalloutAfterSelection(): void {
  updateState(
    insertCalloutAfterSelection(state, {
      title: "Review note",
      body: "Confirm the Confluence fragment before sharing.",
    }),
  );
}

function insertBlockAfterSelection(blockType: MaterialBlockType): void {
  updateState(insertMaterialBlockAfterSelection(state, blockType));
}

function previewButton(width: PreviewWidth): string {
  const active = state.previewWidth === width ? "active" : "";
  return `<button class="${active}" data-preview="${width}">${width}</button>`;
}

function allowedBlockButtons(): string {
  return allowedBlockLabels()
    .map((label) => {
      const blockType = blockTypeForLabel(label);
      return `<button data-block-type="${blockType}">${escapeHtml(label)}</button>`;
    })
    .join("");
}

function blockTypeForLabel(label: string): MaterialBlockType {
  if (label === "Title") {
    return "title";
  }

  if (label === "Paragraph") {
    return "paragraph";
  }

  if (label === "Divider") {
    return "divider";
  }

  return "callout";
}

function outlineButtons(): string {
  if (!state.doc) {
    return "<p>No document.</p>";
  }

  const sections = listSections(state.doc);
  const entries = state.doc.semanticOverlay.filter((entry) =>
    ["title", "paragraph", "callout", "section"].includes(entry.role),
  );
  const outline = entries.length > 0 ? entries : sections.map(sectionEntry);

  return outline
    .map((entry) => {
      const active = state.selectedNodeId === entry.nodeId ? "active" : "";
      return `<button class="${active}" data-node-id="${entry.nodeId}">${escapeHtml(
        entry.role,
      )}<span>${escapeHtml(nodeText(entry.nodeId).slice(0, 48) || entry.nodeId)}</span></button>`;
    })
    .join("");
}

function sectionEntry(node: RenderNode): SemanticOverlayEntry {
  return {
    nodeId: node.id,
    role: "section",
    editableFields: ["text"],
    confluenceMapping: {
      recommendedTarget: "native",
      expectedVisualLoss: "minor",
      rationale: "Section can map to native Confluence structure.",
    },
    warnings: [],
  };
}

function selectedOverlayEntry(): SemanticOverlayEntry | undefined {
  return state.doc?.semanticOverlay.find(
    (entry) => entry.nodeId === state.selectedNodeId,
  );
}

function selectedLabel(entry: SemanticOverlayEntry | undefined): string {
  if (!entry) {
    return "none";
  }

  return `${entry.role} (${entry.nodeId})`;
}

function selectedCompatibility(entry: SemanticOverlayEntry | undefined): string {
  if (!entry) {
    return "Select a canvas element to inspect compatibility.";
  }

  return entry.confluenceMapping.rationale;
}

function textEditor(selectedText: string): string {
  return `
    <label>
      Selected text
      <textarea class="text-edit" data-action="text">${escapeHtml(selectedText)}</textarea>
    </label>
    <button class="primary-action" data-action="apply-text">Apply text</button>
  `;
}

function lockedNotice(): string {
  return `
    <div class="locked-notice">
      Preserved imported structure. Select an editable child text target or use the document controls that are available for this node.
    </div>
  `;
}

function editableTextTargetList(
  targets: ReturnType<typeof getSelectedEditableTextTargets>,
): string {
  return `
    <div class="editable-targets">
      <h2>Editable text targets</h2>
      <div class="target-list">
        ${targets
          .map(
            (target) =>
              `<button data-edit-target-id="${target.nodeId}">${escapeHtml(target.role)}<span>${escapeHtml(target.textPreview)}</span></button>`,
          )
          .join("")}
      </div>
    </div>
  `;
}

function documentControls(): string {
  const disabled = state.doc && state.selectedNodeId ? "" : "disabled";

  return `
    <div class="control-group">
      <h2>Document controls</h2>
      <div class="document-actions">
        <button data-action="duplicate-selection" ${disabled}>Duplicate</button>
        <button data-action="delete-selection" ${disabled}>Delete</button>
        <button data-move-selection="up" ${disabled}>Move up</button>
        <button data-move-selection="down" ${disabled}>Move down</button>
      </div>
    </div>
  `;
}

function themeControls(): string {
  const tokens = state.doc?.themeTokens;

  if (!tokens) {
    return "";
  }

  return `
    <div class="control-group theme-controls">
      <h2>Theme tokens</h2>
      <label>
        Background
        <input type="color" data-theme-field="background" value="${escapeAttribute(tokens.colors.background)}">
      </label>
      <label>
        Text
        <input type="color" data-theme-field="text" value="${escapeAttribute(tokens.colors.text)}">
      </label>
      <label>
        Accent
        <input type="color" data-theme-field="accent" value="${escapeAttribute(tokens.colors.accent)}">
      </label>
      <label>
        Font stack
        <input data-theme-field="fontStack" value="${escapeAttribute(tokens.fontStack)}">
      </label>
      <label>
        Spacing
        <select data-theme-field="spacingScale">
          ${themeOption("compact", tokens.spacingScale)}
          ${themeOption("comfortable", tokens.spacingScale)}
          ${themeOption("spacious", tokens.spacingScale)}
        </select>
      </label>
      <label>
        Radius
        <input data-theme-field="radius" value="${escapeAttribute(tokens.radius)}">
      </label>
      <label>
        Shadow
        <select data-theme-field="shadow">
          ${themeOption("none", tokens.shadow)}
          ${themeOption("soft", tokens.shadow)}
          ${themeOption("strong", tokens.shadow)}
        </select>
      </label>
    </div>
  `;
}

function themeOption(value: string, selected: string): string {
  return `<option value="${value}" ${value === selected ? "selected" : ""}>${value}</option>`;
}

function updateThemeFromControls(): void {
  if (!state.doc) {
    return;
  }

  const current = state.doc.themeTokens;
  const value = (field: string, fallback: string) =>
    appRoot.querySelector<HTMLInputElement | HTMLSelectElement>(
      `[data-theme-field="${field}"]`,
    )?.value ?? fallback;

  updateState(
    updateTheme(state, {
      colors: {
        background: value("background", current.colors.background),
        text: value("text", current.colors.text),
        accent: value("accent", current.colors.accent),
      },
      fontStack: value("fontStack", current.fontStack),
      spacingScale: value("spacingScale", current.spacingScale) as
        | "compact"
        | "comfortable"
        | "spacious",
      radius: value("radius", current.radius),
      shadow: value("shadow", current.shadow) as "none" | "soft" | "strong",
    }),
  );
}

function importDrawer(): string {
  return `
    <section class="drawer import-drawer" aria-label="Import drawer">
      <div class="drawer-header">
        <h2>Import HTML</h2>
        <button data-action="close-import">Close</button>
      </div>
      <label>
        Draft title
        <input data-action="draft-title" value="${escapeAttribute(draftTitle)}">
      </label>
      <label>
        HTML draft
        <textarea data-action="draft-content" spellcheck="false">${escapeHtml(
          draftContent,
        )}</textarea>
      </label>
      <label>
        .html file
        <input data-action="file-import" type="file" accept=".html,.htm,text/html">
      </label>
      <button class="primary-action" data-action="import-draft">Import sanitized HTML</button>
    </section>
  `;
}

function exportDrawerContent(): string {
  if (exportLoading) {
    return `
      <section class="drawer export-drawer" aria-label="Export evidence drawer">
        <div class="drawer-header">
          <div>
            <h2>Export evidence</h2>
            <p>Preparing core-backed export artifacts.</p>
          </div>
          <button data-action="close-export">Close</button>
        </div>
        <p>Loading export evidence...</p>
      </section>
    `;
  }

  if (exportError) {
    return `
      <section class="drawer export-drawer" aria-label="Export evidence drawer">
        <div class="drawer-header">
          <div>
            <h2>Export evidence</h2>
            <p>Native mapping is a report/plan, not a Confluence page body.</p>
          </div>
          <button data-action="close-export">Close</button>
        </div>
        <p class="locked-notice">${escapeHtml(exportError)}</p>
      </section>
    `;
  }

  return exportResult ? exportDrawer(exportResult) : "";
}

function exportDrawer(exportResult: ExportResult): string {
  const selectedArtifactContent = getExportArtifact(exportResult, selectedArtifact);
  const warningItems =
    exportResult.compatibilityReport.warnings.length > 0
      ? exportResult.compatibilityReport.warnings
          .map(
            (warning) =>
              `<li>${escapeHtml(formatCompatibilityWarningDetail(warning))}</li>`,
          )
          .join("")
      : "<li>No warnings</li>";

  return `
    <section class="drawer export-drawer" aria-label="Export evidence drawer">
      <div class="drawer-header">
        <div>
          <h2>Export evidence</h2>
          <p>Native mapping is a report/plan, not a Confluence page body.</p>
        </div>
        <button data-action="close-export">Close</button>
      </div>
      <div class="artifact-tabs">
        ${artifactFilenames
          .map(
            (filename) =>
              `<button class="${selectedArtifact === filename ? "active" : ""}" data-action="artifact" data-filename="${filename}">${filename}</button>`,
          )
          .join("")}
      </div>
      <pre class="artifact-preview"><code>${escapeHtml(
        selectedArtifactContent,
      )}</code></pre>
      <h2>Compatibility warnings</h2>
      <ul>${warningItems}</ul>
    </section>
  `;
}

function importReviewPanel(): string {
  const summary = getImportReviewSummary(state.doc, exportResult);
  const targetImpact =
    summary.targetImpact.length > 0
      ? summary.targetImpact
          .map(
            (impact) =>
              `<li>${escapeHtml(impact.target)}: ${impact.warningCount} (${escapeHtml(impact.ruleIds.join(", "))})</li>`,
          )
          .join("")
      : summary.targetImpactStatus === "export-evidence"
        ? "<li>No target warnings</li>"
        : "<li>Final target impact pending export evidence</li>";
  const sanitizerRules =
    summary.sanitizerRuleIds.length > 0
      ? summary.sanitizerRuleIds.join(", ")
      : "none";

  return `
    <div class="import-review-panel">
      <h2>Import review</h2>
      <dl>
        <div>
          <dt>Sanitizer warnings</dt>
          <dd>${summary.sanitizerWarningCount} (${escapeHtml(sanitizerRules)})</dd>
        </div>
        <div>
          <dt>Editability</dt>
          <dd>${summary.editabilityCounts.editable} editable / ${summary.editabilityCounts.partiallyEditable} partial / ${summary.editabilityCounts.preservedOnly} preserved</dd>
        </div>
        <div>
          <dt>Target impact</dt>
          <dd><ul>${targetImpact}</ul><p>${escapeHtml(summary.targetImpactNote)}</p></dd>
        </div>
        <div>
          <dt>Source baseline</dt>
          <dd>${escapeHtml(summary.sourceBaselineNote)}</dd>
        </div>
      </dl>
    </div>
  `;
}

function nodeText(nodeId: string): string {
  const node = findNode(state.doc?.renderTree, nodeId);
  return node ? compactText(node).trim() : "";
}

function syncCanvasAdapter(): void {
  canvasAdapterRequestId += 1;
  const requestId = canvasAdapterRequestId;

  canvasAdapter?.destroy();
  canvasAdapter = undefined;

  if (canvasLoadStatus === "error") {
    return;
  }

  canvasLoadStatus = "loading";
  canvasLoadError = undefined;

  const host = appRoot.querySelector<HTMLElement>("[data-editor-host]");

  if (!host || !state.doc) {
    canvasLoadStatus = "idle";
    return;
  }

  void loadGrapesCanvasAdapterModule()
    .then(({ createGrapesCanvasAdapter }) => {
      if (requestId !== canvasAdapterRequestId || !host.isConnected) {
        return;
      }

      const adapter = createGrapesCanvasAdapter({
        host,
        safeHtml: getCanvasHtmlForAdapter(),
        selectedNodeId: state.selectedNodeId,
        previewWidth: state.previewWidth,
        onSelectionChange: (nodeId) => {
          if (requestId !== canvasAdapterRequestId) {
            return;
          }

          if (nodeId === state.selectedNodeId) {
            return;
          }

          state = { ...state, selectedNodeId: nodeId };
          render();
        },
        onSetSelectedText: (text) => {
          if (requestId !== canvasAdapterRequestId) {
            return;
          }

          updateState(editSelectedText(state, text));
        },
        onAddCallout: () => {
          if (requestId !== canvasAdapterRequestId) {
            return;
          }

          insertReviewCalloutAfterSelection();
        },
        onAddMaterialBlock: (blockType) => {
          if (requestId !== canvasAdapterRequestId) {
            return;
          }

          insertBlockAfterSelection(blockType);
        },
      });

      if (requestId !== canvasAdapterRequestId || !host.isConnected) {
        adapter.destroy();
        return;
      }

      canvasAdapter = adapter;
      canvasLoadStatus = "ready";
    })
    .catch((error: unknown) => {
      if (requestId !== canvasAdapterRequestId) {
        return;
      }

      canvasLoadStatus = "error";
      canvasLoadError =
        error instanceof Error ? error.message : "Unable to load visual canvas.";
      render();
    });
}

function loadGrapesCanvasAdapterModule(): Promise<
  typeof import("./editor/grapesAdapter.js")
> {
  canvasAdapterModulePromise ??= import("./editor/grapesAdapter.js");
  return canvasAdapterModulePromise;
}

async function openExportDrawer(): Promise<void> {
  exportDrawerOpen = true;
  if (exportResult && exportError === undefined) {
    exportLoading = false;
    render();
    return;
  }

  exportLoading = true;
  exportError = undefined;
  exportResult = undefined;
  selectedArtifact = "standalone.html";
  const requestVersion = exportVersion;
  render();

  try {
    const nextExportResult = await exportCurrentProject(state);

    if (requestVersion !== exportVersion) {
      return;
    }

    exportResult = nextExportResult;
  } catch (error) {
    if (requestVersion !== exportVersion) {
      return;
    }

    exportError =
      error instanceof Error ? error.message : "Unable to export project.";
  } finally {
    if (requestVersion !== exportVersion) {
      return;
    }

    exportLoading = false;
    render();
  }
}

function invalidateExportResult(): void {
  exportVersion += 1;
  exportResult = undefined;
  exportError = undefined;
  exportLoading = false;
  exportDrawerOpen = false;
}

function getCanvasHtmlForAdapter(): string {
  return state.doc ? getCanvasHtml(state) : "";
}

function canvasStatusText(): string {
  if (canvasLoadStatus === "error") {
    return "Visual canvas failed to load. Document controls remain available.";
  }

  if (canvasLoadStatus === "ready") {
    return "Click text or sections to select. Export remains core-backed.";
  }

  return "Loading visual canvas. Document controls remain available.";
}

function canvasErrorNotice(): string {
  return `
    <div class="canvas-error" role="alert" style="margin: 16px; padding: 16px; border: 1px solid #b91c1c; background: #fef2f2; color: #7f1d1d;">
      Visual canvas could not load. Use the outline, inspector, and block controls to continue editing.
      <span>${escapeHtml(canvasLoadError ?? "Unable to load visual canvas.")}</span>
    </div>
  `;
}

function compactText(node: RenderNode): string {
  if (node.tag === "#text") {
    return node.text ?? "";
  }

  return node.children.map((child) => compactText(child)).join(" ");
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

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll('"', "&quot;");
}

function getAppRoot(): HTMLDivElement {
  const root = document.querySelector<HTMLDivElement>("#app");

  if (!root) {
    throw new Error("Missing #app root.");
  }

  return root;
}
