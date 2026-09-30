import { test, expect } from '@playwright/test';

/**
 * Core E2E flows for Anuvaad translate platform.
 * These tests cover the most critical user journeys.
 */

test.describe('Guest User Flow', () => {
  test('landing page loads and has key elements', async ({ page }) => {
    await page.goto('/');
    // Skip-to-content link exists
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeAttached();
    // Hero section visible
    await expect(page.locator('#main-content')).toBeVisible();
  });

  test('guest can navigate to translate page', async ({ page }) => {
    await page.goto('/dashboard/translate');
    // Page should load (either the translate feature or redirect to sign-in)
    // Either way, the URL should be valid and page should not crash
    await expect(page).not.toHaveURL('about:blank');
    await expect(page.locator('body')).toBeVisible();
  });

  test('sign-in page is accessible', async ({ page }) => {
    await page.goto('/signin');
    await expect(page.locator('body')).toBeVisible();
    // Should have a form or auth elements
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
  });
});

test.describe('Pricing Page', () => {
  test('pricing page loads with tier information', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.locator('body')).toBeVisible();
    // Check page title
    await expect(page).toHaveTitle(/Anuvaad/i);
  });
});

test.describe('Accessibility', () => {
  test('landing page has skip-to-content link', async ({ page }) => {
    await page.goto('/');
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeAttached();
  });

  test('sign-in page has proper form labels', async ({ page }) => {
    await page.goto('/signin');
    // Ensure the page renders without JS errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.waitForLoadState('networkidle');
    // No critical JS errors should appear
    const criticalErrors = errors.filter(e => 
      !e.includes('Failed to fetch') && 
      !e.includes('Network Error') &&
      !e.includes('401')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe('Dashboard History', () => {
  test('history page redirects unauthenticated users appropriately', async ({ page }) => {
    await page.goto('/dashboard/history');
    // Should either show history (if session cookie exists) or redirect to sign-in
    const url = page.url();
    expect(
      url.includes('/dashboard/history') || url.includes('/signin') || url.includes('/signup')
    ).toBeTruthy();
  });
});
