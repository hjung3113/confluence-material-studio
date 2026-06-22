import {
  createAppState,
  deleteSelectedSection,
  duplicateSelectedSection,
  editSelectedText,
  exportCurrentProject,
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
import "./styles.css";

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
  const macroRoles =
    exportResult?.nativeMappingReport?.mappings
      .filter((mapping) => mapping.recommendedTarget === "macro")
      .map((mapping) => mapping.semanticRole) ?? [];

  appRoot.innerHTML = `
    <main class="studio-shell">
      <aside class="source-panel">
        <h1>Confluence Material Studio</h1>
        <label>
          Source fixture
          <select data-action="fixture">
            <option value="confluence">Confluence friendly</option>
            <option value="markdown">Markdown outline</option>
            <option value="hostile">Hostile HTML</option>
          </select>
        </label>
        <h2>Sections</h2>
        <nav class="section-list" aria-label="Section navigator">
          ${
            sections.length > 0
              ? sections
                  .map(
                    (section, index) =>
                      `<button data-action="select-section" data-node-id="${section.id}">Section ${index + 1}</button>`,
                  )
                  .join("")
              : "<p>No sections detected.</p>"
          }
        </nav>
      </aside>
      <section class="canvas-panel">
        <div class="toolbar" aria-label="Preview widths">
          ${previewButton("desktop")}
          ${previewButton("tablet")}
          ${previewButton("mobile")}
        </div>
        <div class="canvas canvas-${state.previewWidth}" aria-label="Live canvas">
          ${state.doc ? renderTreeToHtml(state.doc.renderTree) : ""}
        </div>
      </section>
      <aside class="inspector-panel">
        <h2>Inspector</h2>
        <label>
          Inline text
          <input data-action="text" value="">
        </label>
        <label>
          Accent
          <input data-action="accent" type="color" value="${state.doc?.themeTokens.colors.accent ?? "#2563eb"}">
        </label>
        <div class="button-row">
          <button data-action="select-title">Select title</button>
          <button data-action="move-down">Move section down</button>
          <button data-action="duplicate">Duplicate section</button>
          <button data-action="delete">Delete section</button>
        </div>
        <h2>Export artifacts</h2>
        <ul>${exportResult?.artifacts
          .map((artifact) => `<li>${artifact.filename}</li>`)
          .join("")}</ul>
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

  const fixtureSelect =
    appRoot.querySelector<HTMLSelectElement>('[data-action="fixture"]');

  if (fixtureSelect) {
    fixtureSelect.value = currentFixtureKey();
  }

  bindEvents();
}

function bindEvents(): void {
  appRoot.querySelector('[data-action="fixture"]')?.addEventListener(
    "change",
    (event) => {
      const value = (event.target as HTMLSelectElement).value;
      state = importFixture(state, getFixture(value));
      render();
    },
  );

  appRoot.querySelector('[data-action="select-title"]')?.addEventListener(
    "click",
    () => {
      state = selectNodeByRole(state, "title");
      render();
    },
  );

  appRoot
    .querySelector('[data-action="text"]')
    ?.addEventListener("change", (event) => {
      state = editSelectedText(state, (event.target as HTMLInputElement).value);
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

function currentFixtureKey(): string {
  const title = state.doc?.title;

  if (title === "Product Outline") return "markdown";
  if (title === "Hostile Import") return "hostile";
  return "confluence";
}

function getFixture(key: string): ImportFixtureInput {
  return demoFixtures[key] ?? demoFixtures.confluence!;
}

function getAppRoot(): HTMLDivElement {
  const root = document.querySelector<HTMLDivElement>("#app");

  if (!root) {
    throw new Error("Missing #app root.");
  }

  return root;
}
