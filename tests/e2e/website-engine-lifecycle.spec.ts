import { expect, test } from "@playwright/test";

test("owned Svelte engines survive page teardown without errors", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");
  await expect(page.locator("#highlight-animation")).toBeVisible();
  await expect(page.locator("#collision-card-canvas")).toBeVisible();

  const collisionCanvas = await page
    .locator("#collision-card-canvas")
    .boundingBox();
  expect(collisionCanvas?.width).toBeGreaterThan(800);
  expect(collisionCanvas?.height).toBeGreaterThan(400);

  await page.getByRole("link", { name: "About", exact: true }).first().click();
  await expect(page).toHaveURL(/\/about$/);

  expect(pageErrors).toEqual([]);
});

test("marker ghost callbacks do not emit flow-mode warnings", async ({
  page,
}) => {
  const ghostWarnings: string[] = [];
  page.on("console", (message) => {
    if (
      message.type() === "warning" &&
      message.text().includes("ghost callbacks")
    ) {
      ghostWarnings.push(message.text());
    }
  });

  await page.goto("/snapsort/gallery");
  await expect(page.locator("#swap-grid .swap-grid")).toBeVisible();

  expect(ghostWarnings).toEqual([]);
});

test("SnapSort asset preview pans and moves items through the imperative API", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");

  const card = page.locator(".drop-snap-card");
  const preview = page.locator("#assets-snapsort-preview-engine .preview-mosaic");
  const pan = card.locator(".snapsort-preview-pan");
  const firstKanbanColumn = card.locator(".preview-kanban-column").first();
  const sentenceAnswer = card.locator(".preview-sentence-zone").first();
  const firstTile = card.locator(".preview-tile-grid > .snapsort-item").first();

  await card.scrollIntoViewIfNeeded();
  await expect(preview).toBeVisible();
  await expect(card.getByRole("img", { name: "React" })).toBeVisible();
  await expect(card.locator(".framework-list > li")).toHaveCount(5);
  await expect(firstKanbanColumn.locator(":scope > .snapsort-item")).toHaveCount(2);
  await expect(sentenceAnswer.locator(":scope > .snapsort-item")).toHaveCount(2);
  await expect(firstTile).toHaveText("01");

  const cardBefore = await card.boundingBox();
  const panBefore = await pan.evaluate((element) => getComputedStyle(element).transform);

  await card.hover();
  await expect(card).toHaveAttribute("data-preview-active", "true");
  await expect
    .poll(() => firstKanbanColumn.locator(":scope > .snapsort-item").count())
    .toBe(1);
  await expect
    .poll(() => sentenceAnswer.locator(":scope > .snapsort-item").count())
    .toBe(3);
  await expect.poll(() => firstTile.textContent()).toBe("02");

  const panAfter = await pan.evaluate((element) => getComputedStyle(element).transform);
  expect(panAfter).not.toBe(panBefore);

  const cardAfter = await card.boundingBox();
  expect(cardAfter?.x).toBeCloseTo(cardBefore?.x ?? 0, 3);
  expect(cardAfter?.y).toBeCloseTo(cardBefore?.y ?? 0, 3);
  expect(cardAfter?.width).toBeCloseTo(cardBefore?.width ?? 0, 3);
  expect(cardAfter?.height).toBeCloseTo(cardBefore?.height ?? 0, 3);

  const frameworkChrome = await card.locator(".framework-list > li").evaluateAll((items) =>
    items.map((item) => {
      const style = getComputedStyle(item);
      return {
        background: style.backgroundColor,
        borderWidth: style.borderTopWidth,
      };
    }),
  );
  expect(frameworkChrome).toEqual(
    Array.from({ length: 5 }, () => ({
      background: "rgba(0, 0, 0, 0)",
      borderWidth: "0px",
    })),
  );

  await card.click();
  await expect(page).toHaveURL(/\/snapsort$/);
  expect(pageErrors).toEqual([]);
});

test("SnapSort asset preview honors reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const card = page.locator(".drop-snap-card");
  const firstKanbanColumn = card.locator(".preview-kanban-column").first();
  await card.scrollIntoViewIfNeeded();
  await expect(firstKanbanColumn.locator(":scope > .snapsort-item")).toHaveCount(2);

  await card.hover();
  await expect(card).toHaveAttribute("data-preview-active", "false");
  await page.waitForTimeout(1200);
  await expect(firstKanbanColumn.locator(":scope > .snapsort-item")).toHaveCount(2);
  await expect(card.locator(".snapsort-preview-pan")).toHaveCSS("animation-name", "none");
});

test("camera card reserves modified wheel input for zoom", async ({ page }) => {
  await page.goto("/");

  const card = page.locator(".camera-control-card");
  const camera = page.locator("#snap-camera-control");
  await expect(card).toBeVisible();
  await card.scrollIntoViewIfNeeded();
  await expect(camera).toBeVisible();

  const movePointerOverCard = async () => {
    const box = await card.boundingBox();
    if (!box) throw new Error("Expected camera card to have a bounding box.");
    await page.mouse.move(
      box.x + box.width / 2,
      Math.min(box.y + box.height / 2, 760),
    );
  };

  await movePointerOverCard();
  const scrollBefore = await page.evaluate(() => window.scrollY);
  const transformBefore = await camera.evaluate(
    (element) => (element as HTMLElement).style.transform,
  );
  await page.mouse.wheel(0, 420);
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(scrollBefore + 100);
  expect(
    await camera.evaluate(
      (element) => (element as HTMLElement).style.transform,
    ),
  ).toBe(transformBefore);

  await card.scrollIntoViewIfNeeded();
  await movePointerOverCard();
  const modifiedScrollBefore = await page.evaluate(() => window.scrollY);
  const modifiedTransformBefore = await camera.evaluate(
    (element) => (element as HTMLElement).style.transform,
  );
  await page.keyboard.down("Control");
  try {
    await page.mouse.wheel(0, -320);
  } finally {
    await page.keyboard.up("Control");
  }
  await expect
    .poll(() =>
      camera.evaluate((element) => (element as HTMLElement).style.transform),
    )
    .not.toBe(modifiedTransformBefore);
  expect(await page.evaluate(() => window.scrollY)).toBe(modifiedScrollBefore);
});
