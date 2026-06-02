import { test as setup } from '@playwright/test';
import * as path from 'path';
import { mockSupabaseAuth } from './mock-auth';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
  // Mock Supabase auth endpoints for offline E2E testing
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
    // Wait for redirect to dashboard with a short timeout
    await page.waitForURL('**/dashboard', { timeout: 6000 });
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
      await page.waitForURL('**/dashboard', { timeout: 15000 });
    } else {
      throw err;
    }
  }

  // Self-healing onboarding skip: Check if we got redirected to onboarding welcome page
  try {
    await page.waitForURL('**/dashboard/welcome', { timeout: 4000 });
    console.log('[E2E Setup] Onboarding welcome page detected. Skipping onboarding flow...');
    await page.click('button:has-text("Skip onboarding")');
    await page.waitForURL('**/dashboard', { timeout: 6000 });
  } catch {
    // Already onboarded
  }
  
  // End of authentication steps.
  await page.context().storageState({ path: authFile });
});
