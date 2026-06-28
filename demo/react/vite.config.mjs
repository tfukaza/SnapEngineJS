import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const root = path.resolve(__dirname, "../..");

export default defineConfig(({ command, mode }) => {
  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@snap-engine/core/animation": path.resolve(root, "src/animation.ts"),
        "@snap-engine/core/collision": path.resolve(root, "src/collision.ts"),
        "@snap-engine/core/debug": path.resolve(root, "src/debug.ts"),
        "@snap-engine/core": path.resolve(root, "src/index.ts"),
        "@snap-engine/snapline-react": path.resolve(
          root,
          "assets/snapline/react/src/index.ts",
        ),
        "@snap-engine/snapline": path.resolve(
          root,
          "assets/snapline/core/src/index.ts",
        ),
      },
    },
    server: {
      port: 3001,
      open: false,
      strictPort: true,
      preTransformRequests: false,
    },
  };
});
