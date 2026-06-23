import {
  createAppState,
  canEditSelectedText,
  editSelectedText,
  exportCurrentProject,
  getCanvasHtml,
  getExportArtifact,
  getSelectedText,
  importFixture,
  importSampleMaterial,
  insertCalloutAfterSelection,
  insertMaterialBlockAfterSelection,
  listSections,
  setPreviewWidth,
  type AppState,
  type PreviewWidth,
} from "./appModel.js";
import type {
  ExportResult,
  MaterialBlockType,
  RenderNode,
  SemanticOverlayEntry,
} from "@htmleditor/core";
import {
  createGrapesCanvasAdapter,
  type GrapesCanvasAdapter,
} from "./editor/grapesAdapter.js";
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

let state: AppState = importSampleMaterial(
  createAppState({
    now: "2026-06-22T00:00:00.000Z",
    generatedAt: "2026-06-22T00:00:00.000Z",
  }),
);

const appRoot = getAppRoot();

render();

function render(): void {
  const exportResult = state.doc ? exportCurrentProject(state) : undefined;
  const selectedText = getSelectedText(state);
  const selectedEntry = selectedOverlayEntry();

  appRoot.innerHTML = `
    <main class="studio-shell" data-testid="visual-editor-shell">
      <header class="topbar">
        <div class="brand-block">
          <h1>Confluence Material Studio</h1>
          <p>Canvas-first visual editor for Confluence-oriented internal materials.</p>
        </div>
        <div class="topbar-actions">
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
          <p class="canvas-state">Click text or sections to select. Export remains core-backed.</p>
        </div>
        <div class="canvas-frame canvas-${state.previewWidth}">
          <div class="canvas-surface" data-editor-host aria-label="Visual canvas"></div>
        </div>
      </section>

      <aside class="inspector-panel">
        <h2>Inspector</h2>
        <p class="selected-node">Selected: ${escapeHtml(selectedLabel(selectedEntry))}</p>
        ${selectedEntry?.editableFields.includes("text") && canEditSelectedText(state) ? textEditor(selectedText) : lockedNotice()}
        <h2>Compatibility hints</h2>
        <p class="compatibility-hint">${escapeHtml(selectedCompatibility(selectedEntry))}</p>
      </aside>

      ${importDrawerOpen ? importDrawer() : ""}
      ${exportDrawerOpen && exportResult ? exportDrawer(exportResult) : ""}
    </main>
  `;

  syncCanvasAdapter();
  bindEvents();
}

function bindEvents(): void {
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
      exportDrawerOpen = !exportDrawerOpen;
      render();
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
      canvasAdapter?.setSelectedText(field?.value ?? "");
      render();
    },
  );

  appRoot.querySelectorAll('[data-action="add-callout"]').forEach((button) => {
    button.addEventListener("click", () => {
      canvasAdapter?.addCallout();
      render();
    });
  });

  appRoot.querySelectorAll<HTMLButtonElement>("[data-block-type]").forEach(
    (button) => {
      button.addEventListener("click", () => {
        canvasAdapter?.addMaterialBlock(
          button.dataset.blockType as MaterialBlockType,
        );
        render();
      });
    },
  );

  appRoot.querySelectorAll<HTMLButtonElement>("[data-preview]").forEach(
    (button) => {
      button.addEventListener("click", () => {
        state = setPreviewWidth(state, button.dataset.preview as PreviewWidth);
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
  importDrawerOpen = false;
  exportDrawerOpen = false;
  selectedArtifact = "standalone.html";
  render();
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
      Preserved imported structure. This node is not text-editable in the spike.
    </div>
  `;
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

function exportDrawer(exportResult: ExportResult): string {
  const selectedArtifactContent = getExportArtifact(exportResult, selectedArtifact);
  const warningItems =
    exportResult.compatibilityReport.warnings.length > 0
      ? exportResult.compatibilityReport.warnings
          .map((warning) => `<li>${warning.ruleId}</li>`)
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

function nodeText(nodeId: string): string {
  const node = findNode(state.doc?.renderTree, nodeId);
  return node ? compactText(node).trim() : "";
}

function syncCanvasAdapter(): void {
  canvasAdapter?.destroy();
  canvasAdapter = undefined;

  const host = appRoot.querySelector<HTMLElement>("[data-editor-host]");

  if (!host || !state.doc) {
    return;
  }

  canvasAdapter = createGrapesCanvasAdapter({
    host,
    safeHtml: getCanvasHtmlForAdapter(),
    selectedNodeId: state.selectedNodeId,
    previewWidth: state.previewWidth,
    onSelectionChange: (nodeId) => {
      if (nodeId === state.selectedNodeId) {
        return;
      }

      state = { ...state, selectedNodeId: nodeId };
      render();
    },
    onSetSelectedText: (text) => {
      state = editSelectedText(state, text);
    },
    onAddCallout: () => {
      state = insertCalloutAfterSelection(state, {
        title: "Review note",
        body: "Confirm the Confluence fragment before sharing.",
      });
    },
    onAddMaterialBlock: (blockType) => {
      state = insertMaterialBlockAfterSelection(state, blockType);
    },
  });
}

function getCanvasHtmlForAdapter(): string {
  return state.doc ? getCanvasHtml(state) : "";
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
