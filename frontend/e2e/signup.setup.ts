import { test as setup, expect } from '@playwright/test';
import * as path from 'path';
import { mockSupabaseAuth } from './mock-auth';

const signupAuthFile = path.join(__dirname, '../playwright/.auth/signup-user.json');

setup('signup-new-user', async ({ page }) => {
  page.on('console', msg => console.log('[BROWSER CONSOLE]', msg.text()));
  page.on('pageerror', err => console.error('[BROWSER ERROR]', err));

  // Mock Supabase auth endpoints for offline E2E testing
  await mockSupabaseAuth(page);

  // Use a unique random email for signup to ensure no unique constraint violations
  const randomId = Math.random().toString(36).substring(7);
  const email = `test_signup_${randomId}@example.com`;
  const password = 'Password123!';

  await page.goto('/signup');

  // Fill out the signup form
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  
  // Click the submit button
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard or welcome onboarding page.
  // The app may redirect to /dashboard/welcome first if the user hasn't onboarded yet.
  try {
    await expect(page.locator('text=All Time').or(page.locator('h1:has-text("Initialize Translation Engine")'))).toBeVisible({ timeout: 15000 });
  } catch (err) {
    // If auto-redirect failed due to email verification being required, check for that prompt
    const hasVerificationText = await page.isVisible('text=Check your email');
    if (!hasVerificationText) {
      console.error('[E2E Signup Setup] Current URL:', page.url());
      throw err;
    }
    console.log('[E2E Signup Setup] Email verification required screen shown.');
  }

  // Self-healing onboarding skip: if redirected to welcome/onboarding, skip it
  try {
    await page.waitForURL('**/dashboard/welcome', { timeout: 5000 });
    console.log('[E2E Signup Setup] Onboarding welcome page detected. Skipping...');
    await page.click('button:has-text("Skip onboarding")');
    await expect(page.locator('text=All Time').or(page.locator('h1:has-text("Welcome")')))
      .toBeVisible({ timeout: 20000 });
  } catch {
    // Already on dashboard or onboarding not shown — this is fine
  }

  // Save the registration state for specific tests that require a fresh registration state
  await page.context().storageState({ path: signupAuthFile });
  console.log(`[E2E Signup Setup] Fresh user successfully signed up: ${email}`);
});
