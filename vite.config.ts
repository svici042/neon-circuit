import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "node:url";

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
  };
});
