import {
  grapesjs,
  type Component,
  type Editor,
  type EditorConfig,
} from "grapesjs";
import type { MaterialBlockType } from "@htmleditor/core";
import "grapesjs/dist/css/grapes.min.css";
import { getAllowedBlockDefinitions } from "./blockPalette.js";

export type GrapesPreviewWidth = "desktop" | "tablet" | "mobile";

export type GrapesCanvasAdapterOptions = {
  host: HTMLElement;
  safeHtml: string;
  selectedNodeId: string | undefined;
  previewWidth: GrapesPreviewWidth;
  onSelectionChange: (nodeId: string | undefined) => void;
  onAddCallout: () => void;
  onAddMaterialBlock: (blockType: MaterialBlockType) => void;
  onSetSelectedText?: (text: string) => void;
};

export type GrapesCanvasAdapter = {
  loadSafeHtml: (safeHtml: string, selectedNodeId: string | undefined) => void;
  getSelectedNodeId: () => string | undefined;
  setSelectedText: (text: string) => void;
  addCallout: () => void;
  addMaterialBlock: (blockType: MaterialBlockType) => void;
  setPreviewWidth: (previewWidth: GrapesPreviewWidth) => void;
  destroy: () => void;
};

export function createGrapesCanvasAdapter(
  options: GrapesCanvasAdapterOptions,
): GrapesCanvasAdapter {
  const editor = grapesjs.init(
    buildGrapesEditorConfig(options.host, options.safeHtml),
  );
  let selectedNodeId = options.selectedNodeId;

  registerAllowedBlocks(editor);
  registerCalloutCommand(editor, options.onAddCallout);
  setEditorPreviewWidth(editor, options.previewWidth);
  selectCoreNode(editor, selectedNodeId);

  editor.on("component:selected", (component: unknown) => {
    selectedNodeId = coreNodeIdFromComponent(component);
    options.onSelectionChange(selectedNodeId);
  });

  return {
    loadSafeHtml(safeHtml, nextSelectedNodeId) {
      selectedNodeId = nextSelectedNodeId;
      editor.setComponents(safeHtml);
      selectCoreNode(editor, selectedNodeId);
    },
    getSelectedNodeId() {
      return selectedNodeId;
    },
    setSelectedText(text) {
      options.onSetSelectedText?.(text);
    },
    addCallout() {
      editor.runCommand("cms:add-callout");
    },
    addMaterialBlock(blockType) {
      options.onAddMaterialBlock(blockType);
    },
    setPreviewWidth(previewWidth) {
      setEditorPreviewWidth(editor, previewWidth);
    },
    destroy() {
      editor.destroy();
    },
  };
}

export function buildGrapesEditorConfig(
  host: HTMLElement,
  safeHtml: string,
): EditorConfig {
  return {
    container: host,
    components: safeHtml,
    height: "100%",
    width: "100%",
    telemetry: false,
    cssIcons: "",
    storageManager: false,
    noticeOnUnload: false,
    showDevices: false,
    showOffsets: false,
    showToolbar: false,
    fromElement: false,
    panels: { defaults: [] },
    blockManager: { blocks: [] },
    layerManager: {},
    styleManager: { sectors: [] },
    selectorManager: { componentFirst: true },
    canvas: {
      scripts: [],
      styles: [],
      frameStyle: `
        body { margin: 0; color: #172033; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
        * { box-sizing: border-box; }
        main.material-sample { min-height: 620px; padding: 48px; }
        h1, h2, p { margin: revert; }
        .callout { margin: 24px 0; border-left: 4px solid #0f766e; background: #ecfdf5; padding: 14px 18px; }
      `,
    },
    deviceManager: {
      devices: [
        { id: "desktop", name: "desktop", width: "" },
        { id: "tablet", name: "tablet", width: "760px" },
        { id: "mobile", name: "mobile", width: "390px" },
      ],
    },
  };
}

function registerAllowedBlocks(editor: Editor): void {
  const blocks = editor.Blocks;
  blocks.getAll().reset();

  for (const block of getAllowedBlockDefinitions()) {
    blocks.add(block.id, {
      label: block.label,
      category: block.category,
      content: block.content,
    });
  }
}

function registerCalloutCommand(editor: Editor, onAddCallout: () => void): void {
  editor.Commands.add("cms:add-callout", {
    run() {
      onAddCallout();
    },
  });
}

function setEditorPreviewWidth(
  editor: Editor,
  previewWidth: GrapesPreviewWidth,
): void {
  editor.setDevice(previewWidth);
}

function selectCoreNode(
  editor: Editor,
  nodeId: string | undefined,
): void {
  if (!nodeId) {
    return;
  }

  const component = findComponentByCoreNodeId(editor, nodeId);

  if (component) {
    editor.select(component);
  }
}

function findComponentByCoreNodeId(
  editor: Editor,
  nodeId: string,
): Component | undefined {
  const wrapper = editor.getWrapper();
  return wrapper?.find(`[data-core-node-id="${nodeId}"]`)?.[0];
}

function coreNodeIdFromComponent(component: unknown): string | undefined {
  let current = component as
    | {
        getAttributes?: () => Record<string, string | undefined>;
        parent?: () => unknown;
      }
    | undefined;

  while (current) {
    const nodeId = current.getAttributes?.()["data-core-node-id"];

    if (nodeId) {
      return nodeId;
    }

    current = current.parent?.() as typeof current;
  }

  return undefined;
}
