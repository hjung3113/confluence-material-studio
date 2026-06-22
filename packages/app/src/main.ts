import {
  createAppState,
  deleteSelectedSection,
  duplicateSelectedSection,
  editSelectedText,
  exportCurrentProject,
  getExportArtifact,
  getSelectedText,
  importFixture,
  listSections,
  reorderSelectedSection,
  selectNodeByRole,
  setPreviewWidth,
  updateThemeColor,
  type AppState,
  type ImportFixtureInput,
  type PreviewWidth,
} from "./appModel.js";
import { renderTreeToHtml } from "./renderTree.js";
import type { RenderNode } from "@htmleditor/core";
import "./styles.css";

const artifactFilenames = [
  "standalone.html",
  "confluence-fragment.html",
  "compatibility-report.json",
  "native-mapping-report.json",
];

const demoFixtures: Record<string, ImportFixtureInput> = {
  confluence: {
    kind: "html",
    title: "Confluence Friendly",
    content:
      '<!doctype html><main class="page-shell"><section><h1>Release Readiness</h1><p>All export targets need explicit compatibility evidence.</p><p class="status-pill">On track</p></section><aside class="callout" data-confluence-macro="note"><h2>Migration note</h2><p>Macro output is represented as a mapping report.</p></aside><details class="expand"><summary>Smoke test evidence</summary><pre><code>npm run verify</code></pre></details><style>body{margin:0}.page-shell{overflow-x:auto}.hero{min-height:60vh}.floating-review{position:fixed}.wide-panel{width:1200px}</style></main>',
  },
  markdown: {
    kind: "markdown",
    title: "Product Outline",
    content:
      "# Quarterly Product Review\n\n## Goals\n\nAlign product, engineering, and support around the next release.\n\n- Reduce onboarding friction\n- Improve Confluence handoff quality\n\n## Next Steps\n\n1. Review fixture evidence\n2. Confirm Confluence fragment behavior",
  },
  hostile: {
    kind: "html",
    title: "Hostile Import",
    content:
      '<main><h1 onclick="alert(1)">Unsafe</h1><script>alert("x")</script><img src="https://assets.example.com/remote.png"><a href="javascript:alert(1)">bad</a></main>',
  },
};

let draftTitle = "Release Readiness";
let draftContent = demoFixtures.confluence!.content;
let selectedArtifact = "standalone.html";

let state: AppState = importFixture(
  createAppState({
    now: "2026-06-22T00:00:00.000Z",
    generatedAt: "2026-06-22T00:00:00.000Z",
  }),
  getFixture("confluence"),
);

const appRoot = getAppRoot();

render();

function render(): void {
  const exportResult = state.doc ? exportCurrentProject(state) : undefined;
  const sections = state.doc ? listSections(state.doc) : [];
  const selectedText = getSelectedText(state);
  const macroRoles =
    exportResult?.nativeMappingReport?.mappings
      .filter((mapping) => mapping.recommendedTarget === "macro")
      .map((mapping) => mapping.semanticRole) ?? [];

  const selectedArtifactContent = exportResult
    ? getExportArtifact(exportResult, selectedArtifact)
    : "";

  appRoot.innerHTML = `
    <main class="studio-shell">
      <aside class="source-panel" aria-label="HTML draft source">
        <div class="brand-block">
          <h1>Confluence Material Studio</h1>
          <p>Import an HTML draft, edit text, then inspect export output.</p>
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
        <button class="primary-action" data-action="import-draft">Import HTML draft</button>
        <div class="example-row" aria-label="Load examples">
          <button data-action="load-example" data-fixture="confluence">HTML example</button>
          <button data-action="load-example" data-fixture="markdown">Markdown</button>
          <button data-action="load-example" data-fixture="hostile">Hostile</button>
        </div>
        <h2>Sections</h2>
        <nav class="section-list" aria-label="Section navigator">
          ${
            sections.length > 0
              ? sections
                  .map(
                    (section, index) =>
                      `<button class="${state.selectedNodeId === section.id ? "active" : ""}" data-action="select-section" data-node-id="${section.id}">Section ${index + 1}<span>${escapeHtml(
                        nodeLabel(section),
                      )}</span></button>`,
                  )
                  .join("")
              : "<p>No sections detected.</p>"
          }
        </nav>
      </aside>
      <section class="canvas-panel">
        <div class="workspace-topbar">
          <div>
            <h2>Live canvas</h2>
            <p>${escapeHtml(state.doc?.title ?? "No document imported")}</p>
          </div>
          <div class="toolbar" aria-label="Preview widths">
            ${previewButton("desktop")}
            ${previewButton("tablet")}
            ${previewButton("mobile")}
          </div>
        </div>
        <div class="canvas canvas-${state.previewWidth}" aria-label="Live canvas">
          ${state.doc ? renderTreeToHtml(state.doc.renderTree) : ""}
        </div>
      </section>
      <aside class="inspector-panel">
        <h2>Inspector</h2>
        <p class="selected-node">Selected: ${escapeHtml(
          state.selectedNodeId ?? "none",
        )}</p>
        <label>
          Selected text
          <textarea class="text-edit" data-action="text">${escapeHtml(
            selectedText,
          )}</textarea>
        </label>
        <button class="primary-action" data-action="apply-text">Apply text</button>
        <label>
          Accent
          <input data-action="accent" type="color" value="${state.doc?.themeTokens.colors.accent ?? "#2563eb"}">
        </label>
        <div class="button-row">
          <button data-action="select-title">Select title</button>
          <button data-action="move-up">Move section up</button>
          <button data-action="move-down">Move section down</button>
          <button data-action="duplicate">Duplicate section</button>
          <button data-action="delete">Delete section</button>
        </div>
        <h2>Export artifacts</h2>
        <div class="artifact-tabs" aria-label="Export artifact selector">
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
        <ul>
          ${
            exportResult && exportResult.compatibilityReport.warnings.length > 0
              ? exportResult.compatibilityReport.warnings
                  .map((warning) => `<li>${warning.ruleId}</li>`)
                  .join("")
              : "<li>No warnings</li>"
          }
        </ul>
        <h2>Macro candidates</h2>
        <p>${macroRoles.length > 0 ? macroRoles.join(", ") : "None"}</p>
      </aside>
    </main>
  `;

  bindEvents();
}

function bindEvents(): void {
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

  appRoot
    .querySelector('[data-action="import-draft"]')
    ?.addEventListener("click", () => {
      state = importFixture(state, {
        kind: "html",
        title: draftTitle.trim() || "Untitled HTML Draft",
        content: draftContent,
      });
      selectedArtifact = "standalone.html";
      render();
    });

  appRoot
    .querySelectorAll<HTMLButtonElement>('[data-action="load-example"]')
    .forEach((button) => {
      button.addEventListener("click", () => {
        const fixture = getFixture(button.dataset.fixture ?? "confluence");
        draftTitle = fixture.title;
        draftContent = fixture.content;
        state = importFixture(state, fixture);
        selectedArtifact = "standalone.html";
        render();
      });
    });

  appRoot.querySelector('[data-action="select-title"]')?.addEventListener(
    "click",
    () => {
      state = selectNodeByRole(state, "title");
      render();
    },
  );

  appRoot
    .querySelector('[data-action="apply-text"]')
    ?.addEventListener("click", () => {
      const textField =
        appRoot.querySelector<HTMLTextAreaElement>('[data-action="text"]');
      state = editSelectedText(state, textField?.value ?? "");
      render();
    });

  appRoot.querySelector('[data-action="accent"]')?.addEventListener(
    "change",
    (event) => {
      state = updateThemeColor(
        state,
        "accent",
        (event.target as HTMLInputElement).value,
      );
      render();
    },
  );

  appRoot
    .querySelector('[data-action="move-up"]')
    ?.addEventListener("click", () => {
      state = reorderSelectedSection(state, "up");
      render();
    });

  appRoot
    .querySelector('[data-action="move-down"]')
    ?.addEventListener("click", () => {
      state = reorderSelectedSection(state, "down");
      render();
    });

  appRoot
    .querySelector('[data-action="duplicate"]')
    ?.addEventListener("click", () => {
      state = duplicateSelectedSection(state);
      render();
    });

  appRoot.querySelector('[data-action="delete"]')?.addEventListener("click", () => {
    state = deleteSelectedSection(state);
    render();
  });

  appRoot
    .querySelectorAll<HTMLButtonElement>("[data-preview]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        state = setPreviewWidth(state, button.dataset.preview as PreviewWidth);
        render();
      });
    });

  appRoot
    .querySelectorAll<HTMLButtonElement>('[data-action="artifact"]')
    .forEach((button) => {
      button.addEventListener("click", () => {
        selectedArtifact = button.dataset.filename ?? "standalone.html";
        render();
      });
    });

  appRoot
    .querySelectorAll<HTMLButtonElement>('[data-action="select-section"]')
    .forEach((button) => {
      button.addEventListener("click", () => {
        state = { ...state, selectedNodeId: button.dataset.nodeId };
        render();
      });
    });
}

function previewButton(width: PreviewWidth): string {
  const active = state.previewWidth === width ? "active" : "";
  return `<button class="${active}" data-preview="${width}">${width}</button>`;
}

function getFixture(key: string): ImportFixtureInput {
  return demoFixtures[key] ?? demoFixtures.confluence!;
}

function nodeLabel(node: RenderNode): string {
  const text = compactText(node).trim();

  return text ? text.slice(0, 44) : node.tag;
}

function compactText(node: RenderNode): string {
  if (node.tag === "#text") {
    return node.text ?? "";
  }

  return node.children.map((child) => compactText(child)).join(" ");
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
