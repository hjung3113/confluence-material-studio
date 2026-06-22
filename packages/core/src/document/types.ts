import type { CompatibilityRuleId } from "../compatibility/rules.js";
import type { DocNode } from "@atlaskit/adf-schema";

export type SourceArtifactKind = "html" | "markdown" | "outline" | "template";

export type SourceArtifact = {
  id: string;
  kind: SourceArtifactKind;
  originalBytesHash: string;
  content: string;
  createdAt: string;
};

export type ThemeTokens = {
  colors: {
    background: string;
    text: string;
    accent: string;
  };
  fontStack: string;
  spacingScale: "compact" | "comfortable" | "spacious";
  radius: string;
  shadow: "none" | "soft" | "strong";
};

export type SourceMeta = {
  sourceNodeName: string;
  sourcePath: string;
};

export type RenderNode = {
  id: string;
  tag: string;
  attrs: Record<string, string>;
  classList: string[];
  inlineStyle: Record<string, string>;
  children: RenderNode[];
  text?: string;
  locked?: boolean;
  sourceMeta?: SourceMeta;
};

export type SemanticRole =
  | "document"
  | "section"
  | "title"
  | "paragraph"
  | "image"
  | "list"
  | "table"
  | "cardGrid"
  | "comparison"
  | "timeline"
  | "callout"
  | "status"
  | "panel"
  | "expand"
  | "code"
  | "canvasGroup"
  | "rawHtml";

export type ExportTarget =
  | "standalone-html"
  | "confluence-fragment"
  | "native-mapping";

export type CompatibilitySeverity = "info" | "warning" | "error";

export type CompatibilityWarning = {
  ruleId: CompatibilityRuleId;
  target: ExportTarget;
  severity: CompatibilitySeverity;
  message: string;
  recommendation: string;
  nodeId?: string;
};

export type ExpectedVisualLoss = "none" | "minor" | "material" | "unknown";

export type NativeMappingReportEntry = {
  nodeId: string;
  semanticRole: SemanticRole;
  recommendedTarget: ConfluenceMapping["recommendedTarget"];
  expectedVisualLoss: ExpectedVisualLoss;
  compatibilityRuleIds: CompatibilityRuleId[];
  rationale: string;
};

export type NativeMappingReport = {
  artifactKind: "native-mapping-report";
  documentVersion: string;
  generatedAt: string;
  isConfluencePageBody: false;
  confluenceAdfDraft?: {
    schemaSource: "@atlaskit/adf-schema";
    validation: {
      status: "valid";
      validator: "@atlaskit/adf-schema";
    };
    document: DocNode;
    mappedNodeIds: string[];
    unmappedNodeIds: string[];
  };
  mappings: NativeMappingReportEntry[];
};

export type ConfluenceMapping = {
  recommendedTarget: "native" | "macro" | "fragment" | "future-iframe";
  expectedVisualLoss: ExpectedVisualLoss;
  rationale: string;
};

export type SemanticOverlayEntry = {
  nodeId: string;
  role: SemanticRole;
  editableFields: string[];
  confluenceMapping: ConfluenceMapping;
  warnings: CompatibilityWarning[];
};

export type Asset = {
  id: string;
  kind: "image" | "font" | "stylesheet" | "script" | "embed";
  originalRef: string;
  status: "local" | "embedded" | "remote-unresolved" | "removed";
};

export type TransformationStage =
  | "import"
  | "sanitize"
  | "normalize"
  | "edit"
  | "export";

export type TransformationTraceEntry = {
  id: string;
  stage: TransformationStage;
  message: string;
  nodeId?: string;
  ruleId?: CompatibilityRuleId;
  createdAt: string;
};

export type ExportProfile = {
  id: string;
  target: ExportTarget;
  label: string;
};

export type ProjectDoc = {
  version: string;
  title: string;
  sourceArtifact?: SourceArtifact;
  themeTokens: ThemeTokens;
  renderTree: RenderNode;
  semanticOverlay: SemanticOverlayEntry[];
  assets: Asset[];
  transformationTrace: TransformationTraceEntry[];
  exportProfiles: ExportProfile[];
};

export type ExportArtifact = {
  filename:
    | "standalone.html"
    | "confluence-fragment.html"
    | "compatibility-report.json"
    | "native-mapping-report.json";
  mediaType: "text/html" | "application/json";
  content: string;
};

export type CompatibilityReport = {
  documentVersion: string;
  generatedAt: string;
  warnings: CompatibilityWarning[];
};

export type ExportResult = {
  artifacts: ExportArtifact[];
  compatibilityReport: CompatibilityReport;
  nativeMappingReport?: NativeMappingReport;
};
