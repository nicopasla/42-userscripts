import sharp from "sharp";
import { mkdirSync } from "fs";
import { resolve, dirname, extname, basename, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(__dirname, "../images");
const outDir = resolve(__dirname, "../images-store");

const SCREENSHOT_W = 1280;
const SCREENSHOT_H = 800;
const PROMO_SMALL_W = 440;
const PROMO_SMALL_H = 280;
const PROMO_MARQUEE_W = 1400;
const PROMO_MARQUEE_H = 560;

const screenshotFiles = [
  "logtime-basic.png",
  "logtime-compact.png",
  "logtime-heatmap.png",
  "achievements.png",
  "friends.png",
  "pending-evaluations.png",
  "profile-modal.png",
  "shortcuts-settings.png",
  "intra.png",
];

async function convertScreenshot(file) {
  const name = basename(file, extname(file));
  await sharp(join(srcDir, file))
    .resize(SCREENSHOT_W, SCREENSHOT_H, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255 },
    })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .toFile(join(outDir, `${name}-screenshot.png`));
  console.log(`  screenshot  → ${name}-screenshot.png`);
}

async function convertPromo(file) {
  const name = basename(file, extname(file));

  await sharp(join(srcDir, file))
    .resize(PROMO_SMALL_W, PROMO_SMALL_H, {
      fit: "cover",
      position: "centre",
    })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .toFile(join(outDir, `${name}-promo-small.png`));
  console.log(`  promo small → ${name}-promo-small.png`);

  await sharp(join(srcDir, file))
    .resize(PROMO_MARQUEE_W, PROMO_MARQUEE_H, {
      fit: "cover",
      position: "centre",
    })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .toFile(join(outDir, `${name}-promo-marquee.png`));
  console.log(`  promo big   → ${name}-promo-marquee.png`);
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  console.log("Generating store images...\n");

  console.log("Screenshots (1280×800):");
  for (const file of screenshotFiles) {
    await convertScreenshot(file);
  }

  console.log("\nPromotional images (from intra.png):");
  await convertPromo("intra.png");

  console.log(`\nDone — ${outDir} is ready for Chrome Web Store upload.`);
}

main().catch(console.error);