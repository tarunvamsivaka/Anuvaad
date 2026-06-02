import { test, expect } from '@playwright/test';
import { mockSupabaseAuth } from './mock-auth';

test.beforeEach(async ({ page }) => {
  await mockSupabaseAuth(page);
});

test.describe('Sign Up Form Validation and Flow', () => {
  // Clear storage state to test authentication in isolation
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/signup');
  });

  test('should display registration form elements', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Create your account');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('a[href="/signin"]')).toBeVisible();
  });

  test('should fail signup with short password', async ({ page }) => {
    await page.fill('input[type="email"]', 'new_user_short@example.com');
    await page.fill('input[type="password"]', '123');
    await page.click('button[type="submit"]');

    // The browser's HTML5 minlength validation or Next.js validation will prevent signup
    await expect(page).not.toHaveURL(/\/dashboard/);
  });

  test('should navigate to signin page', async ({ page }) => {
    await page.click('a[href="/signin"]');
    await expect(page).toHaveURL(/\/signin/);
  });
});
