import { describe, expect, it } from "vitest";
import type { ProjectDoc, RenderNode } from "../src/document/types.js";

describe("document model types", () => {
  it("supports a project document with render tree and import metadata", () => {
    const renderTree: RenderNode = {
      id: "node-root",
      type: "element",
      tagName: "main",
      children: [],
    };

    const doc: ProjectDoc = {
      id: "project-doc-1",
      version: 1,
      sourceArtifact: {
        id: "source-1",
        kind: "html",
        name: "source.html",
        contentHash: "sha256-source",
        importedAt: "2026-06-20T00:00:00.000Z",
      },
      sourceMeta: {
        title: "Imported material",
        language: "en",
      },
      themeTokens: {
        colors: {
          background: "#ffffff",
          text: "#111111",
          accent: "#2563eb",
        },
        fontStack: "Inter, sans-serif",
        spacingScale: "comfortable",
        radius: "8px",
        shadow: "soft",
      },
      renderTree,
      semanticOverlay: [
        {
          nodeId: "node-root",
          role: "document",
        },
      ],
      assets: [
        {
          id: "asset-1",
          sourcePath: "images/hero.png",
          mediaType: "image/png",
          contentHash: "sha256-asset",
        },
      ],
      transformationTrace: [
        {
          id: "trace-1",
          stage: "import",
          message: "Imported source artifact",
        },
      ],
      exportProfiles: [
        {
          target: "standalone-html",
          enabled: true,
        },
      ],
    };

    expect(doc.sourceArtifact.kind).toBe("html");
    expect(doc.renderTree.id).toBe("node-root");
  });
});
