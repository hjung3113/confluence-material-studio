import { createHash } from "node:crypto";
import type {
  ConfluenceMapping,
  ProjectDoc,
  RenderNode,
  SemanticOverlayEntry,
  SemanticRole,
  ThemeTokens,
} from "../document/types.js";

export type ImportMarkdownInput = {
  markdown: string;
  title: string;
  now: string;
};

type Sequence = {
  value: number;
};

type MarkdownBlock =
  | { kind: "heading"; depth: number; text: string; line: number }
  | { kind: "paragraph"; text: string; line: number }
  | { kind: "list"; ordered: boolean; items: string[]; line: number }
  | { kind: "code"; language: string; text: string; line: number };

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

export function importMarkdown(input: ImportMarkdownInput): ProjectDoc {
  const sequence = { value: 0 };
  const blocks = parseMarkdownBlocks(input.markdown);
  const renderTree = renderDocument(blocks, sequence);

  return {
    version: "0.1.0",
    title: input.title,
    sourceArtifact: {
      id: "source-1",
      kind: "markdown",
      originalBytesHash: hashContent(input.markdown),
      content: input.markdown,
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
        message: "Imported Markdown outline into ProjectDoc render tree.",
        createdAt: input.now,
      },
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

function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fencedCode = line.match(/^```([A-Za-z0-9_-]*)\s*$/);

    if (fencedCode) {
      const codeLines: string[] = [];
      const startLine = index + 1;
      index += 1;

      while (index < lines.length && !(lines[index] ?? "").startsWith("```")) {
        codeLines.push(lines[index] ?? "");
        index += 1;
      }

      if (index < lines.length) {
        index += 1;
      }

      blocks.push({
        kind: "code",
        language: fencedCode[1] ?? "",
        text: codeLines.join("\n"),
        line: startLine,
      });
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);

    if (heading?.[1] && heading[2]) {
      blocks.push({
        kind: "heading",
        depth: heading[1].length,
        text: heading[2].trim(),
        line: index + 1,
      });
      index += 1;
      continue;
    }

    const listItem = parseListItem(line);

    if (listItem) {
      const items: string[] = [];
      const ordered = listItem.ordered;
      const startLine = index + 1;

      while (index < lines.length) {
        const current = parseListItem(lines[index] ?? "");

        if (!current || current.ordered !== ordered) {
          break;
        }

        items.push(current.text);
        index += 1;
      }

      blocks.push({ kind: "list", ordered, items, line: startLine });
      continue;
    }

    const paragraphLines: string[] = [];
    const startLine = index + 1;

    while (index < lines.length) {
      const current = lines[index] ?? "";

      if (
        !current.trim() ||
        current.match(/^(#{1,6})\s+(.+)$/) ||
        current.match(/^```/) ||
        parseListItem(current)
      ) {
        break;
      }

      paragraphLines.push(current.trim());
      index += 1;
    }

    blocks.push({
      kind: "paragraph",
      text: paragraphLines.join(" "),
      line: startLine,
    });
  }

  return blocks;
}

function parseListItem(
  line: string,
): { ordered: boolean; text: string } | undefined {
  const unordered = line.match(/^\s*[-*]\s+(.+)$/);

  if (unordered?.[1]) {
    return { ordered: false, text: unordered[1].trim() };
  }

  const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);

  if (ordered?.[1]) {
    return { ordered: true, text: ordered[1].trim() };
  }

  return undefined;
}

function renderDocument(blocks: MarkdownBlock[], sequence: Sequence): RenderNode {
  const documentNode = elementNode(
    "document",
    [],
    sequence,
    "markdown",
    "document",
  );
  const main = elementNode("main", [], sequence, "markdown/main", "main");

  documentNode.children.push(main);

  let currentSection: RenderNode | undefined;

  for (const block of blocks) {
    if (block.kind === "heading" && block.depth >= 2) {
      currentSection = sectionNode(block, sequence);
      main.children.push(currentSection);
      continue;
    }

    const node = renderBlock(block, sequence);

    if (!node) {
      continue;
    }

    if (currentSection) {
      currentSection.children.push(node);
    } else {
      main.children.push(node);
    }
  }

  return documentNode;
}

function sectionNode(
  block: Extract<MarkdownBlock, { kind: "heading" }>,
  sequence: Sequence,
): RenderNode {
  return elementNode(
    "section",
    [renderHeading(block, sequence)],
    sequence,
    `markdown/line-${block.line}`,
    "section",
  );
}

function renderBlock(
  block: MarkdownBlock,
  sequence: Sequence,
): RenderNode | undefined {
  if (block.kind === "heading") {
    return renderHeading(block, sequence);
  }

  if (block.kind === "paragraph") {
    return elementNode(
      "p",
      [textNode(block.text, sequence, `markdown/line-${block.line}/text`)],
      sequence,
      `markdown/line-${block.line}`,
      "paragraph",
    );
  }

  if (block.kind === "list") {
    return elementNode(
      block.ordered ? "ol" : "ul",
      block.items.map((item, index) =>
        elementNode(
          "li",
          [
            textNode(
              item,
              sequence,
              `markdown/line-${block.line}/item-${index + 1}/text`,
            ),
          ],
          sequence,
          `markdown/line-${block.line}/item-${index + 1}`,
          "listItem",
        ),
      ),
      sequence,
      `markdown/line-${block.line}`,
      "list",
    );
  }

  return elementNode(
    "pre",
    [
      elementNode(
        "code",
        [
          textNode(
            block.text,
            sequence,
            `markdown/line-${block.line}/code-text`,
          ),
        ],
        sequence,
        `markdown/line-${block.line}/code`,
        "code",
        block.language ? { class: `language-${block.language}` } : {},
      ),
    ],
    sequence,
    `markdown/line-${block.line}`,
    "code",
  );
}

function renderHeading(
  block: Extract<MarkdownBlock, { kind: "heading" }>,
  sequence: Sequence,
): RenderNode {
  return elementNode(
    `h${block.depth}`,
    [textNode(block.text, sequence, `markdown/line-${block.line}/text`)],
    sequence,
    `markdown/line-${block.line}`,
    "heading",
  );
}

function elementNode(
  tag: string,
  children: RenderNode[],
  sequence: Sequence,
  sourcePath: string,
  sourceNodeName: string,
  attrs: Record<string, string> = {},
): RenderNode {
  return {
    id: nextNodeId(sequence),
    tag,
    attrs,
    classList: parseClassList(attrs.class),
    inlineStyle: {},
    children,
    sourceMeta: {
      sourceNodeName,
      sourcePath,
    },
  };
}

function textNode(
  text: string,
  sequence: Sequence,
  sourcePath: string,
): RenderNode {
  return {
    id: nextNodeId(sequence),
    tag: "#text",
    attrs: {},
    classList: [],
    inlineStyle: {},
    children: [],
    text,
    sourceMeta: {
      sourceNodeName: "#text",
      sourcePath,
    },
  };
}

function nextNodeId(sequence: Sequence): string {
  sequence.value += 1;
  return `node-${sequence.value}`;
}

function parseClassList(classAttr: string | undefined): string[] {
  return classAttr?.split(/\s+/).filter(Boolean) ?? [];
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
  if (node.tag === "document" || node.tag === "main") return "document";
  if (node.tag === "section") return "section";
  if (/^h[1-6]$/.test(node.tag)) return "title";
  if (node.tag === "p") return "paragraph";
  if (node.tag === "ul" || node.tag === "ol" || node.tag === "li") {
    return "list";
  }
  if (node.tag === "pre" || node.tag === "code") return "code";
  return "paragraph";
}

function editableFieldsForRole(role: SemanticRole): string[] {
  if (role === "code") {
    return ["text"];
  }
  return ["text", "style"];
}

function confluenceMappingForRole(role: SemanticRole): ConfluenceMapping {
  return {
    recommendedTarget: "native",
    expectedVisualLoss: role === "document" ? "none" : "minor",
    rationale: "Markdown outline node maps to an MVP native Confluence candidate.",
  };
}

function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}
