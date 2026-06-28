import { expect, test, type Locator, type Page } from "@playwright/test";

async function centerOf(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return {
    x: box!.x + box!.width / 2,
    y: box!.y + box!.height / 2,
  };
}

async function dragFromTo(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 16 });
  await page.mouse.up();
}

async function cardLabels(page: Page) {
  return page.locator(".snapsort-react-card strong").evaluateAll((elements) =>
    elements.map((element) => element.textContent?.trim() ?? ""),
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto("/snapsort");
});

test("renders the React SnapSort demo list", async ({ page }) => {
  await expect(page.locator(".snapsort-container")).toHaveCount(1);
  await expect(page.locator(".snapsort-react-card")).toHaveCount(4);
  await expect(page.locator("[data-snapsort-item-key='react-task-1']")).toHaveText(
    /Design API/,
  );
});

test("reorders React SnapSort items by dragging", async ({ page }) => {
  const cards = page.locator(".snapsort-react-card");
  const firstCard = cards.nth(0);
  const thirdCard = cards.nth(2);

  await dragFromTo(page, await centerOf(firstCard), await centerOf(thirdCard));
  await page.waitForTimeout(250);

  await expect(page.locator("#spacer")).toHaveCount(0);
  await expect.poll(() => cardLabels(page)).not.toEqual([
    "Design API",
    "Wire demo",
    "Test drag",
    "Review docs",
  ]);
});
