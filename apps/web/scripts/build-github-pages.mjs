import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const webDir = resolve(scriptDir, "..");
const sourceDir = join(webDir, "github-pages");
const outputDir = join(webDir, "github-pages-dist");

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await cp(sourceDir, outputDir, { recursive: true });
await mkdir(join(outputDir, "images"), { recursive: true });
await cp(
  join(webDir, "public/images/mios-factory-hero.png"),
  join(outputDir, "images/mios-factory-hero.png"),
);

console.log(`GitHub Pages site generated at ${outputDir}`);
