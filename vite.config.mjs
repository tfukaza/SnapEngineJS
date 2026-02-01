const framework = process.env.FRAMEWORK;

import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig(({ command, mode }) => {
  let outputDir = "dist";
  if (mode === "development") {
    switch (framework) {
      case "vanilla":
        outputDir = "demo/vanilla/snapengine";
        break;
      case "react":
        outputDir = "demo/react/src/snapengine";
        break;
      case "svelte":
        outputDir = "demo/svelte/src/snapengine";
        break;
      case "test":
        break;
      default:
        throw new Error("Invalid FRAMEWORK_ENV");
    }
  }
  return {
    logLevel: "info",
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
      },
    },
    build: {
      lib: {
        entry: {
          snapengine: resolve(__dirname, "src/index.ts"),
          debug: resolve(__dirname, "src/debug.ts"),
          "camera-control": resolve(__dirname, "src/asset/cameraControl.ts"),
          animation: resolve(__dirname, "src/animation.ts"),
          collision: resolve(__dirname, "src/collision.ts"),
        },
        name: "SnapEngine",
        formats: ["es"],
        fileName: (format, entryName) => `${entryName}.mjs`,
      },
      outDir: outputDir,
      minify: mode === "production" ? "terser" : false,
      terserOptions: {
        toplevel: true,
        mangle: {
          properties: {
            regex: /^(_|#)/,
          },
        },
        module: true,
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
    },
  };
});
