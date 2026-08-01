import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";
import fs from "fs";
import pkg from "./package.json" with { type: "json" };
import { cp } from "fs/promises";

const target = (process.env.TARGET || "firefox") as "firefox" | "chrome";
const outDir = process.env.BUILD_OUT_DIR || "dist";

export default defineConfig({
  plugins: [
    tailwindcss(),
    {
      name: "write-popup-html",
      closeBundle() {
        const popupHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Better Intra</title>
  <style>
    html, body { margin: 0; padding: 0; width: 420px; min-height: 320px; }
    #popup-root { width: 100%; min-height: 320px; background: white; }
  </style>
</head>
<body>
  <div id="popup-root" data-theme="light">
    <div id="account-root" class="p-4"></div>
  </div>
  <script src="popup.js"></script>
</body>
</html>`;
        fs.writeFileSync(
          resolve(import.meta.dirname, outDir, "popup.html"),
          popupHtml,
          "utf-8",
        );
        console.log(`popup.html written`);
        // Copy icons
        const iconsSrc = resolve(import.meta.dirname, "public/icons");
        const iconsDst = resolve(import.meta.dirname, `${outDir}/icons`);
        if (fs.existsSync(iconsSrc)) {
          fs.mkdirSync(iconsDst, { recursive: true });
          for (const file of fs.readdirSync(iconsSrc)) {
            fs.cpSync(resolve(iconsSrc, file), resolve(iconsDst, file));
          }
          console.log(`icons copied to ${iconsDst}`);
        }
      },
    },
  ],
  build: {
    outDir: outDir,
    emptyOutDir: false,
    minify: false,
    rollupOptions: {
      input: { popup: resolve(import.meta.dirname, "src/popup/popup.ts") },
      output: {
        format: "iife",
        entryFileNames: "[name].js",
        assetFileNames: "[name].[ext]",
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __TS_VERSION__: JSON.stringify(pkg.devDependencies.typescript),
    __VITE_VERSION__: JSON.stringify(pkg.devDependencies.vite),
    __LIT_VERSION__: JSON.stringify(pkg.dependencies["lit-html"]),
    __TW_VERSION__: JSON.stringify(pkg.dependencies["@tailwindcss/vite"]),
    __DAISY_VERSION__: JSON.stringify(pkg.devDependencies.daisyui),
    __WEB_EXT_VERSION__: JSON.stringify(pkg.devDependencies["web-ext"]),
    "import.meta": "{}",
  },
});
