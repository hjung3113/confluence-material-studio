import { readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = resolve(process.cwd(), "../..");
const appDist = resolve(repoRoot, "packages/app/dist");

const requiredShellText = [
  "Confluence Material Studio",
  "<div id=\"app\"></div>",
];

const requiredBundleText = [
  "HTML draft",
  "Import HTML draft",
  "Selected text",
  "Apply text",
  "Section navigator",
  "Live canvas",
  "Inspector",
  "standalone.html",
  "confluence-fragment.html",
  "compatibility-report.json",
  "native-mapping-report.json",
  "CF_FRAGMENT_FIXED_POSITION",
  "CF_FRAGMENT_VIEWPORT_UNIT",
  "CF_FRAGMENT_GLOBAL_SELECTOR",
  "CF_FRAGMENT_OVERFLOW_RISK",
  "HTML_SCRIPT_REMOVED",
  "status",
  "callout",
  "expand",
  "code",
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

  console.log("APP_SMOKE_PASS built app artifacts and MVP shell markers verified");
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

await main();
