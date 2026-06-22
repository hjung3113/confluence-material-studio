import {
  parseFragment,
  type DefaultTreeAdapterTypes,
} from "parse5";
import { hashContent } from "../document/hash.js";
import type {
  CompatibilityWarning,
  ConfluenceMapping,
  ProjectDoc,
  RenderNode,
  SemanticOverlayEntry,
  SemanticRole,
  ThemeTokens,
  TransformationTraceEntry,
} from "../document/types.js";
import { sanitizeHtml } from "../sanitize/sanitizeHtml.js";

export type ImportHtmlInput = {
  html: string;
  title: string;
  now: string;
};

const DEFAULT_THEME_TOKENS: ThemeTokens = {
  colors: {
    background: "#ffffff",
    text: "#111111",
    accent: "#2563eb",
  },
  fontStack: "Inter, system-ui, sans-serif",
  spacingScale: "comfortable",
  radius: "8px",
  shadow: "soft",
};

export function importHtml(input: ImportHtmlInput): ProjectDoc {
  const sanitized = sanitizeHtml(input.html);
  const fragment = parseFragment(sanitized.html);
  const sequence = { value: 0 };
  const renderTree = renderNodeFromParent(fragment, "document", sequence);

  return {
    version: "0.1.0",
    title: input.title,
    sourceArtifact: {
      id: "source-1",
      kind: "html",
      originalBytesHash: hashContent(input.html),
      content: input.html,
      createdAt: input.now,
    },
    themeTokens: DEFAULT_THEME_TOKENS,
    renderTree,
    semanticOverlay: collectOverlay(renderTree),
    assets: [],
    transformationTrace: [
      {
        id: "trace-import-1",
        stage: "import",
        message: "Imported static HTML into ProjectDoc render tree.",
        createdAt: input.now,
      },
      ...traceFromWarnings(sanitized.warnings, input.now),
    ],
    exportProfiles: [
      {
        id: "profile-standalone",
        target: "standalone-html",
        label: "Standalone HTML",
      },
      {
        id: "profile-fragment",
        target: "confluence-fragment",
        label: "Confluence Fragment",
      },
      {
        id: "profile-native-report",
        target: "native-mapping",
        label: "Native Mapping Report",
      },
    ],
  };
}

function renderNodeFromParent(
  parent: DefaultTreeAdapterTypes.ParentNode,
  sourcePath: string,
  sequence: { value: number },
): RenderNode {
  return {
    id: nextNodeId(sequence),
    tag: "document",
    attrs: {},
    classList: [],
    inlineStyle: {},
    children: renderChildren(parent.childNodes, sourcePath, sequence),
    sourceMeta: {
      sourceNodeName: "document",
      sourcePath,
    },
  };
}

function renderChildren(
  children: DefaultTreeAdapterTypes.ChildNode[],
  sourcePath: string,
  sequence: { value: number },
): RenderNode[] {
  return children.flatMap((child, index) => {
    const renderNode = renderNodeFromChild(
      child,
      `${sourcePath}/${nodeName(child)}[${index}]`,
      sequence,
    );
    return renderNode ? [renderNode] : [];
  });
}

function renderNodeFromChild(
  child: DefaultTreeAdapterTypes.ChildNode,
  sourcePath: string,
  sequence: { value: number },
): RenderNode | undefined {
  if (isTextNode(child)) {
    if (!child.value.trim()) {
      return undefined;
    }

    return {
      id: nextNodeId(sequence),
      tag: "#text",
      attrs: {},
      classList: [],
      inlineStyle: {},
      children: [],
      text: child.value,
      sourceMeta: {
        sourceNodeName: "#text",
        sourcePath,
      },
    };
  }

  if (!isElement(child)) {
    return undefined;
  }

  const attrs = attrsToRecord(child.attrs);
  const classList = parseClassList(attrs.class);
  const inlineStyle = parseInlineStyle(attrs.style);
  const node: RenderNode = {
    id: nextNodeId(sequence),
    tag: child.tagName.toLowerCase(),
    attrs,
    classList,
    inlineStyle,
    children: renderChildren(child.childNodes, sourcePath, sequence),
    sourceMeta: {
      sourceNodeName: child.tagName.toLowerCase(),
      sourcePath,
    },
  };

  if (node.tag === "style" || node.tag === "svg" || node.tag === "use") {
    node.locked = true;
  }

  return node;
}

function nextNodeId(sequence: { value: number }): string {
  sequence.value += 1;
  return `node-${sequence.value}`;
}

function attrsToRecord(
  attrs: DefaultTreeAdapterTypes.Element["attrs"],
): Record<string, string> {
  return Object.fromEntries(attrs.map(({ name, value }) => [name, value]));
}

function parseClassList(classAttr: string | undefined): string[] {
  return classAttr?.split(/\s+/).filter(Boolean) ?? [];
}

function parseInlineStyle(styleAttr: string | undefined): Record<string, string> {
  if (!styleAttr) {
    return {};
  }

  return Object.fromEntries(
    styleAttr
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf(":");
        if (separator === -1) {
          return [part, ""];
        }
        return [
          part.slice(0, separator).trim(),
          part.slice(separator + 1).trim(),
        ];
      }),
  );
}

function collectOverlay(node: RenderNode): SemanticOverlayEntry[] {
  const role = inferRole(node);
  const own: SemanticOverlayEntry = {
    nodeId: node.id,
    role,
    editableFields: editableFieldsForRole(role),
    confluenceMapping: confluenceMappingForRole(role),
    warnings: [],
  };

  return [own, ...node.children.flatMap((child) => collectOverlay(child))];
}

function inferRole(node: RenderNode): SemanticRole {
  if (hasClass(node, "status-pill") || hasClass(node, "status")) {
    return "status";
  }
  if (node.attrs["data-confluence-macro"] || hasClass(node, "callout")) {
    return "callout";
  }
  if (hasClass(node, "panel")) {
    return "panel";
  }
  if (node.tag === "details" || hasClass(node, "expand")) {
    return "expand";
  }
  if (node.tag === "document" || node.tag === "main" || node.tag === "body") {
    return "document";
  }
  if (node.tag === "section") return "section";
  if (/^h[1-6]$/.test(node.tag)) return "title";
  if (node.tag === "p") return "paragraph";
  if (node.tag === "img") return "image";
  if (node.tag === "ul" || node.tag === "ol") return "list";
  if (node.tag === "table") return "table";
  if (node.tag === "code" || node.tag === "pre") return "code";
  if (node.tag === "article") return "cardGrid";
  return "rawHtml";
}

function hasClass(node: RenderNode, className: string): boolean {
  return node.classList.includes(className);
}

function editableFieldsForRole(role: SemanticRole): string[] {
  if (role === "rawHtml") {
    return [];
  }
  if (role === "image") {
    return ["alt", "style"];
  }
  return ["text", "style"];
}

function confluenceMappingForRole(role: SemanticRole): ConfluenceMapping {
  if (
    role === "status" ||
    role === "callout" ||
    role === "panel" ||
    role === "expand" ||
    role === "code"
  ) {
    return {
      recommendedTarget: "macro",
      expectedVisualLoss: "minor",
      rationale: "Role has an MVP Confluence macro mapping candidate.",
    };
  }

  if (role === "rawHtml" || role === "cardGrid") {
    return {
      recommendedTarget: "fragment",
      expectedVisualLoss: "material",
      rationale:
        "Importer preserved this node but did not recognize a safe native Confluence structure.",
    };
  }

  return {
    recommendedTarget: "native",
    expectedVisualLoss: "minor",
    rationale: "Role has an MVP native mapping candidate.",
  };
}

function traceFromWarnings(
  warnings: CompatibilityWarning[],
  now: string,
): TransformationTraceEntry[] {
  return warnings.map((warning, index) => ({
    id: `trace-sanitize-${index + 1}`,
    stage: "sanitize",
    ruleId: warning.ruleId,
    message: warning.message,
    createdAt: now,
  }));
}

function nodeName(child: DefaultTreeAdapterTypes.ChildNode): string {
  if (isElement(child)) {
    return child.tagName.toLowerCase();
  }
  if (isTextNode(child)) {
    return "#text";
  }
  return child.nodeName;
}

function isElement(
  node: DefaultTreeAdapterTypes.ChildNode,
): node is DefaultTreeAdapterTypes.Element {
  return "tagName" in node;
}

function isTextNode(
  node: DefaultTreeAdapterTypes.ChildNode,
): node is DefaultTreeAdapterTypes.TextNode {
  return node.nodeName === "#text";
}
