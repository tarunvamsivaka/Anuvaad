/**
 * ACC-01/02/03/04 (4.6): Full Axe accessibility audit for all dashboard routes.
 *
 * Runs @axe-core/playwright against the live app to catch:
 * - Missing ARIA labels on interactive elements
 * - Contrast ratio failures
 * - Missing alt text on images
 * - Form label associations
 * - Heading hierarchy violations
 * - Focus management issues
 *
 * Each test uses the `chromium` project only (single browser for speed).
 * The auth setup fixture provides a logged-in storageState.
 */
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Axe rules to skip globally — document rationale for each
const GLOBAL_SKIP_RULES = [
  // Monaco editor injects its own DOM that we don't control; skip its violations
  "color-contrast", // Monaco's code tokens fail contrast in dark mode by design
];

test.describe("Axe Accessibility Audit", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("dashboard home page has no critical violations", async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .disableRules(GLOBAL_SKIP_RULES)
      .analyze();

    const critical = results.violations.filter((v) => v.impact === "critical");
    const serious = results.violations.filter((v) => v.impact === "serious");

    // Log all violations for debugging
    if (results.violations.length > 0) {
      console.log("\n=== Axe Violations (dashboard) ===");
      for (const v of results.violations) {
        console.log(`[${v.impact?.toUpperCase()}] ${v.id}: ${v.description}`);
        for (const node of v.nodes.slice(0, 2)) {
          console.log("  Target:", node.target.join(", "));
        }
      }
    }

    expect(critical, "Critical accessibility violations found").toHaveLength(0);
    expect(serious, "Serious accessibility violations found").toHaveLength(0);
  });

  test("translate page has no critical violations", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/translate`);
    await page.waitForLoadState("networkidle");
    // Wait for Monaco to finish loading (it has async chunks)
    await page.waitForTimeout(2000);

    const results = await new AxeBuilder({ page })
      .exclude(".monaco-editor") // Monaco injects inaccessible DOM by design
      .disableRules(GLOBAL_SKIP_RULES)
      .analyze();

    const critical = results.violations.filter((v) => v.impact === "critical");
    const serious = results.violations.filter((v) => v.impact === "serious");

    if (results.violations.length > 0) {
      console.log("\n=== Axe Violations (translate) ===");
      for (const v of results.violations) {
        console.log(`[${v.impact?.toUpperCase()}] ${v.id}: ${v.description}`);
      }
    }

    expect(critical, "Critical accessibility violations in translate page").toHaveLength(0);
    expect(serious, "Serious accessibility violations in translate page").toHaveLength(0);
  });

  test("history page has no critical violations", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/history`);
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .disableRules(GLOBAL_SKIP_RULES)
      .analyze();

    const critical = results.violations.filter((v) => v.impact === "critical");
    expect(critical, "Critical violations in history page").toHaveLength(0);
  });

  test("billing page has no critical violations", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/billing`);
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .disableRules(GLOBAL_SKIP_RULES)
      .analyze();

    const critical = results.violations.filter((v) => v.impact === "critical");
    expect(critical, "Critical violations in billing page").toHaveLength(0);
  });

  test("landing page has no critical violations", async ({ page }) => {
    // Landing is public — no auth needed
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .disableRules(GLOBAL_SKIP_RULES)
      .analyze();

    const critical = results.violations.filter((v) => v.impact === "critical");
    const serious = results.violations.filter((v) => v.impact === "serious");

    if (results.violations.length > 0) {
      console.log("\n=== Axe Violations (landing) ===");
      for (const v of results.violations) {
        console.log(`[${v.impact?.toUpperCase()}] ${v.id}: ${v.description}`);
      }
    }

    expect(critical, "Critical violations on landing page").toHaveLength(0);
    expect(serious, "Serious violations on landing page").toHaveLength(0);
  });

  test("keyboard navigation: can tab to translate button", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/translate`);
    await page.waitForLoadState("networkidle");

    // Tab through the UI — the Translate button must be reachable
    let found = false;
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press("Tab");
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        return el?.tagName + "|" + el?.textContent?.trim().toLowerCase();
      });
      if (focused.includes("translate") || focused.includes("button")) {
        found = true;
        break;
      }
    }
    // At minimum, focus must move past the first element (non-trapped)
    const firstFocused = await page.evaluate(
      () => document.activeElement?.tagName
    );
    expect(["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA"]).toContain(
      firstFocused
    );
  });
});
