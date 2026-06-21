import type {
  ExportArtifact,
  NativeMappingReport,
  ProjectDoc,
} from "../document/types.js";

export function exportNativeMappingReport(
  doc: ProjectDoc,
  generatedAt: string,
): ExportArtifact {
  const report: NativeMappingReport = {
    artifactKind: "native-mapping-report",
    documentVersion: doc.version,
    generatedAt,
    isConfluencePageBody: false,
    mappings: doc.semanticOverlay.map((entry) => ({
      nodeId: entry.nodeId,
      semanticRole: entry.role,
      recommendedTarget: entry.confluenceMapping.recommendedTarget,
      expectedVisualLoss: entry.confluenceMapping.expectedVisualLoss,
      compatibilityRuleIds: entry.warnings.map((warning) => warning.ruleId),
      rationale: entry.confluenceMapping.rationale,
    })),
  };

  return {
    filename: "native-mapping-report.json",
    mediaType: "application/json",
    content: JSON.stringify(report, null, 2),
  };
}
