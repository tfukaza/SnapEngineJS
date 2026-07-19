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
