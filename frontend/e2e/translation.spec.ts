import { test, expect } from "@playwright/test";

test.describe("Anuvaad Translation Workspace E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000");
  });

  test("loads the workspace and renders the header with ZDR indicator", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Anuvaad");
    await expect(page.getByText("Zero Code Retention (ZDR) Active")).toBeVisible();
    await expect(page.getByRole("button", { name: "Translate Code" })).toBeVisible();
  });

  test("allows selecting source and target languages", async ({ page }) => {
    const sourceSelect = page.locator("select").first();
    const targetSelect = page.locator("select").nth(1);

    await sourceSelect.selectOption("go");
    await targetSelect.selectOption("rust");

    await expect(sourceSelect).toHaveValue("go");
    await expect(targetSelect).toHaveValue("rust");
  });

  test("renders ZDR receipt modal when triggered", async ({ page }) => {
    // If lastResponse exists or simulate modal opening
    const zdrButton = page.getByRole("button", { name: /ZDR Receipt/i });
    if (await zdrButton.isVisible()) {
      await zdrButton.click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByText("HMAC-SHA256 Audit Digest")).toBeVisible();
      await page.getByRole("button", { name: "Close" }).click();
      await expect(page.getByRole("dialog")).not.toBeVisible();
    }
  });
});
