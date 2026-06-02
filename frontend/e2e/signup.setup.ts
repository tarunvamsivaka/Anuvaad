import { test as setup } from '@playwright/test';
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

  // Wait for redirect to dashboard or welcome onboarding page
  try {
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  } catch (err) {
    // If auto-redirect failed due to email verification being required, we check for verification prompt
    const hasVerificationText = await page.isVisible('text=Check your email');
    if (!hasVerificationText) {
      throw err;
    }
    console.log('[E2E Signup Setup] Email verification required screen shown.');
  }

  // Save the registration state for specific tests that require a fresh registration state
  await page.context().storageState({ path: signupAuthFile });
  console.log(`[E2E Signup Setup] Fresh user successfully signed up: ${email}`);
});
