import { test, expect } from '@playwright/test';
import { mockSupabaseAuth } from './mock-auth';

test.beforeEach(async ({ page }) => {
  await mockSupabaseAuth(page);
});

test.describe('Billing & Subscription Flow', () => {
  // Uses the auth.setup.ts storageState by default (authenticated user)

  test('billing page shows current plan for free user', async ({ page }) => {
    // We assume the default test user is on the Free Plan
    await page.goto('/dashboard/billing');
    
    // Check that the page loads correctly
    await expect(page.locator('h1')).toContainText('Billing');
    
    // Check for Free Plan text in the main card heading (avoids collapsed sidebar element)
    await expect(page.locator('h2:has-text("Free Plan")')).toBeVisible();
    
    // Ensure the usage indicator is visible
    await expect(page.locator('text=Usage this billing period')).toBeVisible();
  });

  test('upgrade button is visible for free users and hidden for pro users', async ({ page }) => {
    await page.goto('/dashboard/billing');
    
    // The upgrade button (either ₹499/month or paused during launch) should be visible for our test free user
    const upgradeBtn = page.locator('button').filter({ hasText: /Upgrade — ₹499\/month|Upgrades Paused/ }).first();
    await expect(upgradeBtn).toBeVisible();

    // To test the "hidden for pro users" part, we mock the backend subscription-status endpoint
    // Use '**' to match cross-origin API calls on port 8000
    await page.route('**/api/subscription-status', async route => {
      const json = { plan: 'pro', status: 'active', isPro: true };
      await route.fulfill({ json });
    });

    // Reload to apply the mocked pro status
    await page.goto('/dashboard/billing');

    // The button should now be hidden
    await expect(page.locator('button').filter({ hasText: /Upgrade — ₹499\/month|Upgrades Paused/ })).toBeHidden();
    
    // Optional: check for Manage Subscription
    // await expect(page.locator('button:has-text("Manage Subscription")')).toBeVisible();
  });
});
