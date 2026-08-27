/**
 * Post-build guard for GitHub Pages: production HTML must reference emitted
 * files below `/neon-circuit/`, never the source entry or an escaping path.
 */
import { access, readFile } from "node:fs/promises";
import path from "node:path";

const outputDirectory = path.resolve("dist");
const html = await readFile(path.join(outputDirectory, "index.html"), "utf8");
const assetReferences = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]);

if (html.includes("/src/main.tsx")) {
  throw new Error("Production HTML still references the source entry module");
}

const productionAssets = assetReferences.filter((reference) => reference.startsWith("/neon-circuit/assets/"));
if (productionAssets.length === 0) {
  throw new Error("Production HTML contains no GitHub Pages asset references");
}

for (const reference of productionAssets) {
  const relativePath = reference.slice("/neon-circuit/".length);
  const assetPath = path.resolve(outputDirectory, relativePath);
  if (!assetPath.startsWith(`${outputDirectory}${path.sep}`)) {
    throw new Error(`Production asset escapes dist: ${reference}`);
  }
  await access(assetPath);
}
