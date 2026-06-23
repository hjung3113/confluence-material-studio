import { describe, expect, it } from "vitest";
import {
  deleteNode,
  duplicateNode,
  editNodeText,
  exportProject,
  getNodeEditability,
  importHtml,
  insertCalloutAfterNode,
  insertMaterialBlockAfterNode,
  listEditableTextTargets,
  moveNode,
  updateThemeTokens,
} from "../src/index.js";
import type { ProjectDoc, RenderNode, SemanticRole } from "../src/index.js";

describe("document edit operations", () => {
  it("edits selected text through a core document operation", () => {
    const doc = importHtml({
      title: "Editable",
      now: "2026-06-22T00:00:00.000Z",
      html: "<main><section><h1>Original</h1><p>Body</p></section></main>",
    });
    const titleNodeId = doc.semanticOverlay.find(
      (entry) => entry.role === "title",
    )?.nodeId;

    const edited = editNodeText(doc, {
      nodeId: titleNodeId ?? "",
      text: "Edited title",
      createdAt: "2026-06-22T00:01:00.000Z",
    });

    const standalone = exportProject(edited, {
      generatedAt: "2026-06-22T00:02:00.000Z",
      fragmentId: "edit-test",
    }).artifacts.find((artifact) => artifact.filename === "standalone.html")
      ?.content;

    expect(standalone).toContain("Edited title");
    expect(edited.transformationTrace.at(-1)?.stage).toBe("edit");
    expect(edited.sourceArtifact?.content).toContain("Original");
  });

  it("inserts a callout block near the selected node and updates semantic overlay", () => {
    const doc = importHtml({
      title: "Editable",
      now: "2026-06-22T00:00:00.000Z",
      html: "<main><section><h1>Original</h1><p>Body</p></section></main>",
    });
    const titleNodeId = doc.semanticOverlay.find(
      (entry) => entry.role === "title",
    )?.nodeId;

    const edited = insertCalloutAfterNode(doc, {
      anchorNodeId: titleNodeId ?? "",
      title: "Review note",
      body: "Confirm Confluence fragment output.",
      createdAt: "2026-06-22T00:01:00.000Z",
    });

    const calloutEntry = edited.semanticOverlay.find(
      (entry) => entry.role === "callout",
    );
    const standalone = exportProject(edited, {
      generatedAt: "2026-06-22T00:02:00.000Z",
      fragmentId: "callout-test",
    }).artifacts.find((artifact) => artifact.filename === "standalone.html")
      ?.content;

    expect(calloutEntry?.editableFields).toEqual(["text"]);
    expect(standalone).toContain("Review note");
    expect(standalone).toContain("Confirm Confluence fragment output.");
    expect(edited.transformationTrace.at(-1)?.message).toBe(
      "Inserted callout block.",
    );
  });

  it("inserts constrained material blocks near the selected node", () => {
    const doc = importHtml({
      title: "Editable",
      now: "2026-06-22T00:00:00.000Z",
      html: "<main><section><h1>Original</h1><p>Body</p></section></main>",
    });
    const titleNodeId = doc.semanticOverlay.find(
      (entry) => entry.role === "title",
    )?.nodeId;

    const withTitle = insertMaterialBlockAfterNode(doc, {
      anchorNodeId: titleNodeId ?? "",
      blockType: "title",
      createdAt: "2026-06-22T00:01:00.000Z",
    });
    const insertedTitleId = withTitle.semanticOverlay.at(-1)?.nodeId;
    const withParagraph = insertMaterialBlockAfterNode(withTitle, {
      anchorNodeId: insertedTitleId ?? "",
      blockType: "paragraph",
      createdAt: "2026-06-22T00:02:00.000Z",
    });
    const insertedParagraphId = withParagraph.semanticOverlay.at(-1)?.nodeId;
    const withDivider = insertMaterialBlockAfterNode(withParagraph, {
      anchorNodeId: insertedParagraphId ?? "",
      blockType: "divider",
      createdAt: "2026-06-22T00:03:00.000Z",
    });

    const standalone = exportProject(withDivider, {
      generatedAt: "2026-06-22T00:04:00.000Z",
      fragmentId: "material-block-test",
    }).artifacts.find((artifact) => artifact.filename === "standalone.html")
      ?.content;

    expect(
      withDivider.semanticOverlay
        .slice(-3)
        .map((entry) => [entry.role, entry.editableFields]),
    ).toEqual([
      ["title", ["text", "style"]],
      ["paragraph", ["text", "style"]],
      ["rawHtml", []],
    ]);
    expect(standalone).toContain("New title");
    expect(standalone).toContain("New paragraph");
    expect(standalone).toContain("<hr");
    expect(withDivider.transformationTrace.at(-1)?.message).toBe(
      "Inserted divider block.",
    );
  });

  it("does not mutate the document when edit operations target missing nodes", () => {
    const doc = importHtml({
      title: "Editable",
      now: "2026-06-22T00:00:00.000Z",
      html: "<main><section><h1>Original</h1><p>Body</p></section></main>",
    });

    expect(
      editNodeText(doc, {
        nodeId: "missing-node",
        text: "No change",
        createdAt: "2026-06-22T00:01:00.000Z",
      }),
    ).toBe(doc);
    expect(
      insertCalloutAfterNode(doc, {
        anchorNodeId: "missing-node",
        title: "No change",
        body: "No change",
        createdAt: "2026-06-22T00:01:00.000Z",
      }),
    ).toBe(doc);
    expect(
      insertMaterialBlockAfterNode(doc, {
        anchorNodeId: "missing-node",
        blockType: "paragraph",
        createdAt: "2026-06-22T00:01:00.000Z",
      }),
    ).toBe(doc);
  });

  it("classifies directly editable, partially editable, and preserved-only nodes", () => {
    const doc = editableFixture();
    const titleId = nodeIdByRole(doc, "title");
    const sectionId = nodeIdByRole(doc, "section");
    const rawId = nodeIdByTag(doc.renderTree, "style");

    expect(getNodeEditability(doc, titleId)).toEqual({
      status: "editable",
      reason: "Selected node has editable text.",
    });
    expect(getNodeEditability(doc, sectionId)).toEqual({
      status: "partially-editable",
      reason: "Selected node contains editable text targets.",
    });
    expect(getNodeEditability(doc, rawId)).toEqual({
      status: "preserved-only",
      reason: "Selected node is locked or raw preserved structure.",
    });
  });

  it("lists nested editable text targets under a section", () => {
    const doc = editableFixture();
    const sectionId = nodeIdByRole(doc, "section");

    expect(listEditableTextTargets(doc, sectionId)).toEqual([
      {
        nodeId: nodeIdByRole(doc, "title"),
        role: "title",
        label: "Welcome",
        textPreview: "Welcome",
      },
      {
        nodeId: nodeIdByRole(doc, "paragraph"),
        role: "paragraph",
        label: "First body",
        textPreview: "First body",
      },
    ]);
  });

  it("exposes editable descendants under raw wrappers without traversing locked nodes", () => {
    const doc = rawWrapperFixture();
    const wrapperId = nodeIdByTag(doc.renderTree, "div");
    const styleNodeId = nodeIdByTag(doc.renderTree, "style");

    expect(getNodeEditability(doc, wrapperId)).toEqual({
      status: "partially-editable",
      reason: "Selected node contains editable text targets.",
    });
    expect(listEditableTextTargets(doc, wrapperId)).toEqual([
      {
        nodeId: nodeIdByRole(doc, "title"),
        role: "title",
        label: "Wrapper title",
        textPreview: "Wrapper title",
      },
      {
        nodeId: nodeIdByRole(doc, "paragraph"),
        role: "paragraph",
        label: "Wrapper body",
        textPreview: "Wrapper body",
      },
    ]);

    expect(getNodeEditability(doc, styleNodeId)).toEqual({
      status: "preserved-only",
      reason: "Selected node is locked or raw preserved structure.",
    });
    expect(listEditableTextTargets(doc, styleNodeId)).toEqual([]);
  });

  it("does not structurally mutate raw wrappers that expose editable descendants", () => {
    const doc = rawWrapperFixture();
    const wrapperId = nodeIdByTag(doc.renderTree, "div");

    expect(listEditableTextTargets(doc, wrapperId)).toEqual([
      {
        nodeId: nodeIdByRole(doc, "title"),
        role: "title",
        label: "Wrapper title",
        textPreview: "Wrapper title",
      },
      {
        nodeId: nodeIdByRole(doc, "paragraph"),
        role: "paragraph",
        label: "Wrapper body",
        textPreview: "Wrapper body",
      },
    ]);

    expect(
      duplicateNode(doc, {
        nodeId: wrapperId,
        createdAt: "2026-06-22T00:09:00.000Z",
      }),
    ).toBe(doc);
    expect(
      deleteNode(doc, {
        nodeId: wrapperId,
        createdAt: "2026-06-22T00:09:01.000Z",
      }),
    ).toBe(doc);
    expect(
      moveNode(doc, {
        nodeId: wrapperId,
        direction: "down",
        createdAt: "2026-06-22T00:09:02.000Z",
      }),
    ).toBe(doc);
  });

  it("does not structurally mutate locked preserved nodes", () => {
    const doc = editableFixture();
    const styleNodeId = nodeIdByTag(doc.renderTree, "style");
    const svgNodeId = nodeIdByTag(doc.renderTree, "svg");

    expect(
      duplicateNode(doc, {
        nodeId: styleNodeId,
        createdAt: "2026-06-22T00:09:03.000Z",
      }),
    ).toBe(doc);
    expect(
      deleteNode(doc, {
        nodeId: styleNodeId,
        createdAt: "2026-06-22T00:09:04.000Z",
      }),
    ).toBe(doc);
    expect(
      moveNode(doc, {
        nodeId: styleNodeId,
        direction: "down",
        createdAt: "2026-06-22T00:09:05.000Z",
      }),
    ).toBe(doc);
    expect(
      duplicateNode(doc, {
        nodeId: svgNodeId,
        createdAt: "2026-06-22T00:09:06.000Z",
      }),
    ).toBe(doc);
    expect(
      deleteNode(doc, {
        nodeId: svgNodeId,
        createdAt: "2026-06-22T00:09:07.000Z",
      }),
    ).toBe(doc);
    expect(
      moveNode(doc, {
        nodeId: svgNodeId,
        direction: "up",
        createdAt: "2026-06-22T00:09:08.000Z",
      }),
    ).toBe(doc);
  });

  it("duplicates a node after itself with fresh ids and overlay entries", () => {
    const doc = editableFixture();
    const sectionId = nodeIdByRole(doc, "section");
    const originalIds = new Set(collectNodeIds(doc.renderTree));
    const originalMaxNodeNumber = maxNodeNumber(doc.renderTree);

    const edited = duplicateNode(doc, {
      nodeId: sectionId,
      createdAt: "2026-06-22T00:10:00.000Z",
    });

    const editedSiblings = siblingsContaining(edited.renderTree, sectionId);
    const originalIndex = editedSiblings.findIndex(
      (child) => child.id === sectionId,
    );
    const duplicatedSection = editedSiblings[originalIndex + 1];
    const duplicatedIds = collectNodeIds(duplicatedSection);

    expect(duplicatedSection?.id).not.toBe(sectionId);
    expect(duplicatedIds).toHaveLength(5);
    expect(new Set(duplicatedIds).size).toBe(duplicatedIds.length);
    expect(duplicatedIds.every((nodeId) => !originalIds.has(nodeId))).toBe(true);
    expect(
      duplicatedIds.every(
        (nodeId) => Number(nodeId.match(/^node-(\d+)$/)?.[1] ?? 0) > originalMaxNodeNumber,
      ),
    ).toBe(true);
    expect(
      edited.semanticOverlay
        .filter((entry) => duplicatedIds.includes(entry.nodeId))
        .map((entry) => entry.role),
    ).toEqual(["section", "title", "rawHtml", "paragraph", "rawHtml"]);
    expect(edited.transformationTrace.at(-1)?.message).toBe(
      "Duplicated selected node.",
    );
  });

  it("duplicates nodes without sharing mutable render node fields", () => {
    const doc = editableFixture();
    const sectionId = nodeIdByRole(doc, "section");

    const edited = duplicateNode(doc, {
      nodeId: sectionId,
      createdAt: "2026-06-22T00:10:00.000Z",
    });

    const originalSection = findNode(edited.renderTree, sectionId);
    const editedSiblings = siblingsContaining(edited.renderTree, sectionId);
    const originalIndex = editedSiblings.findIndex(
      (child) => child.id === sectionId,
    );
    const duplicatedSection = editedSiblings[originalIndex + 1];
    const originalNodes = collectNodes(originalSection);
    const duplicatedNodes = collectNodes(duplicatedSection);

    expect(duplicatedNodes).toHaveLength(originalNodes.length);
    for (const [index, originalNode] of originalNodes.entries()) {
      const duplicatedNode = duplicatedNodes[index];
      expect(duplicatedNode?.attrs).toEqual(originalNode.attrs);
      expect(duplicatedNode?.attrs).not.toBe(originalNode.attrs);
      expect(duplicatedNode?.classList).toEqual(originalNode.classList);
      expect(duplicatedNode?.classList).not.toBe(originalNode.classList);
      expect(duplicatedNode?.inlineStyle).toEqual(originalNode.inlineStyle);
      expect(duplicatedNode?.inlineStyle).not.toBe(originalNode.inlineStyle);
      expect(duplicatedNode?.sourceMeta).toEqual(originalNode.sourceMeta);
      expect(duplicatedNode?.sourceMeta).not.toBe(originalNode.sourceMeta);
    }
  });

  it("deletes a node and its overlay entries but does not delete the root document", () => {
    const doc = editableFixture();
    const sectionId = nodeIdByRole(doc, "section");
    const sectionIds = collectNodeIds(findNode(doc.renderTree, sectionId));

    const edited = deleteNode(doc, {
      nodeId: sectionId,
      createdAt: "2026-06-22T00:11:00.000Z",
    });

    expect(
      siblingsContaining(edited.renderTree, styleId(doc)).some(
        (child) => child.id === sectionId,
      ),
    ).toBe(false);
    expect(
      edited.semanticOverlay.some((entry) => sectionIds.includes(entry.nodeId)),
    ).toBe(false);
    expect(edited.transformationTrace.at(-1)?.message).toBe(
      "Deleted selected node.",
    );
    expect(
      deleteNode(doc, {
        nodeId: doc.renderTree.id,
        createdAt: "2026-06-22T00:12:00.000Z",
      }),
    ).toBe(doc);
  });

  it("moves siblings up or down and no-ops at boundaries", () => {
    const doc = editableFixture();
    const sectionId = nodeIdByRole(doc, "section");
    const styleId = nodeIdByTag(doc.renderTree, "style");
    const svgId = nodeIdByTag(doc.renderTree, "svg");

    const movedDown = moveNode(doc, {
      nodeId: sectionId,
      direction: "down",
      createdAt: "2026-06-22T00:13:00.000Z",
    });
    expect(
      siblingsContaining(movedDown.renderTree, sectionId).map(
        (child) => child.id,
      ),
    ).toEqual([styleId, sectionId, svgId]);
    expect(movedDown.transformationTrace.at(-1)?.message).toBe(
      "Moved selected node down.",
    );

    const movedUp = moveNode(movedDown, {
      nodeId: sectionId,
      direction: "up",
      createdAt: "2026-06-22T00:14:00.000Z",
    });
    expect(
      siblingsContaining(movedUp.renderTree, sectionId).map((child) => child.id),
    ).toEqual([sectionId, styleId, svgId]);
    expect(movedUp.transformationTrace.at(-1)?.message).toBe(
      "Moved selected node up.",
    );

    expect(
      moveNode(movedUp, {
        nodeId: sectionId,
        direction: "up",
        createdAt: "2026-06-22T00:15:00.000Z",
      }),
    ).toBe(movedUp);
    expect(
      moveNode(movedUp, {
        nodeId: doc.renderTree.id,
        direction: "down",
        createdAt: "2026-06-22T00:16:00.000Z",
      }),
    ).toBe(movedUp);
  });

  it("updates theme tokens and records an edit trace", () => {
    const doc = editableFixture();

    const edited = updateThemeTokens(doc, {
      themeTokens: {
        colors: {
          background: "#101010",
          accent: "#ff5500",
        },
        fontStack: "Arial, sans-serif",
        spacingScale: "spacious",
        radius: "16px",
        shadow: "strong",
      },
      createdAt: "2026-06-22T00:17:00.000Z",
    });

    expect(edited.themeTokens).toEqual({
      colors: {
        background: "#101010",
        text: doc.themeTokens.colors.text,
        accent: "#ff5500",
      },
      fontStack: "Arial, sans-serif",
      spacingScale: "spacious",
      radius: "16px",
      shadow: "strong",
    });
    expect(edited.transformationTrace.at(-1)?.message).toBe("Updated theme tokens.");
  });
});

function editableFixture(): ProjectDoc {
  return importHtml({
    title: "Editable",
    now: "2026-06-22T00:00:00.000Z",
    html: `
      <main>
        <section>
          <h1>Welcome</h1>
          <p>First body</p>
        </section>
        <style>.unsafe { color: red; }</style>
        <svg><text>Locked shape</text></svg>
      </main>
    `,
  });
}

function rawWrapperFixture(): ProjectDoc {
  return importHtml({
    title: "Editable wrapper",
    now: "2026-06-22T00:00:00.000Z",
    html: `
      <main>
        <div>
          <h1>Wrapper title</h1>
          <p>Wrapper body</p>
        </div>
        <style>
          p { color: red; }
        </style>
      </main>
    `,
  });
}

function nodeIdByRole(doc: ProjectDoc, role: SemanticRole): string {
  const nodeId = doc.semanticOverlay.find((entry) => entry.role === role)?.nodeId;
  expect(nodeId).toBeTruthy();
  return nodeId ?? "";
}

function nodeIdByTag(node: RenderNode, tag: string): string {
  const found = findNodeByTag(node, tag);
  expect(found?.id).toBeTruthy();
  return found?.id ?? "";
}

function styleId(doc: ProjectDoc): string {
  return nodeIdByTag(doc.renderTree, "style");
}

function findNodeByTag(node: RenderNode, tag: string): RenderNode | undefined {
  if (node.tag === tag) {
    return node;
  }

  for (const child of node.children) {
    const found = findNodeByTag(child, tag);
    if (found) {
      return found;
    }
  }

  return undefined;
}

function findNode(node: RenderNode, nodeId: string): RenderNode | undefined {
  if (node.id === nodeId) {
    return node;
  }

  for (const child of node.children) {
    const found = findNode(child, nodeId);
    if (found) {
      return found;
    }
  }

  return undefined;
}

function siblingsContaining(node: RenderNode, nodeId: string): RenderNode[] {
  if (node.children.some((child) => child.id === nodeId)) {
    return node.children;
  }

  for (const child of node.children) {
    const siblings = siblingsContaining(child, nodeId);
    if (siblings.length > 0) {
      return siblings;
    }
  }

  return [];
}

function collectNodeIds(node: RenderNode | undefined): string[] {
  if (!node) {
    return [];
  }

  return [node.id, ...node.children.flatMap((child) => collectNodeIds(child))];
}

function collectNodes(node: RenderNode | undefined): RenderNode[] {
  if (!node) {
    return [];
  }

  return [node, ...node.children.flatMap((child) => collectNodes(child))];
}

function maxNodeNumber(node: RenderNode): number {
  const own = Number(node.id.match(/^node-(\d+)$/)?.[1] ?? 0);
  return Math.max(own, ...node.children.map((child) => maxNodeNumber(child)));
}
