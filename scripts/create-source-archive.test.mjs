import { describe, expect, it } from "vitest";
import { shouldExclude } from "./create-source-archive.mjs";

describe("source archive exclusions", () => {
  it.each([
    ".git/config",
    "node_modules/react/index.js",
    "dist/assets/app.js",
    "coverage/index.html",
    ".vite/manifest.json",
    "logs/dev.log",
    ".env",
    ".env.local",
    "debug.log",
    "scratch.tmp",
    "neon-circuit-source.zip",
  ])("excludes %s", (file) => {
    expect(shouldExclude(file)).toBe(true);
  });

  it.each([
    "package.json",
    "package-lock.json",
    ".github/workflows/deploy.yml",
    "scripts/verify-pages-build.mjs",
    "src/game/tracks.ts",
    "README.md",
    ".env.example",
  ])("includes %s", (file) => {
    expect(shouldExclude(file)).toBe(false);
  });
});
