import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import path from "path";

const root = path.resolve(__dirname, "../..");

export default defineConfig(({ command, mode }) => {
  return {
    logLevel: "info",
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        // Core engine (built to demo/svelte/src/snapengine/)
        "@snap-engine/core/animation": path.resolve(__dirname, "src/snapengine/animation.mjs"),
        "@snap-engine/core/collision": path.resolve(__dirname, "src/snapengine/collision.mjs"),
        "@snap-engine/core/debug": path.resolve(__dirname, "src/snapengine/debug.mjs"),
        "@snap-engine/core": path.resolve(__dirname, "src/snapengine/snapengine.mjs"),
        // Asset packages (raw source)
        "@snap-engine/base-svelte": path.resolve(root, "assets/snapengine-asset-base/svelte/src/index.ts"),
        "@snap-engine/base": path.resolve(root, "assets/snapengine-asset-base/core/src/index.ts"),
        "@snap-engine/drop-and-snap-svelte": path.resolve(root, "assets/drop-and-snap/svelte/src/index.ts"),
        "@snap-engine/drop-and-snap": path.resolve(root, "assets/drop-and-snap/core/src/index.ts"),
        "@snap-engine/snapline-svelte": path.resolve(root, "assets/snapline/svelte/src/index.ts"),
        "@snap-engine/snapline": path.resolve(root, "assets/snapline/core/src/index.ts"),
      },
    },
    publicDir: path.resolve(__dirname, "../../website/static"),
    plugins: [svelte()],
    server: {
      port: 3001,
      open: false,
      strictPort: true,
      preTransformRequests: false,
    },
  };
});
