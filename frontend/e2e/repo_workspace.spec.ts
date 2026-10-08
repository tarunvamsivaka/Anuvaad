import { test, expect } from "@playwright/test";

test.describe("Anuvaad Enterprise Repository Workspace E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000");
  });

  test("renders 3-column enterprise IDE layout with sidebar and file tree", async ({ page }) => {
    // Column 1: Global navigation
    await expect(page.locator("aside")).toBeVisible();
    await expect(page.getByTitle("Repository Tree")).toBeVisible();

    // Column 2: Context File Tree
    await expect(page.getByText("anuvaad/core-modernization")).toBeVisible();
    await expect(page.getByRole("button", { name: "Modernize All Files (DAG)" })).toBeVisible();

    // Verify default file list is rendered
    await expect(page.getByText("src/models.py")).toBeVisible();
    await expect(page.getByText("src/service.py")).toBeVisible();
    await expect(page.getByText("src/main.py")).toBeVisible();
  });

  test("allows switching files and updates editor context", async ({ page }) => {
    // Click service.py
    await page.getByText("src/service.py").click();

    // Check header updates
    await expect(page.locator("header")).toContainText("src/service.py");
  });

  test("opens GitHub Export PR Modal and simulates pull request creation", async ({ page }) => {
    // Click PR icon on sidebar
    await page.getByTitle("Create GitHub Pull Request").click();

    // Verify modal is open
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Publish Modernized Codebase to GitHub")).toBeVisible();

    // Submit form
    await page.getByRole("button", { name: "Open Pull Request" }).click();

    // Verify success confirmation and PR link
    await expect(page.getByText("Pull Request Successfully Created!")).toBeVisible();
    await expect(page.getByRole("link", { name: /View Pull Request on GitHub/i })).toBeVisible();
  });
});
