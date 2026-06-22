import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { mkdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { chromium, type Browser, type Page } from "playwright-core";

const repoRoot = resolve(process.cwd(), "../..");
const appDist = resolve(repoRoot, "packages/app/dist");
const artifactDir = resolve(
  repoRoot,
  "packages/test-harness/artifacts/browser-smoke",
);
const chromePath =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

async function main(): Promise<void> {
  assertBuiltApp();
  mkdirSync(artifactDir, { recursive: true });

  const server = createStaticServer();
  const url = await listen(server);
  let browser: Browser | undefined;

  try {
    browser = await chromium.launch({
      executablePath: chromePath,
      headless: true,
    });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

    await runSmoke(page, url);
  } finally {
    await browser?.close();
    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
  }

  console.log(
    `BROWSER_SMOKE_PASS real Chrome flow verified; screenshots saved to ${artifactDir}`,
  );
}

async function runSmoke(page: Page, url: string): Promise<void> {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto(url, { waitUntil: "networkidle" });
  await expectText(page, "Release Readiness");
  await expectTextAbsent(page, "Ecommerce");
  await expectTextAbsent(page, "Script widget");
  await expectTextAbsent(page, "Remote asset widget");
  await expectTextAbsent(page, "Publish to Confluence");

  const frame = page.frameLocator("iframe").first();
  await frame.getByRole("heading", { name: "Release Readiness" }).click();
  await expectText(page, "Selected: title");
  await page.locator('[data-action="text"]').fill("Browser Smoke Release");
  await page.getByRole("button", { name: "Apply text" }).click();
  await expectText(page, "Browser Smoke Release");

  await page.getByRole("button", { name: "Add callout" }).click();
  await expectText(page, "Review note");

  await page.screenshot({
    path: join(artifactDir, "desktop.png"),
    fullPage: true,
  });

  await page.getByRole("button", { name: "Import" }).click();
  await page.locator('[data-action="draft-title"]').fill("Imported Smoke");
  await page.locator('[data-action="draft-content"]').fill(`
    <main onclick="alert('x')">
      <section>
        <h1>Imported Smoke</h1>
        <p onmouseover="alert('x')">Unsafe import body.</p>
        <script>alert('x')</script>
      </section>
    </main>
  `);
  await page.getByRole("button", { name: "Import sanitized HTML" }).click();
  await frame.getByRole("heading", { name: "Imported Smoke" }).click();
  await page.locator('[data-action="text"]').fill("Imported Smoke Edited");
  await page.getByRole("button", { name: "Apply text" }).click();
  await page.getByRole("button", { name: "Add callout" }).click();

  const scriptCount = await frame.locator("script").count();
  const inlineHandlerCount = await frame
    .locator("[onclick], [onmouseover], [onerror], [onload]")
    .count();
  assertEqual(scriptCount, 0, "Imported scripts must not reach the canvas.");
  assertEqual(
    inlineHandlerCount,
    0,
    "Imported inline event handlers must not reach the canvas.",
  );

  await page.getByRole("button", { name: "Export evidence" }).click();
  await expectText(page, "Native mapping is a report/plan, not a Confluence page body.");
  await expectArtifactContains(page, "standalone.html", [
    "Imported Smoke Edited",
    "Confirm the Confluence fragment before sharing.",
  ]);

  await page.getByRole("button", { name: "compatibility-report.json" }).click();
  JSON.parse(await page.locator(".artifact-preview code").innerText());

  await page.getByRole("button", { name: "native-mapping-report.json" }).click();
  const nativeMapping = JSON.parse(
    await page.locator(".artifact-preview code").innerText(),
  ) as {
    isConfluencePageBody: boolean;
    confluenceAdfDraft?: {
      schemaSource: string;
      validation?: { status: string };
      document?: { type: string; version: number };
    };
  };
  assertEqual(
    nativeMapping.isConfluencePageBody,
    false,
    "Native mapping artifact must remain a report.",
  );
  assertEqual(
    nativeMapping.confluenceAdfDraft?.schemaSource,
    "@atlaskit/adf-schema",
    "Native mapping report must expose the Atlaskit ADF draft source.",
  );
  assertEqual(
    nativeMapping.confluenceAdfDraft?.validation?.status,
    "valid",
    "ADF draft should validate against the installed schema package.",
  );
  assertEqual(
    nativeMapping.confluenceAdfDraft?.document?.type,
    "doc",
    "ADF draft should expose a document node.",
  );

  await page.setViewportSize({ width: 390, height: 900 });
  await page.screenshot({
    path: join(artifactDir, "mobile.png"),
    fullPage: true,
  });

  const blockingConsoleErrors = consoleErrors.filter(
    (message) => !message.includes("favicon"),
  );
  assertEqual(
    blockingConsoleErrors.length,
    0,
    `Unexpected browser console errors: ${blockingConsoleErrors.join(" | ")}`,
  );
}

function createStaticServer() {
  return createServer((request, response) => {
    serveStatic(request, response);
  });
}

function serveStatic(request: IncomingMessage, response: ServerResponse): void {
  const requestedPath = decodeURIComponent(request.url?.split("?")[0] ?? "/");

  if (requestedPath === "/favicon.ico") {
    response.writeHead(204);
    response.end();
    return;
  }

  const relativePath = requestedPath === "/" ? "index.html" : requestedPath.slice(1);
  const filePath = resolve(appDist, relativePath);

  if (!filePath.startsWith(appDist)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const content = readFileSync(filePath);
    response.writeHead(200, { "content-type": contentType(filePath) });
    response.end(content);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}

function contentType(filePath: string): string {
  switch (extname(filePath)) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

async function listen(server: ReturnType<typeof createStaticServer>): Promise<string> {
  return new Promise((resolveListen) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();

      if (!address || typeof address === "string") {
        throw new Error("Could not determine browser smoke server address.");
      }

      resolveListen(`http://127.0.0.1:${address.port}/`);
    });
  });
}

function assertBuiltApp(): void {
  try {
    statSync(join(appDist, "index.html"));
  } catch {
    throw new Error("Missing app build. Run npm run app:build first.");
  }

  try {
    statSync(chromePath);
  } catch {
    throw new Error(`Chrome executable not found at ${chromePath}.`);
  }
}

async function expectText(page: Page, text: string): Promise<void> {
  await page.getByText(text, { exact: false }).first().waitFor();
}

async function expectTextAbsent(page: Page, text: string): Promise<void> {
  const count = await page.getByText(text, { exact: false }).count();
  assertEqual(count, 0, `Forbidden text should be absent: ${text}`);
}

async function expectArtifactContains(
  page: Page,
  filename: string,
  expectedTexts: string[],
): Promise<void> {
  await page.getByRole("button", { name: filename }).click();
  const artifact = await page.locator(".artifact-preview code").innerText();

  for (const expectedText of expectedTexts) {
    if (!artifact.includes(expectedText)) {
      throw new Error(`${filename} does not include ${expectedText}`);
    }
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message} Expected ${expected}, received ${actual}.`);
  }
}

await main();
