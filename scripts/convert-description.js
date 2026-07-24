import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = resolve(__dirname, "../CHROME_LISTING.md");
const outDir = resolve(__dirname, "../images-store");
const out = resolve(outDir, "description.txt");

let text = readFileSync(src, "utf-8");

text = text
  .replace(/^# (.+)$/gm, "\n$1\n")
  .replace(/^### (.+)$/gm, "$1")
  .replace(/\*\*(.+?)\*\*/g, "$1")
  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
  .replace(/^---+$/gm, "")
  .replace(/\n{3,}/g, "\n\n")
  .trim() + "\n";

mkdirSync(outDir, { recursive: true });
writeFileSync(out, text);
console.log(`Written to ${out}`);
