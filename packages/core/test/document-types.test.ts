import { describe, expect, it } from "vitest";
import type {
  CompatibilityReport,
  ExportProfile,
  NativeMappingReport,
  ProjectDoc,
  RenderNode,
  TransformationTraceEntry,
} from "../src/index.js";

describe("document model types", () => {
  it("supports a project document with export compatibility contracts", () => {
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
        originalBytesHash: "sha256-source",
        content: "<main>Imported material</main>",
        createdAt: "2026-06-20T00:00:00.000Z",
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
          nodeId: "node-root",
        },
        {
          id: "trace-2",
          stage: "export",
          message: "Prepared standalone HTML export",
          ruleId: "EXPORT_STANDALONE_HTML",
        },
      ],
      exportProfiles: [
        {
          target: "standalone-html",
          enabled: true,
        },
      ],
    };

    const compatibilityReport: CompatibilityReport = {
      target: "confluence-fragment",
      warnings: [
        {
          ruleId: "CONF-RAW-HTML",
          target: "confluence-fragment",
          severity: "warning",
          message: "Raw HTML may not map to native Confluence content.",
          recommendation: "Review the native mapping report before publishing.",
          nodeId: "node-root",
        },
      ],
    };

    const nativeMappingReport: NativeMappingReport = {
      target: "native-mapping",
      entries: [
        {
          nodeId: "node-root",
          semanticRole: "rawHtml",
          recommendedTarget: "confluence-fragment",
          expectedVisualLoss: "moderate",
          compatibilityRuleIds: ["CONF-RAW-HTML"],
          rationale: "Raw HTML is preserved as a fragment when no native macro is safe.",
        },
      ],
    };

    expect(doc.sourceArtifact.kind).toBe("html");
    expect(doc.renderTree.id).toBe("node-root");
    expect(compatibilityReport.warnings[0]?.recommendation).toContain("mapping");
    expect(nativeMappingReport.entries[0]?.semanticRole).toBe("rawHtml");
  });
});

const invalidExportProfile: ExportProfile = {
  // @ts-expect-error invalid export targets must not typecheck
  target: "native-confluence-page",
  enabled: true,
};

void invalidExportProfile;

const invalidTraceEntry: TransformationTraceEntry = {
  id: "trace-invalid",
  // @ts-expect-error transformation stages are a closed vocabulary
  stage: "publish",
  message: "Invalid stage",
};

void invalidTraceEntry;
