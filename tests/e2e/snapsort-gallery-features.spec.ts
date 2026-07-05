import { expect, test, type Locator, type Page } from "@playwright/test";

async function gotoGallery(page: Page) {
  await page.goto("/snapsort/gallery", { waitUntil: "networkidle" });
}

async function rect(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("Expected locator to have a bounding box.");
  return box;
}

function center(box: { x: number; y: number; width: number; height: number }) {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * Drag `source` onto `target`, using a real pointer-move sequence (not a
 * single jump) so SnapSort's drag-threshold and per-move drop-target
 * resolution both get a chance to run, matching how a real user drags.
 */
async function dragOnto(
  page: Page,
  source: Locator,
  target: Locator,
  options: { steps?: number; xOffset?: number; yOffset?: number } = {},
) {
  const sourceBox = await rect(source);
  const start = center(sourceBox);
  const steps = options.steps ?? 24;

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 6, start.y + 6);
  await page.waitForTimeout(60);

  const targetBox = await rect(target);
  const end = {
    x: targetBox.x + targetBox.width / 2 + (options.xOffset ?? 0),
    y: targetBox.y + targetBox.height / 2 + (options.yOffset ?? 0),
  };

  for (let step = 1; step <= steps; step++) {
    const t = step / steps;
    await page.mouse.move(
      start.x + (end.x - start.x) * t,
      start.y + (end.y - start.y) * t,
    );
    await page.waitForTimeout(16);
  }

  await page.waitForTimeout(80);
  await page.mouse.up();
  await page.waitForTimeout(250);
}

test.describe("SnapSort gallery — new drag primitives", () => {
  test.beforeEach(async ({ page }) => {
    await gotoGallery(page);
  });

  test.describe("Clone Palette (copy effect)", () => {
    test("dragging a palette block onto the canvas clones it, leaving the palette intact", async ({
      page,
    }) => {
      const exhibit = page.locator("#clone-palette");
      await exhibit.scrollIntoViewIfNeeded();

      const palette = exhibit.locator(".clone-palette");
      const canvas = exhibit.locator(".clone-canvas");
      const buttonTemplate = palette
        .locator(".snapsort-item")
        .filter({ hasText: "Button" });

      await expect(palette.locator(".snapsort-item")).toHaveCount(4);
      await expect(canvas.locator(".clone-canvas-block")).toHaveCount(0);

      await dragOnto(page, buttonTemplate, canvas);

      // The palette template is never consumed — copy leaves the source alone.
      await expect(palette.locator(".snapsort-item")).toHaveCount(4);
      await expect(palette.locator(".snapsort-item").filter({ hasText: "Button" })).toHaveCount(1);
      // The canvas gained one cloned block.
      await expect(canvas.locator(".clone-canvas-block")).toHaveCount(1);
      await expect(canvas.locator(".clone-canvas-block")).toContainText("Button");

      // Dragging a second, different block clones onto the canvas too.
      const imageTemplate = palette
        .locator(".snapsort-item")
        .filter({ hasText: "Image" });
      await dragOnto(page, imageTemplate, canvas, { yOffset: 40 });
      await expect(canvas.locator(".clone-canvas-block")).toHaveCount(2);
      await expect(palette.locator(".snapsort-item")).toHaveCount(4);

      // Reordering an already-placed canvas block is a plain move, not
      // another clone (only dragging out of the palette should copy).
      const canvasItems = canvas.locator(".snapsort-item");
      await dragOnto(page, canvasItems.nth(1), canvasItems.nth(0));
      await expect(canvas.locator(".clone-canvas-block")).toHaveCount(2);
      await expect(canvas.locator(".clone-canvas-block").first()).toContainText("Image");

      // Click-to-remove takes a cloned block back out of the canvas.
      const firstBlock = canvas.locator(".clone-canvas-block").first();
      await firstBlock.locator(".clone-block-remove").click();
      await expect(canvas.locator(".clone-canvas-block")).toHaveCount(1);
    });
  });

  test.describe("Trash It (none effect)", () => {
    test("dropping a task on the trash removes it; other drags still reorder normally", async ({
      page,
    }) => {
      const exhibit = page.locator("#trash-it");
      await exhibit.scrollIntoViewIfNeeded();

      const list = exhibit.locator(".trash-list");
      const trashZone = exhibit.locator(".trash-drop-target");

      await expect(list.locator(".trash-task")).toHaveCount(5);
      const firstTaskText = (await list.locator(".trash-task").first().textContent())?.trim();
      const secondTaskText = (await list.locator(".trash-task").nth(1).textContent())?.trim();

      // Reordering within the list (default move effect) still works.
      const firstTask = list.locator(".snapsort-item").first();
      await dragOnto(page, firstTask, list.locator(".snapsort-item").nth(2));
      await expect(list.locator(".trash-task")).toHaveCount(5);
      await expect(list.locator(".trash-task").first()).not.toContainText(
        firstTaskText ?? "__never__",
      );

      // Dragging a task onto the trash deletes it instead of moving it there.
      const taskToDelete = list.locator(".snapsort-item").filter({ hasText: secondTaskText ?? "" });
      await dragOnto(page, taskToDelete, trashZone);

      await expect(list.locator(".trash-task")).toHaveCount(4);
      await expect(list.locator(".trash-task", { hasText: secondTaskText ?? "__never__" })).toHaveCount(0);
      // Nothing should have actually landed inside the trash container itself.
      await expect(trashZone.locator(".trash-task")).toHaveCount(0);
    });
  });

  test.describe("Swap Grid (swap mode)", () => {
    test("dragging a tile onto another swaps their positions and nothing else moves", async ({
      page,
    }) => {
      const exhibit = page.locator("#swap-grid");
      await exhibit.scrollIntoViewIfNeeded();

      const grid = exhibit.locator(".swap-grid");
      const tiles = grid.locator(".snapsort-item");
      await expect(tiles).toHaveCount(9);

      const beforeOrder = await grid.locator(".swap-tile").evaluateAll((nodes) =>
        nodes.map((node) => node.textContent?.trim() ?? ""),
      );
      expect(beforeOrder).toEqual(["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "C3"]);

      const tileA1 = tiles.filter({ hasText: "A1" });
      const tileB2 = tiles.filter({ hasText: "B2" });
      await dragOnto(page, tileA1, tileB2);

      const afterOrder = await grid.locator(".swap-tile").evaluateAll((nodes) =>
        nodes.map((node) => node.textContent?.trim() ?? ""),
      );

      // Only the two dragged/targeted slots change; everything else stays put.
      expect(afterOrder).toEqual(["B2", "A2", "A3", "B1", "A1", "B3", "C1", "C2", "C3"]);
      await expect(tiles).toHaveCount(9);
    });
  });
});
