import { readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
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
  "Review note",
];

const requiredLazyBundleText = ["cms:add-callout"];

const forbiddenBundleText = [
  "@atlaskit/adf-schema",
  "prosemirror",
  "nodeFromJSON",
  "confluenceAdfDraft",
  "Ecommerce",
  "Script widget",
  "Remote asset widget",
  "GrapesJS default blocks",
  "Publish to Confluence",
];

const forbiddenRemoteText = [
  "https://app.grapesjs.com",
  "https://cdnjs.cloudflare.com",
];

const grapesRuntimeMarkers = [
  "grapesjs",
  "gjs-",
  "DomComponents",
  "BlockManager",
  "TraitManager",
];

const initialJsGzipBudgetBytes = 150_000;

type ViteManifestChunk = {
  file?: string;
  src?: string;
  isEntry?: boolean;
  imports?: string[];
  dynamicImports?: string[];
};

type ViteManifest = Record<string, ViteManifestChunk>;

async function main(): Promise<void> {
  assertCoreSubpathsResolveViaPackageExports();
  await assertCorePackageExportsResolveAndImport();
  assertBuiltApp();

  const indexHtml = readFileSync(join(appDist, "index.html"), "utf8");
  const manifest = readManifest();
  const initialScriptPaths = initialJsPathsFromManifest(manifest);
  const lazyScriptPaths = lazyJsPathsFromManifest(manifest);
  const allScriptPaths = allJsPathsFromManifest(manifest);
  const initialBundle = readJoinedAssets(initialScriptPaths);
  const lazyBundle = readJoinedAssets(lazyScriptPaths);
  const allBundle = readJoinedAssets(allScriptPaths);

  for (const text of requiredShellText) {
    assertContains(indexHtml, text, "index.html");
  }

  for (const text of requiredBundleText) {
    assertContains(initialBundle, text, "initial JS graph");
  }

  for (const text of requiredLazyBundleText) {
    assertContains(lazyBundle, text, "lazy JS graph");
  }

  for (const text of forbiddenBundleText) {
    assertNotContains(initialBundle, text, "initial JS graph");
  }

  for (const text of forbiddenRemoteText) {
    assertNotContains(allBundle, text, "built JS graph");
  }

  const initialGzipBytes = gzipSync(initialBundle).length;

  if (initialGzipBytes > initialJsGzipBudgetBytes) {
    throw new Error(
      `Initial JS graph gzip size ${initialGzipBytes} exceeds budget ${initialJsGzipBudgetBytes}.`,
    );
  }

  for (const marker of grapesRuntimeMarkers) {
    assertNotContains(initialBundle, marker, "initial JS graph");
  }

  assertContainsAny(lazyBundle, grapesRuntimeMarkers, "lazy JS graph");

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

function readManifest(): ViteManifest {
  return JSON.parse(
    readFileSync(join(appDist, ".vite/manifest.json"), "utf8"),
  ) as ViteManifest;
}

function initialJsPathsFromManifest(manifest: ViteManifest): string[] {
  const entryKey = entryChunkKey(manifest);
  const visited = new Set<string>();

  function visit(chunkKey: string): void {
    if (visited.has(chunkKey)) {
      return;
    }

    visited.add(chunkKey);

    for (const importedChunkKey of manifest[chunkKey]?.imports ?? []) {
      visit(importedChunkKey);
    }
  }

  visit(entryKey);

  return jsFilesForChunkKeys(manifest, [...visited]);
}

function lazyJsPathsFromManifest(manifest: ViteManifest): string[] {
  const entryKey = entryChunkKey(manifest);
  const initialChunkKeys = new Set(
    initialJsPathsFromManifest(manifest)
      .map((file) => chunkKeyForFile(manifest, file))
      .filter((chunkKey): chunkKey is string => Boolean(chunkKey)),
  );
  const visited = new Set<string>();

  function visit(chunkKey: string): void {
    if (visited.has(chunkKey) || initialChunkKeys.has(chunkKey)) {
      return;
    }

    visited.add(chunkKey);

    for (const importedChunkKey of manifest[chunkKey]?.imports ?? []) {
      visit(importedChunkKey);
    }

    for (const dynamicChunkKey of manifest[chunkKey]?.dynamicImports ?? []) {
      visit(dynamicChunkKey);
    }
  }

  for (const dynamicChunkKey of manifest[entryKey]?.dynamicImports ?? []) {
    visit(dynamicChunkKey);
  }

  return jsFilesForChunkKeys(manifest, [...visited]);
}

function allJsPathsFromManifest(manifest: ViteManifest): string[] {
  return [...new Set(jsFilesForChunkKeys(manifest, Object.keys(manifest)))].sort();
}

function entryChunkKey(manifest: ViteManifest): string {
  const entry = Object.entries(manifest).find(
    ([, chunk]) => chunk.isEntry === true,
  );

  if (!entry) {
    throw new Error("Vite manifest does not include an entry chunk.");
  }

  return entry[0];
}

function jsFilesForChunkKeys(
  manifest: ViteManifest,
  chunkKeys: string[],
): string[] {
  return chunkKeys
    .map((chunkKey) => manifest[chunkKey]?.file)
    .filter((file): file is string => Boolean(file?.endsWith(".js")))
    .sort();
}

function chunkKeyForFile(
  manifest: ViteManifest,
  file: string,
): string | undefined {
  return Object.entries(manifest).find(
    ([, chunk]) => chunk.file === file,
  )?.[0];
}

function readJoinedAssets(assetPaths: string[]): string {
  if (assetPaths.length === 0) {
    return "";
  }

  return assetPaths
    .map((assetPath) => readFileSync(resolve(appDist, assetPath), "utf8"))
    .join("\n");
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

function assertContainsAny(
  content: string,
  texts: readonly string[],
  source: string,
): void {
  if (!texts.some((text) => content.includes(text))) {
    throw new Error(
      `${source} does not contain any required marker: ${texts.join(", ")}`,
    );
  }
}

await main();
