import { describe, expect, it } from "vitest";
import {
  editNodeText,
  exportProject,
  importHtml,
  insertCalloutAfterNode,
} from "../src/index.js";

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
  });
});
