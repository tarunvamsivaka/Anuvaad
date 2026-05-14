import { test as setup, expect } from '@playwright/test';
import * as path from 'path';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
  // Use environment variables for test credentials
  const email = process.env.PLAYWRIGHT_TEST_EMAIL || 'test_user@example.com';
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD || 'password123';

  await page.goto('/signin');
  
  // Wait for the sign in form to load and fill credentials
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  
  // Click sign in button
  await page.click('button:has-text("Sign In")');
  
  // Wait until the dashboard loads to confirm successful login
  await page.waitForURL('/dashboard');
  
  // End of authentication steps.
  await page.context().storageState({ path: authFile });
});
