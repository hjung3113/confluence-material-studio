# Render Tree and Semantic Overlay

## Source of Truth

The persisted source of truth is `ProjectDoc`. It stores both the original import source and the editable normalized document.

```ts
type ProjectDoc = {
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
```

## Immutable Source Artifact

`sourceArtifact` preserves the imported input for fallback and visual comparison.

```ts
type SourceArtifact = {
  id: string;
  kind: "html" | "markdown" | "outline" | "template";
  originalBytesHash: string;
  content: string;
  createdAt: string;
};
```

Rules:

- Import must not overwrite `sourceArtifact`.
- A project created from HTML must be able to export or display the untouched original.
- Tests should compare imported render output against `sourceArtifact` fixtures.

## Render Node

The render tree preserves HTML-like output structure.

```ts
type RenderNode = {
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
```

Rules:

- Every node has a stable `id`.
- Standalone HTML export depends on `renderTree`, not semantic overlay.
- Unknown structures should remain renderable or be reported.
- Locked nodes may be displayed and exported while exposing fewer edit controls.

## Semantic Overlay

Semantic overlay powers editor controls and Confluence mapping.

```ts
type SemanticOverlayEntry = {
  nodeId: string;
  role: SemanticRole;
  editableFields: string[];
  confluenceMapping: ConfluenceMapping;
  warnings: CompatibilityWarning[];
};
```

Rules:

- Semantic overlay is optional for standalone export.
- Native mapping report depends on semantic overlay.
- Failed semantic recognition must not delete render tree content.

## Transformation Trace

Every import and export transformation records a trace entry.

```ts
type TransformationTraceEntry = {
  id: string;
  stage: "import" | "sanitize" | "normalize" | "edit" | "export";
  ruleId?: string;
  nodeId?: string;
  message: string;
  createdAt: string;
};
```

Trace entries make importer changes auditable and support compatibility reports.

## Versioning

- `ProjectDoc.version` changes when persisted shape changes.
- Migrations must be deterministic and tested with fixture documents.
- Export adapters must reject unsupported document versions instead of guessing.

