import { getCompatibilityRule } from "../compatibility/rules.js";
import type {
  CompatibilityReport,
  CompatibilityWarning,
  ExportArtifact,
  ExportResult,
  NativeMappingReport,
  ProjectDoc,
} from "../document/types.js";
import { exportConfluenceFragment } from "./confluenceFragment.js";
import { exportNativeMappingReport } from "./nativeMappingReport.js";
import { exportStandaloneHtml } from "./standaloneHtml.js";

export type ExportProjectOptions = {
  generatedAt: string;
  fragmentId: string;
};

export function exportProject(
  doc: ProjectDoc,
  options: ExportProjectOptions,
): ExportResult {
  const compatibilityReport = buildCompatibilityReport(
    doc,
    options.generatedAt,
  );
  const nativeMappingArtifact = exportNativeMappingReport(
    doc,
    options.generatedAt,
  );

  return {
    compatibilityReport,
    nativeMappingReport: JSON.parse(
      nativeMappingArtifact.content,
    ) as NativeMappingReport,
    artifacts: [
      exportStandaloneHtml(doc),
      exportConfluenceFragment(doc, options.fragmentId),
      compatibilityReportArtifact(compatibilityReport),
      nativeMappingArtifact,
    ],
  };
}

function buildCompatibilityReport(
  doc: ProjectDoc,
  generatedAt: string,
): CompatibilityReport {
  return {
    documentVersion: doc.version,
    generatedAt,
    warnings: doc.transformationTrace.flatMap((entry) => {
      if (!entry.ruleId) {
        return [];
      }

      const rule = getCompatibilityRule(entry.ruleId);

      if (!rule) {
        return [];
      }

      const warning: CompatibilityWarning = {
        ruleId: rule.id,
        target: rule.target,
        severity: rule.severity,
        message: entry.message || rule.message,
        recommendation: rule.recommendation,
      };

      if (entry.nodeId) {
        warning.nodeId = entry.nodeId;
      }

      return [warning];
    }),
  };
}

function compatibilityReportArtifact(
  report: CompatibilityReport,
): ExportArtifact {
  return {
    filename: "compatibility-report.json",
    mediaType: "application/json",
    content: JSON.stringify(report, null, 2),
  };
}
