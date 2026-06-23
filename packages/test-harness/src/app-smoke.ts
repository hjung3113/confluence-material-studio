import { readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = resolve(process.cwd(), "../..");
const appDist = resolve(repoRoot, "packages/app/dist");

const requiredShellText = [
  "Confluence Material Studio",
  "<div id=\"app\"></div>",
];

const requiredBundleText = [
  "Canvas-first visual editor",
  "Visual canvas",
  "Document outline",
  "Allowed blocks",
  "Callout / Note",
  "Import sanitized HTML",
  "Selected text",
  "Apply text",
  "Inspector",
  "Export evidence",
  "Native mapping is a report/plan, not a Confluence page body.",
  "standalone.html",
  "confluence-fragment.html",
  "compatibility-report.json",
  "native-mapping-report.json",
  "data-core-node-id",
  "data-editor-host",
  "cms:add-callout",
  "Review note",
];

const forbiddenBundleText = [
  "@atlaskit/adf-schema",
  "prosemirror",
  "nodeFromJSON",
  "confluenceAdfDraft",
  "https://app.grapesjs.com",
  "https://cdnjs.cloudflare.com",
  "Ecommerce",
  "Script widget",
  "Remote asset widget",
  "GrapesJS default blocks",
  "Publish to Confluence",
];

async function main(): Promise<void> {
  assertBuiltApp();

  const indexHtml = readFileSync(join(appDist, "index.html"), "utf8");
  const scriptPath = scriptPathFromIndex(indexHtml);
  const bundle = readFileSync(
    resolve(appDist, scriptPath.replace(/^\//, "")),
    "utf8",
  );

  for (const text of requiredShellText) {
    assertContains(indexHtml, text, "index.html");
  }

  for (const text of requiredBundleText) {
    assertContains(bundle, text, scriptPath);
  }

  for (const text of forbiddenBundleText) {
    assertNotContains(bundle, text, scriptPath);
  }

  console.log(
    "APP_SMOKE_PASS built app artifacts and canvas-first editor markers verified",
  );
}

function assertBuiltApp(): void {
  const indexPath = join(appDist, "index.html");

  try {
    statSync(indexPath);
  } catch {
    throw new Error("Missing app build. Run npm run app:build first.");
  }
}

function scriptPathFromIndex(indexHtml: string): string {
  const match = indexHtml.match(/<script[^>]+src="([^"]+)"/);

  if (!match?.[1]) {
    throw new Error("Built index.html does not include a script tag.");
  }

  return match[1];
}

function assertContains(content: string, text: string, source: string): void {
  if (!content.includes(text)) {
    throw new Error(`${source} does not contain required marker: ${text}`);
  }
}

function assertNotContains(content: string, text: string, source: string): void {
  if (content.includes(text)) {
    throw new Error(`${source} contains forbidden marker: ${text}`);
  }
}

await main();
