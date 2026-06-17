import { expect, test, type Locator, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  contentBoxOrigin,
  flowLayoutPositions,
  type LayoutNode,
} from "../../assets/snapsort/core/src/layout_engine";

type Rect = { x: number; y: number; width: number; height: number };
type Box = Rect & {
  scaleX: number;
  scaleY: number;
  screenX: number;
  screenY: number;
  margin: { top: number; right: number; bottom: number; left: number };
  padding: { top: number; right: number; bottom: number; left: number };
  border: { top: number; right: number; bottom: number; left: number };
};

type LayoutCase = {
  name: string;
  width: number;
  padding: { top: number; right: number; bottom: number; left: number };
  border: { top: number; right: number; bottom: number; left: number };
  columnGap: number;
  rowGap: number;
  itemWidths: number[];
  itemHeights: number[];
  itemBorders: number[];
};

type BrowserLayoutCase = {
  name: string;
  container: Box;
  items: Array<{ id: string; box: Box }>;
  draggedId: string;
  ghost: { width: number; height: number };
  actualGhosts: Array<{ index: number; x: number; y: number }>;
};

type DragSample = {
  step: number;
  mouse: { x: number; y: number };
  spacerCount: number;
  spacer: Rect | null;
  spacerParentGid: string | null;
  spacerParentKind: string | null;
  spacerParentText: string | null;
  spacerIndex: number | null;
  spacerPrevious: (Rect & { text: string }) | null;
  spacerNext: (Rect & { text: string }) | null;
  spacerDomPrevious: (Rect & { text: string }) | null;
  spacerDomNext: (Rect & { text: string }) | null;
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
        mutations: Array<{
          type: string;
          target: string;
          attr: string | null;
          time: number;
        }>;
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
        node.classList.contains("snapsort-item") ||
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

function layoutBox(
  rect: Rect,
  margin: Partial<Box["margin"]> = {},
  padding: Partial<Box["padding"]> = {},
  border: Partial<Box["border"]> = {},
): Box {
  return {
    ...rect,
    scaleX: 1,
    scaleY: 1,
    screenX: rect.x,
    screenY: rect.y,
    margin: {
      top: margin.top ?? 0,
      right: margin.right ?? 0,
      bottom: margin.bottom ?? 0,
      left: margin.left ?? 0,
    },
    padding: {
      top: padding.top ?? 0,
      right: padding.right ?? 0,
      bottom: padding.bottom ?? 0,
      left: padding.left ?? 0,
    },
    border: {
      top: border.top ?? 0,
      right: border.right ?? 0,
      bottom: border.bottom ?? 0,
      left: border.left ?? 0,
    },
  };
}

test("wraps a horizontal ghost when its trailing margin exceeds the content width", () => {
  const container: LayoutNode<string> = {
    value: "container",
    direction: "row",
    locked: false,
    isGhost: false,
    box: layoutBox({ x: 0, y: 0, width: 313, height: 120 }),
    children: [
      {
        value: "item-1",
        direction: "column",
        locked: false,
        isGhost: false,
        box: layoutBox(
          { x: 4, y: 0, width: 100, height: 40 },
          { left: 4, right: 4 },
        ),
        children: [],
      },
      {
        value: "item-2",
        direction: "column",
        locked: false,
        isGhost: false,
        box: layoutBox(
          { x: 112, y: 0, width: 100, height: 40 },
          { left: 4, right: 4 },
        ),
        children: [],
      },
    ],
  };
  const dragged: LayoutNode<string> = {
    value: "dragged",
    direction: "column",
    locked: false,
    isGhost: false,
    box: layoutBox(
      { x: 0, y: 0, width: 90, height: 40 },
      { left: 4, right: 4 },
    ),
    children: [],
  };

  const simulated = flowLayoutPositions(container, dragged, 0, 0, {
    container,
    index: 2,
    width: dragged.box.width,
    height: dragged.box.height,
  }).ghostPosition;

  expect(simulated).toEqual({ x: 4, y: 40 });
});

function horizontalDoubleRowLayoutCases(): LayoutCase[] {
  const cases: LayoutCase[] = [];
  for (let width = 236; width <= 356; width += 4) {
    const seed = width * 17;
    const count = 14 + (width % 5);
    const itemWidths = Array.from({ length: count }, (_, index) => {
      return 42 + ((seed + index * 13) % 42);
    });
    const itemHeights = Array.from({ length: count }, (_, index) => {
      return 30 + ((seed + index * 7) % 16);
    });
    const itemBorders = Array.from({ length: count }, (_, index) => {
      return (seed + index * 3) % 4;
    });
    cases.push({
      name: `w${width}`,
      width,
      padding: {
        top: (seed % 9) + 1,
        right: ((seed >> 1) % 13) + 2,
        bottom: ((seed >> 2) % 7) + 1,
        left: ((seed >> 3) % 11) + 2,
      },
      border: {
        top: seed % 5,
        right: (seed + 1) % 6,
        bottom: (seed + 2) % 5,
        left: (seed + 3) % 6,
      },
      columnGap: 4 + (seed % 8),
      rowGap: 3 + ((seed >> 2) % 9),
      itemWidths,
      itemHeights,
      itemBorders,
    });
  }
  return cases;
}

function layoutNodeFromBrowserCase(
  browserCase: BrowserLayoutCase,
): LayoutNode<string> {
  return {
    value: "container",
    direction: "row",
    locked: false,
    isGhost: false,
    box: browserCase.container,
    children: browserCase.items.map((item) => ({
      value: item.id,
      direction: "column",
      locked: false,
      isGhost: false,
      box: item.box,
      children: [],
    })),
  };
}

async function measureBrowserLayoutCases(
  page: Page,
  cases: LayoutCase[],
): Promise<BrowserLayoutCase[]> {
  await page.setContent('<main id="layout-fixture"></main>');
  return page.evaluate((layoutCases) => {
    type BrowserBox = Box;
    type BrowserCase = BrowserLayoutCase;
    const fixture = document.querySelector("#layout-fixture") as HTMLElement;
    const px = (value: number) => `${value}px`;
    const sideCss = (value: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    }) =>
      `${px(value.top)} ${px(value.right)} ${px(value.bottom)} ${px(value.left)}`;
    const boxOf = (element: HTMLElement): BrowserBox => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const number = (value: string) => parseFloat(value) || 0;
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        scaleX: 1,
        scaleY: 1,
        screenX: rect.x,
        screenY: rect.y,
        margin: {
          top: number(style.marginTop),
          right: number(style.marginRight),
          bottom: number(style.marginBottom),
          left: number(style.marginLeft),
        },
        padding: {
          top: number(style.paddingTop),
          right: number(style.paddingRight),
          bottom: number(style.paddingBottom),
          left: number(style.paddingLeft),
        },
        border: {
          top: number(style.borderTopWidth),
          right: number(style.borderRightWidth),
          bottom: number(style.borderBottomWidth),
          left: number(style.borderLeftWidth),
        },
      };
    };
    const makeItem = (
      id: string,
      width: number,
      height: number,
      border: number,
      isGhost = false,
    ) => {
      const item = document.createElement("div");
      item.dataset.itemId = id;
      item.textContent = id;
      item.style.boxSizing = "border-box";
      item.style.flex = "0 0 auto";
      item.style.width = px(width);
      item.style.height = px(height);
      item.style.border = `${px(border)} solid ${isGhost ? "#b45309" : "#2563eb"}`;
      item.style.padding = `${px((width + height) % 5)} ${px((width + border) % 7)}`;
      item.style.background = isGhost ? "#fef3c7" : "#dbeafe";
      return item;
    };
    const buildContainer = (entry: LayoutCase) => {
      fixture.innerHTML = "";
      const container = document.createElement("section");
      container.style.boxSizing = "border-box";
      container.style.display = "flex";
      container.style.flexDirection = "row";
      container.style.flexWrap = "wrap";
      container.style.alignItems = "flex-start";
      container.style.alignContent = "flex-start";
      container.style.width = px(entry.width);
      container.style.padding = sideCss(entry.padding);
      container.style.borderStyle = "solid";
      container.style.borderColor = "#111827";
      container.style.borderWidth = sideCss(entry.border);
      container.style.columnGap = px(entry.columnGap);
      container.style.rowGap = px(entry.rowGap);
      container.style.margin = "16px";
      fixture.appendChild(container);
      return container;
    };

    return layoutCases.map((entry) => {
      const draggedIndex = Math.min(3, entry.itemWidths.length - 1);
      const draggedId = `item-${draggedIndex}`;
      let container = buildContainer(entry);
      const itemElements = entry.itemWidths.map((width, index) => {
        const item = makeItem(
          `item-${index}`,
          width,
          entry.itemHeights[index],
          entry.itemBorders[index],
        );
        container.appendChild(item);
        return item;
      });
      const containerBox = boxOf(container);
      const items = itemElements.map((item) => ({
        id: item.dataset.itemId!,
        box: boxOf(item),
      }));
      const dragged = items[draggedIndex];
      const remaining = items.filter((item) => item.id !== draggedId);
      const actualGhosts: BrowserCase["actualGhosts"] = [];

      for (let index = 0; index <= remaining.length; index++) {
        container = buildContainer(entry);
        for (let i = 0; i <= remaining.length; i++) {
          if (i === index) {
            container.appendChild(
              makeItem(
                "ghost",
                dragged.box.width,
                dragged.box.height,
                entry.itemBorders[draggedIndex],
                true,
              ),
            );
          }
          const remainingItem = remaining[i];
          if (remainingItem) {
            const originalIndex = Number(remainingItem.id.replace("item-", ""));
            container.appendChild(
              makeItem(
                remainingItem.id,
                entry.itemWidths[originalIndex],
                entry.itemHeights[originalIndex],
                entry.itemBorders[originalIndex],
              ),
            );
          }
        }
        const ghost = container.querySelector(
          '[data-item-id="ghost"]',
        ) as HTMLElement;
        const rect = ghost.getBoundingClientRect();
        actualGhosts.push({ index, x: rect.x, y: rect.y });
      }

      return {
        name: entry.name,
        container: containerBox,
        items,
        draggedId,
        ghost: { width: dragged.box.width, height: dragged.box.height },
        actualGhosts,
      };
    });
  }, cases);
}

async function itemRect(item: Locator): Promise<Rect> {
  await item.scrollIntoViewIfNeeded();
  const box = await item.boundingBox();
  if (!box) throw new Error("Expected item to have a bounding box.");
  return box;
}

async function itemByText(page: Page, text: string, index = 0) {
  const locator = page
    .locator(".snapsort-item")
    .filter({ hasText: text })
    .nth(index);
  await expect(locator).toBeVisible();
  return locator;
}

async function demoBoxByHeading(page: Page, heading: string) {
  const box = page
    .locator(".demo-cell")
    .filter({ has: page.getByRole("heading", { name: heading }) });
  await expect(box).toBeVisible();
  return box;
}

async function itemByTextIn(parent: Locator, text: string, index = 0) {
  const locator = parent
    .locator(".snapsort-item")
    .filter({ hasText: text })
    .nth(index);
  await expect(locator).toBeVisible();
  return locator;
}

async function componentArrayList(page: Page) {
  const list = page.locator(".array-list");
  await expect(list).toBeVisible();
  return list;
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
      const describedRectOf = (element: Element | null) => {
        const rect = rectOf(element);
        if (!rect) return null;
        return {
          ...rect,
          text: element?.textContent?.trim().replace(/\s+/g, " ") ?? "",
        };
      };
      const activeGid = win.__snapsortActiveGid ?? "";
      const draggedElement = document.querySelector(
        `[data-engine-gid="${activeGid}"]`,
      );
      const spacerElement = document.querySelector("#spacer");
      const spacerParent = spacerElement?.parentElement ?? null;
      const spacerSiblings = spacerParent
        ? [...spacerParent.children].filter(
            (child) =>
              child.id === "spacer" ||
              child.classList.contains("snapsort-item") ||
              child.classList.contains("snapsort-container"),
          )
        : [];
      const spacerSiblingIndex = spacerElement
        ? spacerSiblings.indexOf(spacerElement)
        : -1;
      const directSiblingTexts = spacerParent
        ? [...spacerParent.children]
            .filter((child) => child.id !== "spacer")
            .map(
              (child) => child.textContent?.trim().replace(/\s+/g, " ") ?? "",
            )
        : [];
      const parentText = directSiblingTexts.join(" | ");
      const spacerParentKind =
        directSiblingTexts.length === 0
          ? null
          : directSiblingTexts.every((text) => /^Sub A\d/.test(text))
            ? "nested-inner"
            : directSiblingTexts.some((text) =>
                  /Item 1\.5|Item 2|Item 3/.test(text),
                )
              ? "nested-outer"
              : directSiblingTexts.some((text) =>
                    /Header|Card Grid|Footer/.test(text),
                  )
                ? "layers-root"
                : directSiblingTexts.some((text) => /Hero Section/.test(text))
                  ? "layers-hero"
                  : directSiblingTexts.some((text) => /Loose Item/.test(text))
                    ? "drag-root"
                    : directSiblingTexts.some((text) => /Group 1 -/.test(text))
                      ? "drag-group-1"
                      : directSiblingTexts.some((text) =>
                            /Group 2 -/.test(text),
                          )
                        ? "drag-group-2"
                        : "other";
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
        spacer: rectOf(spacerElement),
        spacerParentGid: spacerParent?.getAttribute("data-engine-gid") ?? null,
        spacerParentKind,
        spacerParentText: parentText || null,
        spacerIndex: spacerSiblingIndex === -1 ? null : spacerSiblingIndex,
        spacerPrevious:
          spacerSiblingIndex > 0
            ? describedRectOf(spacerSiblings[spacerSiblingIndex - 1])
            : null,
        spacerNext:
          spacerSiblingIndex >= 0 &&
          spacerSiblingIndex < spacerSiblings.length - 1
            ? describedRectOf(spacerSiblings[spacerSiblingIndex + 1])
            : null,
        spacerDomPrevious: describedRectOf(
          spacerElement?.previousElementSibling ?? null,
        ),
        spacerDomNext: describedRectOf(
          spacerElement?.nextElementSibling ?? null,
        ),
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
  options: {
    steps?: number;
    assertCenter?: boolean;
    start?: { x: number; y: number };
  } = {},
): Promise<DragSample[]> {
  const sourceRect = await itemRect(source);
  const activeGid = await source.getAttribute("data-engine-gid");
  const start = options.start ?? center(sourceRect);
  const steps = options.steps ?? 160;
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

  const dragDistance = Math.hypot(delta.x, delta.y);
  const activationRatio =
    dragDistance === 0 ? 0 : Math.min(4 / dragDistance, 1);
  if (activationRatio > 0) {
    await page.mouse.move(
      start.x + delta.x * activationRatio,
      start.y + delta.y * activationRatio,
    );
    await page.waitForTimeout(16);
  }

  const samples: DragSample[] = [];
  for (let step = 1; step <= steps; step++) {
    const ratio = activationRatio + ((1 - activationRatio) * step) / steps;
    const mouse = {
      x: start.x + delta.x * ratio,
      y: start.y + delta.y * ratio,
    };
    await page.mouse.move(mouse.x, mouse.y);
    await page.waitForTimeout(8);
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
  options: { assertCenter?: boolean } = {},
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
  if (options.assertCenter !== false) {
    expect(
      Math.max(...samples.map((sample) => sample.draggedCenterDelta ?? 999)),
      "dragged item center should remain close to the pointer",
    ).toBeLessThan(12);
  }
  expect(
    consoleMessages.filter((message) =>
      /Missing drag snapshot|Unhandled|TypeError|ReferenceError/i.test(message),
    ),
  ).toHaveLength(0);
}

function expectNoSpacerBacktrack(samples: DragSample[], axis: "x" | "y") {
  const positions = samples
    .filter((sample) => sample.spacer)
    .map((sample) => ({
      step: sample.step,
      value: sample.spacer![axis],
    }));

  for (let i = 1; i < positions.length; i++) {
    expect(
      positions[i].value + 8,
      `spacer should not jump backward between steps ${positions[i - 1].step} and ${positions[i].step}`,
    ).toBeGreaterThanOrEqual(positions[i - 1].value);
  }
}

function expectNoNestedParentFlicker(samples: DragSample[]) {
  const kinds = samples
    .map((sample) => sample.spacerParentKind)
    .filter(
      (kind): kind is string =>
        kind === "nested-inner" || kind === "nested-outer",
    );
  const firstInner = kinds.indexOf("nested-inner");
  expect(
    firstInner,
    "drag should enter the nested sub-container",
  ).toBeGreaterThanOrEqual(0);

  for (let i = firstInner + 1; i < kinds.length - 1; i++) {
    expect(
      !(kinds[i] === "nested-outer" && kinds[i + 1] === "nested-inner"),
      "spacer should not briefly leave the nested container and re-enter on a smooth downward drag",
    ).toBe(true);
  }
}

function expectNoSpacerOscillation(samples: DragSample[]) {
  const keys = samples
    .filter((sample) => sample.spacer)
    .map(
      (sample) =>
        `${Math.round(sample.spacer!.x)}:${Math.round(sample.spacer!.y)}:${sample.spacerIndex}`,
    );

  for (let i = 2; i < keys.length; i++) {
    expect(
      !(keys[i] === keys[i - 2] && keys[i] !== keys[i - 1]),
      `spacer should not alternate between ${keys[i - 1]} and ${keys[i]} around sample ${i}`,
    ).toBe(true);
  }
}

function ghostInsertionTargets(consoleMessages: string[]) {
  return consoleMessages.flatMap((message) => {
    const match = message.match(
      /\[updateGhostElement\] inserting ghost at container=([^\s]+) index=(\d+)/,
    );
    return match ? [`${match[1]}[${match[2]}]`] : [];
  });
}

function expectGhostUpdatesStable(
  consoleMessages: string[],
  expectedMaxUpdates: number,
) {
  const targets = ghostInsertionTargets(consoleMessages);
  expect(
    targets.length,
    `ghost should update only at stable slot transitions; saw ${targets.join(" -> ")}`,
  ).toBeLessThanOrEqual(expectedMaxUpdates);

  for (let i = 2; i < targets.length; i++) {
    expect(
      !(targets[i] === targets[i - 2] && targets[i] !== targets[i - 1]),
      `ghost target should not oscillate: ${targets.join(" -> ")}`,
    ).toBe(true);
  }
}

function compressedSpacerStates(samples: DragSample[]) {
  const states = samples
    .filter(
      (sample) =>
        sample.spacerParentKind === "nested-inner" ||
        sample.spacerParentKind === "nested-outer",
    )
    .map((sample) => `${sample.spacerParentKind}[${sample.spacerIndex}]`);

  return states.filter(
    (state, index) => index === 0 || state !== states[index - 1],
  );
}

function expectSpacerAlignedAfterPrevious(
  samples: DragSample[],
  parentKind: string,
  previousPattern: RegExp,
) {
  const sample = samples.find(
    (entry) =>
      entry.spacer &&
      entry.spacerParentKind === parentKind &&
      previousPattern.test(entry.spacerPrevious?.text ?? ""),
  );
  expect(
    sample,
    `expected spacer in ${parentKind} after ${previousPattern}`,
  ).toBeTruthy();

  const previous = sample!.spacerPrevious!;
  const delta = Math.abs(sample!.spacer!.y - (previous.y + previous.height));
  expect(
    delta,
    `spacer should align just below previous sibling; previous=${previous.text} delta=${delta}`,
  ).toBeLessThan(24);
}

function expectSpacerNearDragged(
  samples: DragSample[],
  parentKind: string,
  maxDistance: number,
) {
  const candidates = samples.filter(
    (sample) =>
      sample.spacer && sample.dragged && sample.spacerParentKind === parentKind,
  );
  expect(
    candidates,
    `expected spacer samples in ${parentKind}`,
  ).not.toHaveLength(0);

  const worst = candidates.reduce(
    (current, sample) => {
      const spacerCenterY = sample.spacer!.y + sample.spacer!.height / 2;
      const delta = Math.abs(spacerCenterY - sample.dragged!.centerY);
      return delta > current.delta ? { sample, delta } : current;
    },
    { sample: candidates[0], delta: -Infinity },
  );

  expect(
    worst.delta,
    `spacer center should track dragged item center in ${parentKind}; worst step=${worst.sample.step}`,
  ).toBeLessThan(maxDistance);
}

test.describe("Snapsort drag-start snapshot layout", () => {
  test.beforeEach(async ({ page }) => {
    await installSnapsortTrace(page);
  });

  test("matches browser flex ghost positions for horizontal double-row fuzz cases", async ({
    page,
  }, testInfo) => {
    const cases = horizontalDoubleRowLayoutCases();
    const measuredCases = await measureBrowserLayoutCases(page, cases);
    const failures: Array<{
      name: string;
      index: number;
      expected: { x: number; y: number };
      actual: { x: number; y: number };
      delta: { x: number; y: number };
    }> = [];

    for (const measuredCase of measuredCases) {
      const root = layoutNodeFromBrowserCase(measuredCase);
      const dragged = root.children.find(
        (item) => item.value === measuredCase.draggedId,
      );
      expect(
        dragged,
        `dragged item should exist for ${measuredCase.name}`,
      ).toBeTruthy();

      const origin = contentBoxOrigin(measuredCase.container);
      for (const actual of measuredCase.actualGhosts) {
        const simulated = flowLayoutPositions(
          root,
          dragged!,
          origin.x,
          origin.y,
          {
            container: root,
            index: actual.index,
            width: measuredCase.ghost.width,
            height: measuredCase.ghost.height,
          },
        ).ghostPosition;
        expect(
          simulated,
          `simulated ghost should exist for ${measuredCase.name}[${actual.index}]`,
        ).toBeTruthy();

        const delta = {
          x: Math.abs(simulated!.x - actual.x),
          y: Math.abs(simulated!.y - actual.y),
        };
        if (delta.x > 1.25 || delta.y > 1.25) {
          failures.push({
            name: measuredCase.name,
            index: actual.index,
            expected: { x: actual.x, y: actual.y },
            actual: simulated!,
            delta,
          });
        }
      }
    }

    await writeJson(
      testInfo.outputPath("horizontal-double-row-layout-fuzz.json"),
      {
        caseCount: measuredCases.length,
        slotCount: measuredCases.reduce(
          (count, measuredCase) => count + measuredCase.actualGhosts.length,
          0,
        ),
        failures,
      },
    );

    expect(
      failures.slice(0, 8),
      "layout engine ghost positions should match browser flex positions within 1.25px",
    ).toHaveLength(0);
  });

  test("does not crash when drag movement arrives before snapshot capture", async ({
    page,
  }, testInfo) => {
    const consoleMessages: string[] = [];
    page.on("console", (message) => consoleMessages.push(message.text()));
    await page.goto("/?demo=drop_snap_nested", { waitUntil: "networkidle" });

    const verticalColumn = await demoBoxByHeading(page, "Vertical Column");
    const item = await itemByTextIn(verticalColumn, "Item 1");
    const itemCenter = center(await itemRect(item));

    await page.mouse.move(itemCenter.x, itemCenter.y);
    await page.mouse.down();
    for (let step = 1; step <= 24; step++) {
      await page.mouse.move(itemCenter.x, itemCenter.y + step * 4);
    }
    await page.mouse.up();
    await page.waitForTimeout(100);

    await writeJson(testInfo.outputPath("snapshot-readiness-trace.json"), {
      errors: consoleMessages.filter((message) =>
        /Missing drag snapshot|Unhandled|TypeError|ReferenceError/i.test(
          message,
        ),
      ),
      snapshotWaits: consoleMessages.filter((message) =>
        /waiting for drag snapshot/.test(message),
      ),
    });

    expect(
      consoleMessages.filter((message) =>
        /Missing drag snapshot|Unhandled|TypeError|ReferenceError/i.test(
          message,
        ),
      ),
    ).toHaveLength(0);
  });

  test("animates displaced items when the ghost reorders", async ({
    page,
  }, testInfo) => {
    const consoleMessages: string[] = [];
    page.on("console", (message) => consoleMessages.push(message.text()));
    await page.goto("/?demo=drop_snap_nested", { waitUntil: "networkidle" });

    const verticalColumn = await demoBoxByHeading(page, "Vertical Column");
    const item1 = await itemByTextIn(verticalColumn, "Item 1");
    const item4 = await itemByTextIn(verticalColumn, "Item 4");
    const item1Center = center(await itemRect(item1));
    const item4Center = center(await itemRect(item4));

    await page.mouse.move(item1Center.x, item1Center.y);
    await page.mouse.down();
    await page.mouse.move(item1Center.x, item4Center.y, { steps: 12 });

    const animated = await page.waitForFunction(() => {
      const items = [...document.querySelectorAll(".snapsort-item")].filter(
        (element) =>
          element.id !== "spacer" && !/Item 1/.test(element.textContent ?? ""),
      );
      return items.some((element) =>
        /^translate3d\(/.test((element as HTMLElement).style.transform),
      );
    });
    await page.mouse.up();
    await page.waitForTimeout(120);

    await writeJson(testInfo.outputPath("reorder-animation-trace.json"), {
      animated: await animated.jsonValue(),
      errors: consoleMessages.filter((message) =>
        /Missing drag snapshot|Unhandled|TypeError|ReferenceError/i.test(
          message,
        ),
      ),
    });

    expect(await animated.jsonValue()).toBe(true);
    expect(
      consoleMessages.filter((message) =>
        /Missing drag snapshot|Unhandled|TypeError|ReferenceError/i.test(
          message,
        ),
      ),
    ).toHaveLength(0);
  });

  test("updates framework state when SnapSort DOM insert callbacks reorder an array list", async ({
    page,
  }) => {
    await page.goto("/?demo=snapsort_components", {
      waitUntil: "networkidle",
    });

    const list = await componentArrayList(page);
    await expect(page.locator(".demo-header p")).toHaveText(
      "6 array-backed cards",
    );

    await page.getByRole("button", { name: "Add Item" }).click();
    await expect(page.locator(".demo-header p")).toHaveText(
      "7 array-backed cards",
    );
    await expect(list.locator(".task-card")).toHaveCount(5);

    const deleteButton = page.getByRole("button", { name: "Delete Task 7" });
    await deleteButton.click();
    await expect(page.locator(".demo-header p")).toHaveText(
      "6 array-backed cards",
    );
    await expect(list.locator(".task-card")).toHaveCount(4);

    const upwardItem = await itemByTextIn(list, "Search filters");
    const upwardItemRect = await itemRect(upwardItem);
    const upwardItemCenter = center(upwardItemRect);
    const upwardTarget = await itemByTextIn(list, "Invite flow");
    const upwardTargetCenter = center(await itemRect(upwardTarget));

    await dragBy(page, upwardItem, "Search filters", 0, {
      x: 0,
      y: upwardTargetCenter.y - upwardItemCenter.y - 24,
    }, {
      start: {
        x: upwardItemRect.x + 24,
        y: upwardItemCenter.y,
      },
    });

    await expect(
      list.locator(".task-card .task-main strong"),
    ).toHaveText([
      "Profile fields",
      "Search filters",
      "Invite flow",
      "Audit log",
    ]);

    await page.getByRole("button", { name: "Reset" }).click();
    await expect(page.locator(".demo-header p")).toHaveText(
      "6 array-backed cards",
    );

    const item = await itemByTextIn(list, "Profile fields");
    const itemRectValue = await itemRect(item);
    const itemCenter = center(itemRectValue);
    const target = await itemByTextIn(list, "Search filters");
    const targetCenter = center(await itemRect(target));

    await dragBy(page, item, "Profile fields", 0, {
      x: 0,
      y: targetCenter.y - itemCenter.y + 48,
    }, {
      start: {
        x: itemRectValue.x + 24,
        y: itemCenter.y,
      },
    });

    await expect(
      page.locator(".task-card").filter({ hasText: "Profile fields" }),
    ).toHaveCount(1);

    await expect(page.locator(".demo-header p")).toHaveText(
      "6 array-backed cards",
    );
    await expect(
      list.locator(".task-card .task-main strong"),
    ).toHaveText([
      "Invite flow",
      "Audit log",
      "Search filters",
      "Profile fields",
    ]);

  });

  test("animates a component card moving between columns with SnapEngine FLIP", async ({
    page,
  }) => {
    await page.goto("/?demo=snapsort_components", {
      waitUntil: "networkidle",
    });

    await page.evaluate(() => {
      const win = window as typeof window & {
        __snapsortMoveComponentItem?: (
          itemId: string,
          direction: -1 | 1,
        ) => void;
      };
      win.__snapsortMoveComponentItem?.("item-1", 1);
    });

    const animated = await page.evaluate(async () => {
      for (let frame = 0; frame < 10; frame++) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const movingCard = [...document.querySelectorAll(".task-card")].find(
          (element) =>
            element.getAttribute("data-snapsort-item-key") === "item-1",
        ) as HTMLElement | undefined;
        if (/^translate3d\(-?\d/.test(movingCard?.style.transform ?? "")) {
          return true;
        }
      }
      return false;
    });

    expect(animated).toBe(true);

    const panels = page.locator(".list-panel");
    await expect(panels.nth(0).locator(".task-card .task-main strong"))
      .toHaveText(["Invite flow", "Audit log", "Search filters"]);
    await expect(panels.nth(1).locator(".task-card .task-main strong"))
      .toHaveText(["Profile fields", "Board polish"]);
  });

  test("does not flicker the spacer backward while dragging down a vertical column", async ({
    page,
  }, testInfo) => {
    const consoleMessages: string[] = [];
    page.on("console", (message) => consoleMessages.push(message.text()));
    await page.goto("/?demo=drop_snap_nested", { waitUntil: "networkidle" });

    const verticalColumn = await demoBoxByHeading(page, "Vertical Column");
    const item = await itemByTextIn(verticalColumn, "Item 1");
    const target = await itemByTextIn(verticalColumn, "Item 4");
    const itemCenter = center(await itemRect(item));
    const targetCenter = center(await itemRect(target));
    const samples = await dragBy(page, item, "Item 1", 0, {
      x: 0,
      y: targetCenter.y - itemCenter.y + 48,
    });

    await expectStableDrag(
      page,
      samples,
      consoleMessages,
      testInfo.outputPath("vertical-column-flicker-trace.json"),
    );
    expectNoSpacerBacktrack(samples, "y");
    expectNoSpacerOscillation(samples);
    expectGhostUpdatesStable(consoleMessages, 5);
  });

  test("does not flicker the spacer upward while dragging into a wrapped horizontal row", async ({
    page,
  }, testInfo) => {
    const consoleMessages: string[] = [];
    page.on("console", (message) => consoleMessages.push(message.text()));
    await page.goto("/?demo=drop_snap_nested", { waitUntil: "networkidle" });

    const horizontalRow = await demoBoxByHeading(page, "Horizontal Row");
    const item = await itemByTextIn(horizontalRow, "Item 1");
    const target = await itemByTextIn(horizontalRow, "Item 4");
    const itemCenter = center(await itemRect(item));
    const targetCenter = center(await itemRect(target));
    const samples = await dragBy(page, item, "Item 1", 0, {
      x: 0,
      y: targetCenter.y - itemCenter.y,
    });

    await expectStableDrag(
      page,
      samples,
      consoleMessages,
      testInfo.outputPath("horizontal-row-wrap-flicker-trace.json"),
    );
    expectNoSpacerBacktrack(samples, "y");
    expectNoSpacerOscillation(samples);
    expectGhostUpdatesStable(consoleMessages, 3);
  });

  test("does not flicker out of a nested column after entering it", async ({
    page,
  }, testInfo) => {
    const consoleMessages: string[] = [];
    page.on("console", (message) => consoleMessages.push(message.text()));
    await page.goto("/?demo=drop_snap_nested", { waitUntil: "networkidle" });

    const nested = await demoBoxByHeading(page, "Nested Container");
    const item = await itemByTextIn(nested, "Item 1");
    const target = await itemByTextIn(nested, "Sub A3");
    const samples = await dragTo(page, item, "Item 1", 0, target);

    await expectStableDrag(
      page,
      samples,
      consoleMessages,
      testInfo.outputPath("nested-container-flicker-trace.json"),
    );
    expectNoNestedParentFlicker(samples);
    expectGhostUpdatesStable(consoleMessages, 6);
  });

  test("can reach nested column boundary slots while dragging root item downward", async ({
    page,
  }, testInfo) => {
    const consoleMessages: string[] = [];
    page.on("console", (message) => consoleMessages.push(message.text()));
    await page.goto("/?demo=drop_snap_nested", { waitUntil: "networkidle" });

    const nested = await demoBoxByHeading(page, "Nested Container");
    const item = await itemByTextIn(nested, "Item 1");
    const item3 = await itemByTextIn(nested, "Item 3");
    const itemCenter = center(await itemRect(item));
    const item3Center = center(await itemRect(item3));
    const samples = await dragBy(
      page,
      item,
      "Item 1",
      0,
      {
        x: 0,
        y: item3Center.y - itemCenter.y + 96,
      },
      { steps: 240 },
    );

    await expectStableDrag(
      page,
      samples,
      consoleMessages,
      testInfo.outputPath("nested-boundary-slots-trace.json"),
    );

    const states = compressedSpacerStates(samples);
    const ghostTargets = ghostInsertionTargets(consoleMessages);
    await writeJson(testInfo.outputPath("nested-boundary-slots-states.json"), {
      states,
      ghostTargets,
    });

    expect(
      states,
      `ghost should visit nested container boundary slots; observed ${states.join(" -> ")}`,
    ).toEqual(expect.arrayContaining(["nested-inner[0]", "nested-inner[3]"]));
  });

  test("creates a spacer when dragging a sub-container as an item", async ({
    page,
  }, testInfo) => {
    const consoleMessages: string[] = [];
    page.on("console", (message) => consoleMessages.push(message.text()));
    await page.goto("/?demo=drop_snap_nested", { waitUntil: "networkidle" });

    const cell = await demoBoxByHeading(page, "Draggable Sub-Containers");
    const source = cell
      .locator(".snapsort-container .snapsort-container")
      .filter({ hasText: "Group 1 - A" })
      .first();
    await expect(source).toBeVisible();
    const target = await itemByTextIn(cell, "Loose Item");
    const sourceRect = await itemRect(source);
    const targetCenter = center(await itemRect(target));
    const start = { x: sourceRect.x + 8, y: sourceRect.y + 8 };
    const samples = await dragBy(
      page,
      source,
      "Group 1",
      0,
      {
        x: targetCenter.x - start.x,
        y: targetCenter.y - start.y,
      },
      { start, assertCenter: false },
    );

    await expectStableDrag(
      page,
      samples,
      consoleMessages,
      testInfo.outputPath("drag-container-trace.json"),
      { assertCenter: false },
    );
    expect(
      samples.some((sample) => sample.spacerCount === 1 && sample.spacer),
      "dragging a sub-container should create and move a spacer",
    ).toBe(true);
  });

  test("keeps layer-panel ghost aligned below a labeled sub-container", async ({
    page,
  }, testInfo) => {
    const consoleMessages: string[] = [];
    page.on("console", (message) => consoleMessages.push(message.text()));
    await page.goto("/?demo=drop_snap_nested", { waitUntil: "networkidle" });

    const layers = await demoBoxByHeading(page, "Layers Panel");
    const header = await itemByTextIn(layers, "Header");
    const hero = layers
      .locator(".snapsort-container")
      .filter({ hasText: "Hero Section" })
      .nth(1);
    await expect(hero).toBeVisible();
    const headerRect = await itemRect(header);
    const headerCenter = center(headerRect);
    const heroRect = await itemRect(hero);
    const targetCenterY =
      heroRect.y + heroRect.height + headerRect.height / 2 + 12;
    const samples = await dragBy(
      page,
      header,
      "Header",
      0,
      {
        x: 0,
        y: targetCenterY - headerCenter.y,
      },
      { steps: 240 },
    );

    await expectStableDrag(
      page,
      samples,
      consoleMessages,
      testInfo.outputPath("layers-panel-offset-trace.json"),
    );
    expectSpacerAlignedAfterPrevious(samples, "layers-root", /Hero Section/);
    expectSpacerNearDragged(samples, "layers-root", 48);
  });

  test("keeps draggable sub-container ghost aligned after resized groups", async ({
    page,
  }, testInfo) => {
    const consoleMessages: string[] = [];
    page.on("console", (message) => consoleMessages.push(message.text()));
    await page.goto("/?demo=drop_snap_nested", { waitUntil: "networkidle" });

    const cell = await demoBoxByHeading(page, "Draggable Sub-Containers");
    const group1B = await itemByTextIn(cell, "Group 1 - B");
    const group2 = cell
      .locator(".snapsort-container")
      .filter({ hasText: "Group 2 - A" })
      .nth(1);
    await expect(group2).toBeVisible();
    const group1BRect = await itemRect(group1B);
    const group1BCenter = center(group1BRect);
    const group2Rect = await itemRect(group2);
    const targetCenterY =
      group2Rect.y + group2Rect.height + group1BRect.height / 2 + 12;
    const samples = await dragBy(
      page,
      group1B,
      "Group 1 - B",
      0,
      {
        x: 0,
        y: targetCenterY - group1BCenter.y,
      },
      { steps: 240 },
    );

    await expectStableDrag(
      page,
      samples,
      consoleMessages,
      testInfo.outputPath("drag-subcontainer-offset-trace.json"),
    );
    expectSpacerAlignedAfterPrevious(samples, "drag-root", /Group 2 - A/);
    expectSpacerNearDragged(samples, "drag-root", 48);
  });

  test("keeps one stable spacer while reordering a flat nested-items list", async ({
    page,
  }, testInfo) => {
    const consoleMessages: string[] = [];
    page.on("console", (message) => consoleMessages.push(message.text()));
    await page.goto("/?demo=drop_snap_nested", { waitUntil: "networkidle" });
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
    await page.goto("/?demo=drop_snap_nested", { waitUntil: "networkidle" });
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
    await page.goto("/?demo=drop_snap_nested", { waitUntil: "networkidle" });
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
    await page.goto("/?demo=drop_snap_nested", { waitUntil: "networkidle" });
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
      .locator(".snapsort-item")
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
