import { defineConfig } from "@playwright/test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const port = Number(process.env.CAMERA_CONTROL_TEST_PORT ?? 3028);
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export default defineConfig({
  testDir: ".",
  testMatch: "camera-control.spec.ts",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    channel: "chrome",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    viewport: { width: 1280, height: 820 },
  },
  webServer: {
    cwd: repoRoot,
    command: `FRAMEWORK=svelte npx vite build --mode development && npx vite serve demo/svelte --config demo/svelte/vite.config.mjs --host 127.0.0.1 --port ${port} --strictPort --force`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
