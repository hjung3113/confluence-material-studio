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
});
