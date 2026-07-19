import { expect, test } from "@playwright/test";

test("owned Svelte engines survive page teardown without errors", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");
  await expect(page.locator("#highlight-animation")).toBeVisible();

  await page.getByRole("link", { name: "About", exact: true }).first().click();
  await expect(page).toHaveURL(/\/about$/);

  expect(pageErrors).toEqual([]);
});
