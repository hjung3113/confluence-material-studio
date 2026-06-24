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

const PREVIEW_DEVICE_WIDTHS: Record<GrapesPreviewWidth, number> = {
  desktop: 1440,
  tablet: 760,
  mobile: 390,
};
const FIT_ROOT_SELECTOR = "[data-cms-fit-root]";

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
  let previewWidth = options.previewWidth;

  registerAllowedBlocks(editor);
  registerCalloutCommand(editor, options.onAddCallout);
  setEditorPreviewWidth(editor, options.host, previewWidth);
  selectCoreNode(editor, selectedNodeId);
  const resizeObserver = observeHostResize(options.host, () => {
    fitPreviewToHost(editor, options.host, previewWidth);
    fitImportedContentToFrame(editor);
  });

  editor.on("component:selected", (component: unknown) => {
    selectedNodeId = coreNodeIdFromComponent(component);
    options.onSelectionChange(selectedNodeId);
  });

  editor.on("canvas:frame:load", () => {
    fitPreviewToHost(editor, options.host, previewWidth);
    fitImportedContentToFrame(editor);
  });

  return {
    loadSafeHtml(safeHtml, nextSelectedNodeId) {
      selectedNodeId = nextSelectedNodeId;
      editor.setComponents(wrapCanvasPreviewHtml(safeHtml));
      fitPreviewToHost(editor, options.host, previewWidth);
      fitImportedContentToFrame(editor);
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
    setPreviewWidth(nextPreviewWidth) {
      previewWidth = nextPreviewWidth;
      setEditorPreviewWidth(editor, options.host, previewWidth);
    },
    destroy() {
      resizeObserver?.disconnect();
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
    components: wrapCanvasPreviewHtml(safeHtml),
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
        html, body { min-height: 100%; background: #ffffff; }
        body { margin: 0; overflow-x: hidden; color: #172033; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
        * { box-sizing: border-box; }
        ${FIT_ROOT_SELECTOR} { transform-origin: top left; }
        main.material-sample { min-height: 620px; padding: 48px; }
        h1, h2, p { margin: revert; }
        .callout { margin: 24px 0; border-left: 4px solid #0f766e; background: #ecfdf5; padding: 14px 18px; }
      `,
    },
    deviceManager: {
      devices: [
        { id: "desktop", name: "desktop", width: `${PREVIEW_DEVICE_WIDTHS.desktop}px` },
        { id: "tablet", name: "tablet", width: "760px" },
        { id: "mobile", name: "mobile", width: "390px" },
      ],
    },
  };
}

function wrapCanvasPreviewHtml(safeHtml: string): string {
  return `<div data-cms-fit-root="true">${safeHtml}</div>`;
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
  host: HTMLElement,
  previewWidth: GrapesPreviewWidth,
): void {
  editor.setDevice(previewWidth);
  fitPreviewToHost(editor, host, previewWidth);
}

function observeHostResize(
  host: HTMLElement,
  onResize: () => void,
): ResizeObserver | undefined {
  if (typeof ResizeObserver === "undefined") {
    return undefined;
  }

  const resizeObserver = new ResizeObserver(onResize);
  resizeObserver.observe(host);
  return resizeObserver;
}

function fitPreviewToHost(
  editor: Editor,
  host: HTMLElement,
  previewWidth: GrapesPreviewWidth,
): void {
  window.requestAnimationFrame(() => {
    const targetWidth = PREVIEW_DEVICE_WIDTHS[previewWidth];
    const hostWidth = host.clientWidth;

    if (targetWidth <= 0 || hostWidth <= 0) {
      return;
    }

    const zoom = Math.min(100, Math.max(25, (hostWidth / targetWidth) * 100));
    editor.Canvas.setZoom(zoom);
    editor.refresh();
    fitImportedContentToFrame(editor);
  });
}

function fitImportedContentToFrame(editor: Editor): void {
  window.requestAnimationFrame(() => {
    const frame = editor.Canvas.getFrameEl();
    const doc = frame.contentDocument;
    const root = doc?.querySelector<HTMLElement>(FIT_ROOT_SELECTOR);

    if (!doc || !root) {
      return;
    }

    root.style.width = "";
    root.style.transform = "";
    doc.body.style.minHeight = "";

    const viewportWidth = doc.documentElement.clientWidth;
    const naturalWidth = Math.max(root.scrollWidth, root.offsetWidth);

    if (viewportWidth <= 0 || naturalWidth <= 0) {
      return;
    }

    const scale = Math.min(1.25, Math.max(0.25, viewportWidth / naturalWidth));
    root.style.width = `${naturalWidth}px`;
    root.style.transform = `scale(${scale})`;
    doc.body.style.minHeight = `${root.scrollHeight * scale}px`;
  });
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
