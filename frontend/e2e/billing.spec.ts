import { test, expect } from '@playwright/test';

test.describe('Billing & Subscription Flow', () => {
  // Uses the auth.setup.ts storageState by default (authenticated user)

  test('billing page shows current plan for free user', async ({ page }) => {
    // We assume the default test user is on the Free Plan
    await page.goto('/dashboard/billing');
    
    // Check that the page loads correctly
    await expect(page.locator('h1')).toContainText('Billing & Subscription');
    
    // Check for Free Plan text
    await expect(page.locator('text=Free Plan')).toBeVisible();
    
    // Ensure the token/credit usage indicator is visible
    await expect(page.locator('text=Tokens Used')).toBeVisible();
  });

  test('upgrade button is visible for free users and hidden for pro users', async ({ page }) => {
    await page.goto('/dashboard/billing');
    
    // The "Upgrade to Pro" button should be visible for our test free user
    const upgradeBtn = page.locator('button:has-text("Upgrade to Pro")').first();
    await expect(upgradeBtn).toBeVisible();

    // To test the "hidden for pro users" part, we would typically:
    // 1. Intercept the network request to mock the subscription status
    await page.route('/api/subscription-status', async route => {
      const json = { plan: 'pro', status: 'active', isPro: true };
      await route.fulfill({ json });
    });

    // Reload to apply the mocked pro status
    await page.goto('/dashboard/billing');

    // The button should now be hidden or changed to "Manage Subscription"
    await expect(page.locator('button:has-text("Upgrade to Pro")')).toBeHidden();
    
    // Optional: check for Manage Subscription
    // await expect(page.locator('button:has-text("Manage Subscription")')).toBeVisible();
  });
});
