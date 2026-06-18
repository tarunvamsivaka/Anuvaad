import { test as setup, expect } from '@playwright/test';
import * as path from 'path';
import { mockSupabaseAuth } from './mock-auth';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
  page.on('console', msg => console.log('[BROWSER CONSOLE]', msg.text()));
  page.on('pageerror', err => console.error('[BROWSER ERROR]', err));

  // Mock Supabase auth endpoints BEFORE navigating so no real Supabase calls are made.
  // This is required in CI where NEXT_PUBLIC_SUPABASE_URL is a placeholder.
  await mockSupabaseAuth(page);

  // Use environment variables for test credentials
  const email = process.env.PLAYWRIGHT_TEST_EMAIL || 'test_user@example.com';
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD || 'password123';

  await page.goto('/signin');
  
  // Wait for the sign in form to load and fill credentials
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  
  // Click sign in button
  await page.click('button:has-text("Sign In")');
  
  try {
    // Wait for redirect to dashboard — the mock auth returns a valid session
    // so we expect the dashboard to load. We wait for a recognisable element.
    await expect(page.locator('text=All Time').or(page.locator('h1:has-text("Welcome")')))
      .toBeVisible({ timeout: 20000 });
  } catch (err) {
    // If signin failed, check for invalid credentials error to trigger self-healing signup
    const isInvalid = await page.isVisible('p:has-text("Invalid login credentials")');
    if (isInvalid) {
      console.log(`[E2E Setup] Test user ${email} not found. Attempting registration...`);
      await page.goto('/signup');
      await page.fill('input[type="email"]', email);
      await page.fill('input[type="password"]', password);
      await page.click('button[type="submit"]');
      
      // Wait for auto-login redirect to dashboard (email confirmation is disabled)
      await expect(page.locator('text=All Time').or(page.locator('h1:has-text("Welcome")')))
        .toBeVisible({ timeout: 30000 });
    } else {
      throw err;
    }
  }

  // Self-healing onboarding skip: Check if we got redirected to onboarding welcome page
  try {
    await page.waitForURL('**/dashboard/welcome', { timeout: 10000 });
    console.log('[E2E Setup] Onboarding welcome page detected. Skipping onboarding flow...');
    await page.click('button:has-text("Skip onboarding")');
    await expect(page.locator('text=All Time').or(page.locator('h1:has-text("Welcome")')))
      .toBeVisible({ timeout: 20000 });
  } catch {
    // Already onboarded
  }
  
  // End of authentication steps.
  await page.context().storageState({ path: authFile });
});
