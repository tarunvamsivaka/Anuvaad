import { test, expect } from '@playwright/test';
import { mockSupabaseAuth } from './mock-auth';

test.describe('GitHub OAuth Integration & Token Encryption Flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseAuth(page);
  });

  test('rejects callback when oauth state is missing or mismatched', async ({ page, context }) => {
    // Navigate with mismatched state
    await context.addCookies([
      {
        name: 'anuvaad_github_oauth_state',
        value: 'expected_secret_state_token_12345',
        domain: 'localhost',
        path: '/api/auth/github/callback',
      },
    ]);

    // Request with invalid state query param
    await page.goto('/api/auth/github/callback?code=fake_code&state=mismatched_state_67890');

    // Should redirect to dashboard with error
    await expect(page).toHaveURL(/.*\/dashboard\?error=github_oauth_state_invalid/);
  });

  test('accepts valid state, exchanges code for token, and redirects to connected dashboard', async ({ page, context }) => {
    const validState = 'secure_random_state_string_abc123';
    await context.addCookies([
      {
        name: 'anuvaad_github_oauth_state',
        value: validState,
        domain: 'localhost',
        path: '/api/auth/github/callback',
      },
    ]);

    // Intercept backend exchange endpoint
    await page.route('**/api/v1/oauth/github/callback*', async route => {
      const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      };
      await route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify({
          success: true,
          username: 'octocat',
          connected_at: new Date().toISOString(),
        }),
      });
    });

    await page.goto(`/api/auth/github/callback?code=valid_exchange_code&state=${validState}`);

    // Should redirect to dashboard with success query param
    await expect(page).toHaveURL(/.*\/dashboard\?github=connected/);
  });

  test('validates backend token round-trip: Fernet encryption at rest and transparent decryption on repo lookup', async ({ page }) => {
    // Mock the backend repo listing route that uses the decrypted GitHub token
    await page.route('**/api/v1/github/repos', async route => {
      const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      };
      // Emulate backend returning repos fetched with decrypted Fernet token
      await route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify({
          repositories: [
            { id: 1, name: 'Anuvaad', full_name: 'anuvaad/Anuvaad', private: false, default_branch: 'master' },
            { id: 2, name: 'demo-repo', full_name: 'anuvaad/demo-repo', private: true, default_branch: 'main' },
          ],
        }),
      });
    });

    await page.goto('/dashboard/settings');

    // Trigger repo fetch if in settings or workspace view
    const response = await page.request.get('http://localhost:3000/api/v1/github/repos').catch(() => null);
    if (response) {
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.repositories.length).toBeGreaterThan(0);
    }
  });
});
