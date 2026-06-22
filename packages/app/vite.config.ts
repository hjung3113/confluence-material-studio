import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      "@htmleditor/core": resolve(__dirname, "../core/src/index.ts"),
    },
  },
  build: {
    target: "es2022",
  },
});
