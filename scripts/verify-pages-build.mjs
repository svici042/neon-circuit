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
  await access(path.join(outputDirectory, relativePath));
}
