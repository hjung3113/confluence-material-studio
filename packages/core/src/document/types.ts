export type SourceArtifactKind = "html" | "markdown" | "outline" | "template";

export interface SourceArtifact {
  id: string;
  kind: SourceArtifactKind;
  originalBytesHash: string;
  content: string;
  createdAt: string;
}

export interface ThemeTokens {
  colors: {
    background: string;
    text: string;
    accent: string;
  };
  fontStack: string;
  spacingScale: "compact" | "comfortable" | "spacious";
  radius: string;
  shadow: "none" | "soft" | "strong";
}

export interface SourceMeta {
  title?: string;
  description?: string;
  author?: string;
  language?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RenderNode {
  id: string;
  type: "element" | "text" | "asset" | "fragment";
  tagName?: string;
  textContent?: string;
  attributes?: Record<string, string>;
  styles?: Record<string, string>;
  assetId?: string;
  children: RenderNode[];
}

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

export interface CompatibilityWarning {
  ruleId: string;
  target: ExportTarget;
  severity: CompatibilitySeverity;
  message: string;
  recommendation: string;
  nodeId?: string;
}

export type NativeMappingExpectedVisualLoss =
  | "none"
  | "minor"
  | "moderate"
  | "significant"
  | "unsupported";

export interface NativeMappingReportEntry {
  nodeId: string;
  semanticRole: SemanticRole;
  recommendedTarget: ExportTarget;
  expectedVisualLoss: NativeMappingExpectedVisualLoss;
  compatibilityRuleIds: string[];
  rationale: string;
}

export interface NativeMappingReport {
  target: "native-mapping";
  entries: NativeMappingReportEntry[];
}

export interface ConfluenceMapping {
  target: "native-mapping";
  macroName?: string;
  nodeType?: string;
  parameters?: Record<string, string>;
  unsupportedReason?: string;
}

export interface SemanticOverlayEntry {
  nodeId: string;
  role: SemanticRole;
  label?: string;
  metadata?: Record<string, unknown>;
  confluenceMapping?: ConfluenceMapping;
}

export interface Asset {
  id: string;
  sourcePath?: string;
  fileName?: string;
  mediaType: string;
  contentHash: string;
  dataUri?: string;
  altText?: string;
}

export type TransformationStage =
  | "import"
  | "sanitize"
  | "normalize"
  | "edit"
  | "export";

export interface TransformationTraceEntry {
  id: string;
  stage: TransformationStage;
  message: string;
  nodeId?: string;
  ruleId?: string;
  severity?: CompatibilitySeverity;
  timestamp?: string;
}

export interface ExportProfile {
  target: ExportTarget;
  enabled: boolean;
  options?: Record<string, unknown>;
}

export interface ProjectDoc {
  id: string;
  version: number;
  sourceArtifact: SourceArtifact;
  sourceMeta?: SourceMeta;
  themeTokens: ThemeTokens;
  renderTree: RenderNode;
  semanticOverlay: SemanticOverlayEntry[];
  assets: Asset[];
  transformationTrace: TransformationTraceEntry[];
  exportProfiles: ExportProfile[];
}

export interface ExportArtifact {
  target: ExportTarget;
  fileName: string;
  contentType: string;
  content: string;
}

export interface CompatibilityReport {
  target: ExportTarget;
  warnings: CompatibilityWarning[];
}

export interface ExportResult {
  artifacts: ExportArtifact[];
  compatibilityReport: CompatibilityReport;
  nativeMappingReport?: NativeMappingReport;
}
