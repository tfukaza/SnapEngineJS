import { expect, test, type Locator, type Page } from "@playwright/test";

async function rect(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("Expected locator to have a bounding box.");
  return box;
}

function center(box: { x: number; y: number; width: number; height: number }) {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function verticalColumn(page: Page): Promise<Locator> {
  const cell = page.locator(".demo-cell", {
    has: page.getByRole("heading", { name: "Vertical Column" }),
  });
  await expect(cell).toBeVisible();
  return cell.locator(".snapsort-container").first();
}

async function setGhostRemoveAvailable(page: Page, available: boolean) {
  const coreImportPath = `/@fs${process.cwd()}/src/index.ts`;
  await page.evaluate(
    async ({ coreImportPath, available }) => {
      const { GlobalManager } = await import(coreImportPath);
      const cell = [...document.querySelectorAll(".demo-cell")].find(
        (element) =>
          element.querySelector("h2")?.textContent?.trim() ===
          "Vertical Column",
      );
      const element = cell?.querySelector(".snapsort-container");
      const containers =
        GlobalManager.getInstance().data.dragAndDropContainers ?? [];
      const container = containers.find(
        (candidate: any) => candidate.element === element,
      );
      if (!container) throw new Error("Could not find the Vertical Column.");

      const testState = globalThis as typeof globalThis & {
        __snapsortGhostRemove?: (...args: any[]) => void;
      };
      if (!available) {
        testState.__snapsortGhostRemove =
          container.config.callbacks?.onGhostRemove;
        container.config.callbacks.onGhostRemove = undefined;
      } else {
        container.config.callbacks.onGhostRemove =
          testState.__snapsortGhostRemove;
      }
    },
    { coreImportPath, available },
  );
}

async function setItemMoveFailure(page: Page, enabled: boolean) {
  const coreImportPath = `/@fs${process.cwd()}/src/index.ts`;
  await page.evaluate(
    async ({ coreImportPath, enabled }) => {
      const { GlobalManager } = await import(coreImportPath);
      const cell = [...document.querySelectorAll(".demo-cell")].find(
        (element) =>
          element.querySelector("h2")?.textContent?.trim() ===
          "Vertical Column",
      );
      const element = cell?.querySelector(".snapsort-container");
      const containers =
        GlobalManager.getInstance().data.dragAndDropContainers ?? [];
      const container = containers.find(
        (candidate: any) => candidate.element === element,
      );
      if (!container) throw new Error("Could not find the Vertical Column.");

      const testState = globalThis as typeof globalThis & {
        __snapsortItemMoveFailure?: {
          config: Record<string, any>;
          descriptor: PropertyDescriptor;
          callbacks: Record<string, any>;
          original?: (...args: any[]) => void;
        };
      };
      if (enabled) {
        const config = container.config as Record<string, any>;
        const descriptor = Object.getOwnPropertyDescriptor(config, "callbacks");
        if (!descriptor) throw new Error("Container has no callbacks config.");
        const state = {
          config,
          descriptor,
          callbacks: config.callbacks as Record<string, any>,
          original: config.callbacks?.onItemMove as
            | ((...args: any[]) => void)
            | undefined,
        };
        if (!state.original) {
          throw new Error("Vertical Column has no onItemMove.");
        }
        const wrap = (callbacks: Record<string, any>) => {
          state.original = callbacks.onItemMove;
          return {
            ...callbacks,
            onItemMove: (...args: any[]) => {
              state.original?.(...args);
              throw new Error("intentional scheduled onItemMove failure");
            },
          };
        };
        state.callbacks = wrap(state.callbacks);
        Object.defineProperty(config, "callbacks", {
          configurable: true,
          enumerable: descriptor.enumerable,
          get: () => state.callbacks,
          set: (callbacks: Record<string, any>) => {
            state.callbacks = wrap(callbacks);
          },
        });
        testState.__snapsortItemMoveFailure = state;
      } else {
        const state = testState.__snapsortItemMoveFailure;
        if (!state) return;
        Object.defineProperty(state.config, "callbacks", {
          ...state.descriptor,
          value: {
            ...state.callbacks,
            onItemMove: state.original,
          },
        });
      }
    },
    { coreImportPath, enabled },
  );
}

async function verticalColumnSessionStatus(page: Page): Promise<string | null> {
  const coreImportPath = `/@fs${process.cwd()}/src/index.ts`;
  return page.evaluate(
    async ({ coreImportPath }) => {
      const { GlobalManager } = await import(coreImportPath);
      const cell = [...document.querySelectorAll(".demo-cell")].find(
        (element) =>
          element.querySelector("h2")?.textContent?.trim() ===
          "Vertical Column",
      );
      const element = cell?.querySelector(".snapsort-container");
      const containers =
        GlobalManager.getInstance().data.dragAndDropContainers ?? [];
      const container = containers.find(
        (candidate: any) => candidate.element === element,
      );
      return container?.rootContainer?.dragSession?.status ?? null;
    },
    { coreImportPath },
  );
}

test("bad framework callbacks fail before activation without stopping the next drag", async ({
  page,
}) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  await page.goto("/?demo=drop_snap_nested", { waitUntil: "networkidle" });

  const column = await verticalColumn(page);
  const first = column.locator(".snapsort-item").first();
  const start = center(await rect(first));

  await setGhostRemoveAvailable(page, false);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 8, start.y + 8);
  await page.waitForTimeout(100);
  await page.mouse.up();

  expect(
    pageErrors.some((error) =>
      error.message.includes("callbacks.onGhostRemove"),
    ),
  ).toBe(true);
  await expect(column.locator('[data-snapsort-dragging="true"]')).toHaveCount(
    0,
  );
  await expect(column.locator("[data-snapsort-ghost-entry]")).toHaveCount(0);

  await setGhostRemoveAvailable(page, true);
  const last = column.locator(".snapsort-item").last();
  const retryStart = center(await rect(first));
  const retryTarget = center(await rect(last));
  await page.mouse.move(retryStart.x, retryStart.y);
  await page.mouse.down();
  await page.mouse.move(retryStart.x + 8, retryStart.y + 8);
  await page.waitForTimeout(60);
  await page.mouse.move(retryTarget.x, retryTarget.y + 20, { steps: 12 });
  await page.waitForTimeout(100);
  await page.mouse.up();
  await page.waitForTimeout(220);

  await expect(column.locator("[data-snapsort-ghost-entry]")).toHaveCount(0);
  const order = await column
    .locator(".snapsort-item")
    .evaluateAll((elements) =>
      elements.map((element) => element.textContent?.trim()),
    );
  expect(order).toEqual(["Item 2", "Item 3", "Item 4", "Item 1"]);
});

test("a throwing scheduled mutation is reported and cleanup keeps the frame loop alive", async ({
  page,
}) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  await page.goto("/?demo=drop_snap_nested", { waitUntil: "networkidle" });

  const column = await verticalColumn(page);
  const first = column.locator(".snapsort-item").first();
  const start = center(await rect(first));

  await setItemMoveFailure(page, true);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 8, start.y + 8);
  await page.waitForTimeout(80);
  await page.mouse.up();
  await page.waitForTimeout(180);

  expect(
    pageErrors.some((error) =>
      error.message.includes("intentional scheduled onItemMove failure"),
    ),
  ).toBe(true);
  await expect(column.locator('[data-snapsort-dragging="true"]')).toHaveCount(
    0,
  );
  await expect(column.locator("[data-snapsort-ghost-entry]")).toHaveCount(0);
  expect(await verticalColumnSessionStatus(page)).toBeNull();

  await setItemMoveFailure(page, false);
  const retryFirst = column.locator(".snapsort-item").first();
  const retryLast = column.locator(".snapsort-item").last();
  const retryStart = center(await rect(retryFirst));
  const retryTarget = center(await rect(retryLast));
  await page.mouse.move(retryStart.x, retryStart.y);
  await page.mouse.down();
  await page.mouse.move(retryStart.x + 8, retryStart.y + 8);
  await page.waitForTimeout(60);
  await page.mouse.move(retryTarget.x, retryTarget.y + 20, { steps: 12 });
  await page.waitForTimeout(100);
  await page.mouse.up();
  await page.waitForTimeout(220);

  await expect(column.locator("[data-snapsort-ghost-entry]")).toHaveCount(0);
  const order = await column
    .locator(".snapsort-item")
    .evaluateAll((elements) =>
      elements.map((element) => element.textContent?.trim()),
    );
  expect(order).toEqual(["Item 2", "Item 3", "Item 4", "Item 1"]);
});
