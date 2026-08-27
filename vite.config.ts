/**
 * Vite uses `/` for local development and `/neon-circuit/` for production and
 * preview so GitHub Pages asset URLs resolve below the repository subpath.
 * Vitest is deliberately scoped to project tests to ignore copied dependencies,
 * build output, archives, caches, and temporary directories.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ command, isPreview }) => {
  const isProductionOutput = command === "build" || isPreview;

  return {
    base: isProductionOutput ? "/neon-circuit/" : "/",
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(projectRoot, "./src"),
      },
    },
    test: {
      include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.mjs"],
      exclude: [
        "**/node_modules/**",
        "**/node_modules-*/**",
        "**/node_modules_*/**",
        "**/dist/**",
        "**/coverage/**",
        "**/.bundle-analysis/**",
        "**/.vite/**",
        "**/{tmp,temp}/**",
        "**/*.zip",
      ],
    },
  };
});
