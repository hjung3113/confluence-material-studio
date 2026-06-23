import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  createGrapesCanvasAdapter,
  buildGrapesEditorConfig,
  type GrapesCanvasAdapter,
} from "../src/editor/grapesAdapter.js";
import {
  allowedBlockLabels,
  forbiddenBuilderLabels,
  getAllowedBlockDefinitions,
} from "../src/editor/blockPalette.js";

describe("GrapesJS canvas adapter boundary", () => {
  it("registers only the constrained material blocks", () => {
    expect(allowedBlockLabels()).toEqual([
      "Title",
      "Paragraph",
      "Callout / Note",
      "Divider",
    ]);

    const blocks = getAllowedBlockDefinitions();

    expect(blocks.map((block) => block.id)).toEqual([
      "cms-title",
      "cms-paragraph",
      "cms-callout",
      "cms-divider",
    ]);
    expect(blocks.map((block) => block.category)).toEqual([
      "Material",
      "Material",
      "Material",
      "Material",
    ]);
    expect(forbiddenBuilderLabels()).toEqual([
      "Ecommerce",
      "Script widget",
      "Remote asset widget",
      "Publish to Confluence",
    ]);
  });

  it("builds GrapesJS with sanitized preview HTML and generic builder surfaces disabled", () => {
    const config = buildGrapesEditorConfig(
      {} as HTMLElement,
      '<main><h1 data-core-node-id="node-1">Safe</h1></main>',
    );

    expect(config.components).toContain('data-core-node-id="node-1"');
    expect(config.telemetry).toBe(false);
    expect(config.cssIcons).toBe("");
    expect(config.storageManager).toBe(false);
    expect(config.canvas).toMatchObject({ scripts: [], styles: [] });
    expect(config.panels).toEqual({ defaults: [] });
    expect(config.blockManager).toEqual({ blocks: [] });
  });

  it("keeps the raw GrapesJS editor object behind the adapter API", () => {
    const adapterKeys = [
      "loadSafeHtml",
      "getSelectedNodeId",
      "setSelectedText",
      "addCallout",
      "addMaterialBlock",
      "setPreviewWidth",
      "destroy",
    ] satisfies Array<keyof GrapesCanvasAdapter>;

    expect(adapterKeys).not.toContain("editor" as keyof GrapesCanvasAdapter);
    expect(createGrapesCanvasAdapter).toBeTypeOf("function");
  });

  it("keeps the app entrypoint behind a lazy adapter import", () => {
    const mainSource = readFileSync(
      fileURLToPath(new URL("../src/main.ts", import.meta.url)),
      "utf8",
    );

    expect(mainSource).toContain('import("./editor/grapesAdapter.js")');
    expect(mainSource).toContain(
      'import type { GrapesCanvasAdapter } from "./editor/grapesAdapter.js";',
    );
    expect(mainSource).not.toContain("createGrapesCanvasAdapter,\n  type");
  });

  it("routes add controls through the core app model before the lazy canvas is ready", () => {
    const mainSource = readFileSync(
      fileURLToPath(new URL("../src/main.ts", import.meta.url)),
      "utf8",
    );

    expect(mainSource).not.toContain("canvasAdapter?.addCallout()");
    expect(mainSource).not.toContain("canvasAdapter?.addMaterialBlock");
    expect(mainSource).toContain("insertReviewCalloutAfterSelection()");
    expect(mainSource).toContain("insertBlockAfterSelection(");
  });

  it("handles lazy canvas load failures with visible state and no unhandled rejection", () => {
    const mainSource = readFileSync(
      fileURLToPath(new URL("../src/main.ts", import.meta.url)),
      "utf8",
    );

    expect(mainSource).toContain("canvasLoadStatus");
    expect(mainSource).toContain("canvasLoadError");
    expect(mainSource).toContain(".catch((error: unknown)");
    expect(mainSource).toContain('class="canvas-error"');
  });
});
