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
  assertCoreSubpathsResolveViaPackageExports();
  await assertCorePackageExportsResolveAndImport();
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

async function assertCorePackageExportsResolveAndImport(): Promise<void> {
  const expectedSubpaths = [
    {
      specifier: "@htmleditor/core",
      resolvedSuffix: "/packages/core/dist/src/index.js",
      requiredExport: "importHtml",
    },
    {
      specifier: "@htmleditor/core/browser",
      resolvedSuffix: "/packages/core/dist/src/browser.js",
      requiredExport: "importHtml",
    },
    {
      specifier: "@htmleditor/core/export",
      resolvedSuffix: "/packages/core/dist/src/export/exportProject.js",
      requiredExport: "exportProject",
    },
  ] as const;

  for (const { specifier, resolvedSuffix, requiredExport } of expectedSubpaths) {
    const resolvedUrl = import.meta.resolve(specifier);

    if (!resolvedUrl.endsWith(resolvedSuffix)) {
      throw new Error(
        `${specifier} must resolve through core package exports to ${resolvedSuffix}; resolved ${resolvedUrl}.`,
      );
    }

    if (resolvedUrl.includes("/packages/core/src/")) {
      throw new Error(
        `${specifier} resolved to core source instead of built dist: ${resolvedUrl}.`,
      );
    }

    const importedModule = (await import(specifier)) as Record<string, unknown>;

    if (typeof importedModule[requiredExport] !== "function") {
      throw new Error(
        `${specifier} did not import expected export ${requiredExport}.`,
      );
    }
  }
}

function assertCoreSubpathsResolveViaPackageExports(): void {
  const appConfigFiles = [
    "packages/app/tsconfig.json",
    "packages/app/vite.config.ts",
  ];
  const forbiddenSourceAliasPattern =
    /@htmleditor\/core(?:\/browser|\/export)?[\s\S]{0,120}\.\.\/core\/src/;

  for (const configFile of appConfigFiles) {
    const config = readFileSync(resolve(repoRoot, configFile), "utf8");

    if (forbiddenSourceAliasPattern.test(config)) {
      throw new Error(
        `${configFile} must resolve @htmleditor/core subpaths through package exports, not ../core/src aliases.`,
      );
    }
  }
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
