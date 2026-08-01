import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";
import fs from "fs";
import { cp } from "fs/promises";
import pkg from "./package.json" with { type: "json" };

const target = (process.env.TARGET || "firefox") as "firefox" | "chrome";
const outDir = process.env.BUILD_OUT_DIR || "dist";

export default defineConfig({
  plugins: [
    tailwindcss(),
    {
      name: "write-manifest",
      closeBundle() {
        const manifestSrc = resolve(
          import.meta.dirname,
          `manifests/manifest.${target}.json`,
        );
        const manifestDst = resolve(import.meta.dirname, `${outDir}/manifest.json`);

        if (!fs.existsSync(manifestSrc)) {
          console.error(`\nManifest not found: ${manifestSrc}\n`);
          return;
        }

        const manifest = JSON.parse(fs.readFileSync(manifestSrc, "utf-8"));
        manifest.version = pkg.version;
        fs.writeFileSync(
          manifestDst,
          JSON.stringify(manifest, null, 2),
          "utf-8",
        );
        console.log(`\nmanifest.json written for ${target} v${pkg.version}\n`);
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
      input: { content: resolve(import.meta.dirname, "src/main.ts") },
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
