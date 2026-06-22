import { describe, expect, it } from "vitest";
import { renderTreeToHtml, type RenderNode } from "../src/index.js";

describe("renderTreeToHtml", () => {
  it("serializes render tree nodes with optional stable node ids", () => {
    const node: RenderNode = {
      id: "node-root",
      tag: "main",
      attrs: { "data-kind": "sample" },
      classList: ["material"],
      inlineStyle: { color: "#123456" },
      children: [
        {
          id: "node-title",
          tag: "h1",
          attrs: {},
          classList: [],
          inlineStyle: {},
          children: [
            {
              id: "text-title",
              tag: "#text",
              attrs: {},
              classList: [],
              inlineStyle: {},
              children: [],
              text: "Launch <Plan>",
            },
          ],
        },
      ],
    };

    expect(renderTreeToHtml(node, { includeNodeIds: true })).toBe(
      '<main data-kind="sample" class="material" style="color: #123456" data-core-node-id="node-root"><h1 data-core-node-id="node-title">Launch &lt;Plan&gt;</h1></main>',
    );
  });

  it("can omit style tags for editor preview isolation", () => {
    const node: RenderNode = {
      id: "node-root",
      tag: "main",
      attrs: {},
      classList: [],
      inlineStyle: {},
      children: [
        {
          id: "node-style",
          tag: "style",
          attrs: {},
          classList: [],
          inlineStyle: {},
          children: [
            {
              id: "style-text",
              tag: "#text",
              attrs: {},
              classList: [],
              inlineStyle: {},
              children: [],
              text: "body{display:none}",
            },
          ],
        },
        {
          id: "node-title",
          tag: "h1",
          attrs: {},
          classList: [],
          inlineStyle: {},
          children: [],
        },
      ],
    };

    expect(renderTreeToHtml(node, { omitStyleTags: true })).toBe(
      "<main><h1></h1></main>",
    );
  });
});
