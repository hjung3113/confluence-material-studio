import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
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
