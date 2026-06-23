import { resolve } from "node:path";
import { defineConfig, normalizePath } from "vite";

const grapesJsModuleSuffix = "/node_modules/grapesjs/dist/grapes.mjs";
const grapesJsRemoteDefaults = [
  "https://app.grapesjs.com",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css",
] as const;

function stripGrapesJsRemoteDefaults() {
  return {
    name: "strip-grapesjs-remote-defaults",
    enforce: "pre" as const,
    transform(code: string, id: string) {
      const normalizedId = normalizePath(id.split("?", 1)[0] ?? id);

      if (!normalizedId.endsWith(grapesJsModuleSuffix)) {
        return null;
      }

      let transformedCode = code;

      for (const remoteDefault of grapesJsRemoteDefaults) {
        transformedCode = transformedCode.split(remoteDefault).join("");
      }

      if (transformedCode === code) {
        return null;
      }

      return {
        code: transformedCode,
        map: null,
      };
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [stripGrapesJsRemoteDefaults()],
  resolve: {
    alias: {
      "@htmleditor/core/browser": resolve(__dirname, "../core/src/browser.ts"),
      "@htmleditor/core/export": resolve(
        __dirname,
        "../core/src/export/exportProject.ts",
      ),
      "@htmleditor/core": resolve(__dirname, "../core/src/index.ts"),
    },
  },
  build: {
    target: "es2022",
  },
});
