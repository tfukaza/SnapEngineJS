import { expect, test, type Locator, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

type Rect = { x: number; y: number; width: number; height: number };

type DragSample = {
  step: number;
  mouse: { x: number; y: number };
  spacerCount: number;
  spacer: Rect | null;
  dragged: (Rect & { centerX: number; centerY: number }) | null;
  draggedCenterDelta: number | null;
};

type DomTraceEntry = {
  type: string;
  target: string;
  parent?: string;
  before?: string | null;
  time: number;
};

async function installSnapsortTrace(page: Page) {
  await page.addInitScript(() => {
    const win = window as unknown as {
      __snapsortTrace: {
        dom: DomTraceEntry[];
        mutations: Array<{ type: string; target: string; attr: string | null; time: number }>;
      };
      __snapsortActiveText?: string;
      __snapsortActiveIndex?: number;
      __snapsortActiveGid?: string;
    };

    const trace = {
      dom: [] as DomTraceEntry[],
      mutations: [] as Array<{
        type: string;
        target: string;
        attr: string | null;
        time: number;
      }>,
    };
    win.__snapsortTrace = trace;

    const describe = (node: unknown) => {
      if (!(node instanceof Element)) return String(node);
      const text = node.textContent?.trim().replace(/\s+/g, " ").slice(0, 40);
      const id = node.id ? `#${node.id}` : "";
      const classes = [...node.classList].slice(0, 4).join(".");
      return `${node.tagName.toLowerCase()}${id}${classes ? `.${classes}` : ""}${text ? ` "${text}"` : ""}`;
    };

    const shouldTrace = (node: unknown) =>
      node instanceof Element &&
      (node.id === "spacer" ||
        node.classList.contains("snapsort-item-wrapper") ||
        node.classList.contains("snapsort-container") ||
        node.closest?.(".snapsort-container") != null);

    const originalAppendChild = Node.prototype.appendChild;
    Node.prototype.appendChild = function <T extends Node>(child: T): T {
      if (shouldTrace(child) || shouldTrace(this)) {
        trace.dom.push({
          type: "appendChild",
          target: describe(child),
          parent: describe(this),
          time: performance.now(),
        });
      }
      return originalAppendChild.call(this, child) as T;
    };

    const originalInsertBefore = Node.prototype.insertBefore;
    Node.prototype.insertBefore = function <T extends Node>(
      child: T,
      before: Node | null,
    ): T {
      if (shouldTrace(child) || shouldTrace(this)) {
        trace.dom.push({
          type: "insertBefore",
          target: describe(child),
          parent: describe(this),
          before: before ? describe(before) : null,
          time: performance.now(),
        });
      }
      return originalInsertBefore.call(this, child, before) as T;
    };

    const originalRemove = Element.prototype.remove;
    Element.prototype.remove = function () {
      if (shouldTrace(this)) {
        trace.dom.push({
          type: "remove",
          target: describe(this),
          parent: describe(this.parentElement),
          time: performance.now(),
        });
      }
      return originalRemove.call(this);
    };

    new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (shouldTrace(mutation.target)) {
          trace.mutations.push({
            type: mutation.type,
            target: describe(mutation.target),
            attr: mutation.attributeName,
            time: performance.now(),
          });
        }
      }
    }).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-engine-gid"],
      childList: true,
      subtree: true,
    });
  });
}

function center(rect: Rect) {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

async function itemRect(item: Locator): Promise<Rect> {
  const box = await item.boundingBox();
  if (!box) throw new Error("Expected item to have a bounding box.");
  return box;
}

async function itemByText(page: Page, text: string, index = 0) {
  const locator = page
    .locator(".snapsort-item-wrapper")
    .filter({ hasText: text })
    .nth(index);
  await expect(locator).toBeVisible();
  return locator;
}

async function demoBoxByHeading(page: Page, heading: string) {
  const box = page
    .locator(".demo-box")
    .filter({ has: page.getByRole("heading", { name: heading }) });
  await expect(box).toBeVisible();
  return box;
}

async function itemByTextIn(parent: Locator, text: string, index = 0) {
  const locator = parent
    .locator(".snapsort-item-wrapper")
    .filter({ hasText: text })
    .nth(index);
  await expect(locator).toBeVisible();
  return locator;
}

async function collectSample(
  page: Page,
  step: number,
  mouse: { x: number; y: number },
): Promise<DragSample> {
  return page.evaluate(
    ({ step, mouse }) => {
      const win = window as unknown as {
        __snapsortActiveText?: string;
        __snapsortActiveIndex?: number;
        __snapsortActiveGid?: string;
      };
      const rectOf = (element: Element | null) => {
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        };
      };
      const activeGid = win.__snapsortActiveGid ?? "";
      const draggedElement = document.querySelector(
        `[data-engine-gid="${activeGid}"]`,
      );
      const draggedRect = rectOf(draggedElement);
      const dragged = draggedRect
        ? {
            ...draggedRect,
            centerX: draggedRect.x + draggedRect.width / 2,
            centerY: draggedRect.y + draggedRect.height / 2,
          }
        : null;
      return {
        step,
        mouse,
        spacerCount: document.querySelectorAll("#spacer").length,
        spacer: rectOf(document.querySelector("#spacer")),
        dragged,
        draggedCenterDelta: dragged
          ? Math.hypot(dragged.centerX - mouse.x, dragged.centerY - mouse.y)
          : null,
      };
    },
    { step, mouse },
  );
}

async function dragBy(
  page: Page,
  source: Locator,
  text: string,
  index: number,
  delta: { x: number; y: number },
): Promise<DragSample[]> {
  const sourceRect = await itemRect(source);
  const activeGid = await source.getAttribute("data-engine-gid");
  const start = center(sourceRect);
  await page.evaluate(
    ({ text, index, activeGid }) => {
      const win = window as unknown as {
        __snapsortActiveText?: string;
        __snapsortActiveIndex?: number;
        __snapsortActiveGid?: string;
      };
      win.__snapsortActiveText = text;
      win.__snapsortActiveIndex = index;
      win.__snapsortActiveGid = activeGid ?? "";
    },
    { text, index, activeGid },
  );

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();

  const samples: DragSample[] = [];
  for (let step = 1; step <= 18; step++) {
    const mouse = {
      x: start.x + (delta.x * step) / 18,
      y: start.y + (delta.y * step) / 18,
    };
    await page.mouse.move(mouse.x, mouse.y);
    await page.waitForTimeout(25);
    samples.push(await collectSample(page, step, mouse));
  }

  await page.mouse.up();
  await page.waitForTimeout(100);
  return samples;
}

async function dragTo(
  page: Page,
  source: Locator,
  text: string,
  index: number,
  target: Locator,
): Promise<DragSample[]> {
  const sourceCenter = center(await itemRect(source));
  const targetCenter = center(await itemRect(target));
  return dragBy(page, source, text, index, {
    x: targetCenter.x - sourceCenter.x,
    y: targetCenter.y - sourceCenter.y,
  });
}

async function writeJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2));
}

async function expectStableDrag(
  page: Page,
  samples: DragSample[],
  consoleMessages: string[],
  outputPath: string,
) {
  const trace = await page.evaluate(() => {
    const win = window as unknown as {
      __snapsortTrace?: { dom: DomTraceEntry[]; mutations: unknown[] };
    };
    return win.__snapsortTrace;
  });
  await writeJson(outputPath, {
    samples,
    trace,
    layoutLogs: consoleMessages.filter((message) =>
      /\[updateDropTarget\]|\[updateGhostElement\]|\[insertItemAt\]|\[removeItemFrom\]|determineDropTarget|chosen|candidate/.test(
        message,
      ),
    ),
    errors: consoleMessages.filter((message) =>
      /error|Missing drag snapshot|Unhandled|TypeError/i.test(message),
    ),
  });

  expect(samples, "drag should produce frame samples").not.toHaveLength(0);
  expect(
    samples.filter((sample) => sample.spacerCount !== 1),
    "the spacer should not disappear or duplicate while dragging",
  ).toHaveLength(0);
  expect(
    Math.max(...samples.map((sample) => sample.draggedCenterDelta ?? 999)),
    "dragged item center should remain close to the pointer",
  ).toBeLessThan(12);
  expect(
    consoleMessages.filter((message) =>
      /Missing drag snapshot|Unhandled|TypeError|ReferenceError/i.test(message),
    ),
  ).toHaveLength(0);
}

test.describe("Snapsort drag-start snapshot layout", () => {
  test.beforeEach(async ({ page }) => {
    await installSnapsortTrace(page);
  });

  test("keeps one stable spacer while reordering a flat nested-items list", async ({
    page,
  }, testInfo) => {
    const consoleMessages: string[] = [];
    page.on("console", (message) => consoleMessages.push(message.text()));
    await page.goto("/?demo=nested_items", { waitUntil: "networkidle" });
    await page.screenshot({
      path: testInfo.outputPath("nested-flat-before.png"),
      fullPage: true,
    });

    const item = await itemByText(page, "Item B");
    const samples = await dragBy(page, item, "Item B", 0, { x: 0, y: 110 });
    await page.screenshot({
      path: testInfo.outputPath("nested-flat-after.png"),
      fullPage: true,
    });

    await expectStableDrag(
      page,
      samples,
      consoleMessages,
      testInfo.outputPath("nested-flat-trace.json"),
    );
  });

  test("keeps nested container drop prediction stable for padded sub-items", async ({
    page,
  }, testInfo) => {
    const consoleMessages: string[] = [];
    page.on("console", (message) => consoleMessages.push(message.text()));
    await page.goto("/?demo=nested_items", { waitUntil: "networkidle" });
    await page.screenshot({
      path: testInfo.outputPath("nested-subitem-before.png"),
      fullPage: true,
    });

    const item = await itemByText(page, "Sub A2");
    const samples = await dragBy(page, item, "Sub A2", 0, { x: 0, y: 95 });
    await page.screenshot({
      path: testInfo.outputPath("nested-subitem-after.png"),
      fullPage: true,
    });

    await expectStableDrag(
      page,
      samples,
      consoleMessages,
      testInfo.outputPath("nested-subitem-trace.json"),
    );
  });

  test("resolves multiple-drop-area container conflicts without spacer flicker", async ({
    page,
  }, testInfo) => {
    const consoleMessages: string[] = [];
    page.on("console", (message) => consoleMessages.push(message.text()));
    await page.goto("/?demo=drag_drop", { waitUntil: "networkidle" });
    await page.screenshot({
      path: testInfo.outputPath("multi-area-before.png"),
      fullPage: true,
    });

    const item = await itemByText(page, "Item B");
    const target = await itemByText(page, "Item Y");
    const samples = await dragTo(page, item, "Item B", 0, target);
    await page.screenshot({
      path: testInfo.outputPath("multi-area-after.png"),
      fullPage: true,
    });

    await expectStableDrag(
      page,
      samples,
      consoleMessages,
      testInfo.outputPath("multi-area-trace.json"),
    );
  });

  test("keeps wrapped row indices aligned beyond the first row", async ({
    page,
  }, testInfo) => {
    const consoleMessages: string[] = [];
    page.on("console", (message) => consoleMessages.push(message.text()));
    await page.goto("/?demo=drag_drop", { waitUntil: "networkidle" });
    const doubleRow = await demoBoxByHeading(page, "Horizontal Double Row");
    await page.screenshot({
      path: testInfo.outputPath("wrapped-row-before.png"),
      fullPage: true,
    });

    const item = await itemByTextIn(doubleRow, "Item 1");
    const target = await itemByTextIn(doubleRow, "Item 9");
    const samples = await dragTo(page, item, "Item 1", 0, target);
    await page.screenshot({
      path: testInfo.outputPath("wrapped-row-after.png"),
      fullPage: true,
    });

    await expectStableDrag(
      page,
      samples,
      consoleMessages,
      testInfo.outputPath("wrapped-row-trace.json"),
    );

    const order = await doubleRow
      .locator(".snapsort-item-wrapper")
      .evaluateAll((elements) =>
        elements.map((element) => element.textContent?.trim()),
      );
    expect(order.slice(0, 10)).toEqual([
      "Item 2",
      "Item 3",
      "Item 4",
      "Item 5",
      "Item 6",
      "Item 7",
      "Item 8",
      "Item 9",
      "Item 1",
      "Item 10",
    ]);
  });
});
