export type AllowedBlockDefinition = {
  id: string;
  label: string;
  category: "Material";
  content: string;
};

const ALLOWED_BLOCKS: AllowedBlockDefinition[] = [
  {
    id: "cms-title",
    label: "Title",
    category: "Material",
    content: "<h1>Title</h1>",
  },
  {
    id: "cms-paragraph",
    label: "Paragraph",
    category: "Material",
    content: "<p>Paragraph</p>",
  },
  {
    id: "cms-callout",
    label: "Callout / Note",
    category: "Material",
    content:
      '<aside class="callout" data-confluence-macro="note"><h2>Review note</h2><p>Confirm the Confluence fragment before sharing.</p></aside>',
  },
  {
    id: "cms-divider",
    label: "Divider",
    category: "Material",
    content: "<hr>",
  },
];

const FORBIDDEN_BUILDER_LABELS = [
  "Ecommerce",
  "Script widget",
  "Remote asset widget",
  "Publish to Confluence",
];

export function getAllowedBlockDefinitions(): AllowedBlockDefinition[] {
  return ALLOWED_BLOCKS.map((block) => ({ ...block }));
}

export function allowedBlockLabels(): string[] {
  return ALLOWED_BLOCKS.map((block) => block.label);
}

export function forbiddenBuilderLabels(): string[] {
  return [...FORBIDDEN_BUILDER_LABELS];
}
