import { describe, expect, it } from "vitest";
import type {
  CompatibilityReport,
  CompatibilityWarning,
  ExportArtifact,
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
      tag: "main",
      attrs: {
        "data-source": "imported",
      },
      classList: ["deck"],
      inlineStyle: {
        display: "grid",
      },
      children: [
        {
          id: "node-title",
          tag: "h1",
          attrs: {},
          classList: ["title"],
          inlineStyle: {},
          children: [],
          text: "Imported material",
          sourceMeta: {
            sourceNodeName: "h1",
            sourcePath: "html.body.main.h1",
          },
        },
      ],
    };

    const doc: ProjectDoc = {
      version: "1",
      title: "Imported material",
      sourceArtifact: {
        id: "source-1",
        kind: "html",
        originalBytesHash: "sha256-source",
        content: "<main>Imported material</main>",
        createdAt: "2026-06-20T00:00:00.000Z",
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
          editableFields: ["text", "style"],
          confluenceMapping: {
            recommendedTarget: "fragment",
            expectedVisualLoss: "minor",
            rationale: "The root document maps cleanly to a fragment wrapper.",
          },
          warnings: [],
        },
      ],
      assets: [
        {
          id: "asset-1",
          kind: "image",
          originalRef: "images/hero.png",
          status: "local",
        },
      ],
      transformationTrace: [
        {
          id: "trace-1",
          stage: "import",
          message: "Imported source artifact",
          nodeId: "node-root",
          createdAt: "2026-06-20T00:00:01.000Z",
        },
        {
          id: "trace-2",
          stage: "export",
          message: "Prepared standalone HTML export",
          ruleId: "HTML_REMOTE_RESOURCE",
          createdAt: "2026-06-20T00:00:02.000Z",
        },
      ],
      exportProfiles: [
        {
          id: "profile-standalone",
          target: "standalone-html",
          label: "Standalone HTML",
        },
      ],
    };

    const compatibilityReport: CompatibilityReport = {
      documentVersion: "1",
      generatedAt: "2026-06-20T00:00:03.000Z",
      warnings: [
        {
          ruleId: "CF_FRAGMENT_OVERFLOW_RISK",
          target: "confluence-fragment",
          severity: "warning",
          message: "Raw HTML may not map to native Confluence content.",
          recommendation: "Review the native mapping report before publishing.",
          nodeId: "node-root",
        },
      ],
    };

    const artifact: ExportArtifact = {
      filename: "compatibility-report.json",
      mediaType: "application/json",
      content: JSON.stringify(compatibilityReport),
    };

    const nativeMappingReport: NativeMappingReport = {
      artifactKind: "native-mapping-report",
      documentVersion: "1",
      generatedAt: "2026-06-20T00:00:03.000Z",
      isConfluencePageBody: false,
      mappings: [
        {
          nodeId: "node-root",
          semanticRole: "rawHtml",
          recommendedTarget: "fragment",
          expectedVisualLoss: "material",
          compatibilityRuleIds: ["CF_NATIVE_UNMAPPED_LAYOUT"],
          rationale: "Raw HTML is preserved as a fragment when no native macro is safe.",
        },
      ],
    };

    expect(doc.sourceArtifact?.kind).toBe("html");
    expect(doc.renderTree.id).toBe("node-root");
    expect(doc.renderTree.tag).toBe("main");
    expect(doc.exportProfiles[0]?.label).toBe("Standalone HTML");
    expect(artifact.filename).toBe("compatibility-report.json");
    expect(compatibilityReport.warnings[0]?.recommendation).toContain("mapping");
    expect(nativeMappingReport.mappings[0]?.semanticRole).toBe("rawHtml");
  });
});

const invalidExportProfile: ExportProfile = {
  id: "profile-invalid",
  // @ts-expect-error invalid export targets must not typecheck
  target: "native-confluence-page",
  label: "Invalid export",
};

void invalidExportProfile;

const invalidTraceEntry: TransformationTraceEntry = {
  id: "trace-invalid",
  // @ts-expect-error transformation stages are a closed vocabulary
  stage: "publish",
  message: "Invalid stage",
  createdAt: "2026-06-20T00:00:04.000Z",
};

void invalidTraceEntry;

const invalidRuleWarning: CompatibilityWarning = {
  // @ts-expect-error compatibility warnings must use catalog rule IDs
  ruleId: "CONF-RAW-HTML",
  target: "confluence-fragment",
  severity: "warning",
  message: "Invalid rule id.",
  recommendation: "Use a catalog rule id.",
};

void invalidRuleWarning;

const invalidTraceRuleId: TransformationTraceEntry = {
  id: "trace-invalid-rule",
  stage: "export",
  message: "Invalid trace rule id.",
  // @ts-expect-error trace rule IDs must use the compatibility catalog
  ruleId: "EXPORT_STANDALONE_HTML",
  createdAt: "2026-06-20T00:00:05.000Z",
};

void invalidTraceRuleId;

const invalidNativeMappingReport: NativeMappingReport = {
  artifactKind: "native-mapping-report",
  documentVersion: "1",
  generatedAt: "2026-06-20T00:00:06.000Z",
  isConfluencePageBody: false,
  mappings: [
    {
      nodeId: "node-root",
      semanticRole: "rawHtml",
      recommendedTarget: "fragment",
      // @ts-expect-error native mapping visual loss uses the shared Confluence vocabulary
      expectedVisualLoss: "significant",
      compatibilityRuleIds: ["CF_NATIVE_VISUAL_LOSS"],
      rationale: "Old drifted vocabulary must be rejected.",
    },
  ],
};

void invalidNativeMappingReport;
