import { defineConfig, devices } from "@playwright/test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const sveltePort = Number(process.env.SNAPSORT_SVELTE_TEST_PORT ?? 3027);
const reactPort = Number(process.env.SNAPSORT_REACT_TEST_PORT ?? 3031);
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const frameworkProjects = [
  { framework: "svelte", port: sveltePort },
  { framework: "react", port: reactPort },
] as const;

// Webkit and Firefox are temporarily out of the default matrix to keep local
// runs fast; re-add entries here to widen coverage.
const browserProjects = [
  { browser: "chromium", use: devices["Desktop Chrome"] },
] as const;

export default defineConfig({
  testDir: ".",
  testMatch: [
    "snapsort-drag-snapshot.spec.ts",
    "snapsort-duolingo.spec.ts",
    "snapsort-adapter-ghosts.spec.ts",
  ],
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  projects: frameworkProjects.flatMap(({ framework, port }) =>
    browserProjects.map(({ browser, use }) => ({
      name: `${framework}-${browser}`,
      use: {
        ...use,
        baseURL: `http://127.0.0.1:${port}`,
        screenshot: "only-on-failure" as const,
        trace: "retain-on-failure" as const,
        viewport: { width: 1400, height: 950 },
      },
    })),
  ),
  webServer: [
    {
      cwd: repoRoot,
      command: `npx vite serve demo/svelte --config demo/svelte/vite.config.mjs --host 127.0.0.1 --port ${sveltePort} --strictPort --force`,
      url: `http://127.0.0.1:${sveltePort}`,
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      cwd: repoRoot,
      command: `npx vite serve demo/react --config demo/react/vite.config.mjs --host 127.0.0.1 --port ${reactPort} --strictPort --force`,
      url: `http://127.0.0.1:${reactPort}`,
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});
