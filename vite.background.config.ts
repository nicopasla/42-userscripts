import { defineConfig } from "vite";
import { resolve } from "path";
import pkg from "./package.json" with { type: "json" };

const target = (process.env.TARGET || "firefox") as "firefox" | "chrome";
const outDir = process.env.BUILD_OUT_DIR || "dist";

export default defineConfig({
  build: {
    outDir: outDir,
    emptyOutDir: false,
    minify: false,
    rollupOptions: {
      input: { background: resolve(import.meta.dirname, "src/background.ts") },
      output: {
        format: "iife",
        entryFileNames: "[name].js",
        assetFileNames: "[name].[ext]",
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
});
