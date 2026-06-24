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
  const requestedUrls: string[] = [];
  const scriptUrls: string[] = [];

  page.on("request", (request) => {
    requestedUrls.push(request.url());

    if (request.resourceType() === "script") {
      scriptUrls.push(request.url());
    }
  });

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto(url, { waitUntil: "networkidle" });
  await expectText(page, "Release Readiness");
  await expectAnyText(page, [
    "Loading visual canvas. Document controls remain available.",
    "Click text or sections to select. Export remains core-backed.",
  ]);
  await expectCanvasChromeStyle(page);
  await expectPanelCollapseControls(page);
  assertNoExternalRequests(requestedUrls);
  await expectTextAbsent(page, "Ecommerce");
  await expectTextAbsent(page, "Script widget");
  await expectTextAbsent(page, "Remote asset widget");
  await expectTextAbsent(page, "Publish to Confluence");
  await expectText(page, "Import review");

  const frame = page.frameLocator("iframe").first();
  await frame.getByRole("heading", { name: "Release Readiness" }).click();
  await expectText(page, "Selected: title");
  await expectText(page, "editable");
  await expectText(page, "Selected node has editable text.");
  await page.locator('[data-action="text"]').fill("Browser Smoke Release");
  await page.getByRole("button", { name: "Apply text" }).click();
  await expectText(page, "Browser Smoke Release");
  await expectCanvasTextCount(page, "Browser Smoke Release", 1);

  await page.getByRole("button", { name: "Duplicate" }).click();
  await expectCanvasTextCount(page, "Browser Smoke Release", 2);
  await page.getByRole("button", { name: "Delete" }).click();
  await expectCanvasTextCount(page, "Browser Smoke Release", 1);

  await page.getByRole("button", { name: "Add callout" }).click();
  await expectText(page, "Review note");
  await page.locator(".block-palette button", { hasText: "Title" }).click();
  await expectText(page, "New title");
  await page.locator(".block-palette button", { hasText: "Paragraph" }).click();
  await expectText(page, "New paragraph");
  await expectCanvasTextOrder(page, ["New title", "New paragraph"]);
  await page.getByRole("button", { name: "Move up" }).click();
  await expectCanvasTextOrder(page, ["New paragraph", "New title"]);
  await page.getByRole("button", { name: "Move down" }).click();
  await expectCanvasTextOrder(page, ["New title", "New paragraph"]);
  await page.locator(".block-palette button", { hasText: "Divider" }).click();
  assertEqual(
    await frame.locator("hr").count(),
    1,
    "Divider block should render as a horizontal rule.",
  );

  await page.locator('[data-theme-field="accent"]').evaluate((element) => {
    const input = element as HTMLInputElement;
    input.value = "#f97316";
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expectControlValue(page, '[data-theme-field="accent"]', "#f97316");
  await page.getByRole("button", { name: "Undo" }).click();
  await expectControlValue(page, '[data-theme-field="accent"]', "#2563eb");
  await page.getByRole("button", { name: "Redo" }).click();
  await expectControlValue(page, '[data-theme-field="accent"]', "#f97316");

  await page.screenshot({
    path: join(artifactDir, "desktop.png"),
    fullPage: true,
  });

  await page.getByRole("button", { name: "Import" }).click();
  await page.locator('[data-action="draft-title"]').fill("Imported Smoke");
  await page.locator('[data-action="draft-content"]').fill(`
    <style>
      @import url("https://cdn.example.com/remote.css");
      .fixed-hero { position: fixed; width: 100vw; background: url("https://cdn.example.com/bg.png"); }
    </style>
    <main class="fixed-hero" onclick="alert('x')">
      <section>
        <h1>Imported Smoke</h1>
        <p onmouseover="alert('x')">Unsafe import body.</p>
        <iframe src="https://example.com/embed"></iframe>
        <script>alert('x')</script>
      </section>
    </main>
  `);
  await page.getByRole("button", { name: "Import sanitized HTML" }).click();
  await expectText(page, "Import review");
  await expectText(page, "HTML_REMOTE_RESOURCE");
  await expectText(page, "HTML_SCRIPT_REMOVED");
  await expectText(page, "HTML_INLINE_HANDLER_REMOVED");
  await expectText(page, "Target impact is based on import/sanitize warnings only.");
  await expectFrameComputedStyle(page, "main.fixed-hero", "position", "fixed");

  await page.locator(".section-list button", { hasText: "section" }).first().click();
  await expectText(page, "partially-editable");
  await expectText(page, "Selected node contains editable text targets.");
  const editableTargetCount = await page.locator("[data-edit-target-id]").count();
  if (editableTargetCount > 0) {
    await page.locator("[data-edit-target-id]").first().click();
  }
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

  const scriptUrlsBeforeExport = new Set(scriptUrls);
  await page.getByRole("button", { name: "Export evidence" }).click();
  await expectArtifactTabs(page, [
    "standalone.html",
    "confluence-fragment.html",
    "compatibility-report.json",
    "native-mapping-report.json",
  ]);
  const exportScriptUrls = scriptUrls.filter(
    (scriptUrl) => !scriptUrlsBeforeExport.has(scriptUrl),
  );
  if (exportScriptUrls.length === 0) {
    throw new Error("Export drawer should lazy-load at least one local export chunk.");
  }
  assertNoExternalRequests(requestedUrls);
  await expectText(page, "Native mapping is a report/plan, not a Confluence page body.");
  await expectText(page, "Recommendation:");
  await expectText(page, "HTML_REMOTE_RESOURCE");
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
  if (nativeMapping.confluenceAdfDraft) {
    assertEqual(
      nativeMapping.confluenceAdfDraft.schemaSource,
      "@atlaskit/adf-schema",
      "Native mapping report must expose the Atlaskit ADF draft source.",
    );
    assertEqual(
      nativeMapping.confluenceAdfDraft.validation?.status,
      "valid",
      "ADF draft should validate against the installed schema package.",
    );
    assertEqual(
      nativeMapping.confluenceAdfDraft.document?.type,
      "doc",
      "ADF draft should expose a document node.",
    );
  }

  assertNoExternalRequests(requestedUrls);
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

async function expectAnyText(page: Page, texts: string[]): Promise<void> {
  for (const text of texts) {
    if ((await page.getByText(text, { exact: false }).count()) > 0) {
      return;
    }
  }

  throw new Error(`Expected one of these texts: ${texts.join(" | ")}`);
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

async function expectArtifactTabs(page: Page, filenames: string[]): Promise<void> {
  for (const filename of filenames) {
    await page.getByRole("button", { name: filename }).waitFor();
  }
}

async function expectCanvasTextCount(
  page: Page,
  text: string,
  expectedCount: number,
): Promise<void> {
  const frame = page.frameLocator("iframe").first();
  await frame.locator("body").waitFor();
  const actualCount = await frame
    .locator("body")
    .evaluate((body, expectedText) => {
      const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
      let count = 0;

      while (walker.nextNode()) {
        if (walker.currentNode.textContent?.includes(expectedText)) {
          count += 1;
        }
      }

      return count;
    }, text);

  assertEqual(
    actualCount,
    expectedCount,
    `Canvas should contain ${expectedCount} text node(s) matching ${text}.`,
  );
}

async function expectCanvasTextOrder(
  page: Page,
  expectedTextsInOrder: string[],
): Promise<void> {
  const frame = page.frameLocator("iframe").first();
  const canvasText = await frame
    .locator("body")
    .evaluate((body) => body.textContent?.replace(/\s+/g, " ").trim() ?? "");
  let previousIndex = -1;

  for (const expectedText of expectedTextsInOrder) {
    const index = canvasText.indexOf(expectedText);

    if (index === -1) {
      throw new Error(`Canvas text does not include ${expectedText}: ${canvasText}`);
    }

    if (index < previousIndex) {
      throw new Error(
        `Canvas text order is wrong for ${expectedTextsInOrder.join(" -> ")}: ${canvasText}`,
      );
    }

    previousIndex = index;
  }
}

async function expectControlValue(
  page: Page,
  selector: string,
  expectedValue: string,
): Promise<void> {
  const actualValue = await page.locator(selector).inputValue();

  assertEqual(
    actualValue,
    expectedValue,
    `${selector} should reflect the current control value.`,
  );
}

async function expectCanvasChromeStyle(page: Page): Promise<void> {
  const canvasBackground = await page
    .locator(".gjs-cv-canvas-bg")
    .evaluate((element) => getComputedStyle(element).backgroundColor);

  assertEqual(
    canvasBackground,
    "rgb(255, 255, 255)",
    "GrapesJS canvas chrome should not darken imported HTML.",
  );

  const frame = page.frameLocator("iframe").first();
  const frameBodyBackground = await frame
    .locator("body")
    .evaluate((body) => getComputedStyle(body).backgroundColor);

  assertEqual(
    frameBodyBackground,
    "rgb(255, 255, 255)",
    "Imported HTML iframe should have an explicit light background.",
  );
}

async function expectPanelCollapseControls(page: Page): Promise<void> {
  const canvasFrame = page.locator(".canvas-frame");
  const initialCanvasWidth = await canvasFrame.evaluate(
    (element) => element.getBoundingClientRect().width,
  );

  await page.getByRole("button", { name: "Collapse document panel" }).click();
  await page.getByRole("button", { name: "Collapse inspector panel" }).click();
  await page.locator('.studio-shell[data-left-rail="collapsed"]').waitFor();
  await page.locator('.studio-shell[data-inspector="collapsed"]').waitFor();

  const expandedCanvasWidth = await canvasFrame.evaluate(
    (element) => element.getBoundingClientRect().width,
  );

  if (expandedCanvasWidth < initialCanvasWidth) {
    throw new Error(
      `Collapsed panels should not make the canvas narrower. Initial ${initialCanvasWidth}, collapsed ${expandedCanvasWidth}.`,
    );
  }

  await page.getByRole("button", { name: "Open document panel" }).click();
  await page.getByRole("button", { name: "Open inspector panel" }).click();
  await page.locator('.studio-shell[data-left-rail="expanded"]').waitFor();
  await page.locator('.studio-shell[data-inspector="expanded"]').waitFor();
}

async function expectFrameComputedStyle(
  page: Page,
  selector: string,
  propertyName: string,
  expectedValue: string,
): Promise<void> {
  const frame = page.frameLocator("iframe").first();
  const actualValue = await frame.locator(selector).evaluate(
    (element, property) =>
      getComputedStyle(element).getPropertyValue(property).trim(),
    propertyName,
  );

  assertEqual(
    actualValue,
    expectedValue,
    `${selector} should apply imported CSS property ${propertyName}.`,
  );
}

function assertNoExternalRequests(requestedUrls: string[]): void {
  const externalUrls = requestedUrls.filter((requestUrl) => {
    const parsedUrl = new URL(requestUrl);

    return !["127.0.0.1", "localhost"].includes(parsedUrl.hostname);
  });

  assertEqual(
    externalUrls.length,
    0,
    `Browser smoke must not request external runtime assets: ${externalUrls.join(", ")}`,
  );
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message} Expected ${expected}, received ${actual}.`);
  }
}

await main();
