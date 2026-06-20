export type SourceArtifactKind = "html" | "markdown" | "outline" | "template";

export interface SourceArtifact {
  id: string;
  kind: SourceArtifactKind;
  name: string;
  contentHash: string;
  importedAt: string;
  originalPath?: string;
  mimeType?: string;
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
  severity: CompatibilitySeverity;
  message: string;
  nodeId?: string;
  target?: ExportTarget;
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

export interface TransformationTraceEntry {
  id: string;
  stage: string;
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
  nativeMappingReport?: Record<string, unknown>;
}
