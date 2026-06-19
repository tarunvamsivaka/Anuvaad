import { Page } from '@playwright/test';

export async function mockSupabaseAuth(page: Page) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
  };

  const mockUser = {
    id: 'test-user-id',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'test@example.com',
    email_confirmed_at: new Date().toISOString(),
    phone: '',
    confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { name: 'Test User', onboarded: true },
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const mockSession = {
    access_token: 'fake_access_token_for_ci_testing_purposes',
    token_type: 'bearer',
    expires_in: 3600,
    refresh_token: 'fake_refresh_token_for_ci_testing_purposes',
    user: mockUser,
    expires_at: Math.floor(Date.now() / 1000) + 3600
  };

  // Mock POST **/auth/v1/token* (signInWithPassword, refresh token, etc.)
  await page.route('**/auth/v1/token*', async route => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 200, headers: corsHeaders });
      return;
    }
    if (request.method() === 'POST') {
      try {
        const body = request.postDataJSON();
        if (body && (body.email === 'wrong@example.com' || body.password === 'wrongpassword')) {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            headers: corsHeaders,
            body: JSON.stringify({
              error: 'invalid_grant',
              message: 'Invalid login credentials'
            })
          });
          return;
        }
      } catch (err) {
        // Fallback
      }
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify(mockSession)
    });
  });

  // Mock POST **/auth/v1/signup*
  await page.route('**/auth/v1/signup*', async route => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 200, headers: corsHeaders });
      return;
    }
    if (request.method() === 'POST') {
      try {
        const body = request.postDataJSON();
        if (body && body.password && body.password.length < 8) {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            headers: corsHeaders,
            body: JSON.stringify({
              error: 'validation_failed',
              message: 'Password should be at least 8 characters'
            })
          });
          return;
        }
      } catch (err) {
        // Fallback
      }
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify(mockSession)
    });
  });

  // Mock GET and PUT **/auth/v1/user*
  // GET: used by supabase.auth.getUser()
  // PUT: used by supabase.auth.updateUser() (e.g. onboarding welcome page sets onboarded:true)
  await page.route('**/auth/v1/user*', async route => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 200, headers: corsHeaders });
      return;
    }
    if (request.method() === 'PUT') {
      // Return the updated user with merged metadata so auth state listeners
      // see the change (e.g. onboarded:true) and don't re-trigger the onboarding redirect.
      let updatedMetadata = { ...mockUser.user_metadata };
      try {
        const body = request.postDataJSON();
        if (body?.data) {
          updatedMetadata = { ...updatedMetadata, ...body.data };
        }
      } catch { /* ignore parse errors */ }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify({ ...mockUser, user_metadata: updatedMetadata })
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify(mockUser)
    });
  });

  // Mock POST **/auth/v1/logout*
  await page.route('**/auth/v1/logout*', async route => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 200, headers: corsHeaders });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify({})
    });
  });

  // =========================================================================
  // FALLBACK BACKEND API MOCKS
  // These prevent "Failed to fetch" errors on the backend endpoints in CI/offline E2E.
  // Specific tests can override these by registering their own route handlers later.
  // =========================================================================

  // Fallback for workspaces list
  await page.route('**/api/workspaces*', async route => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 200, headers: corsHeaders });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify([])
    });
  });

  // Fallback for translation history
  await page.route('**/api/history*', async route => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 200, headers: corsHeaders });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify([])
    });
  });

  // Fallback for dashboard stats
  await page.route('**/api/stats*', async route => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 200, headers: corsHeaders });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify({
        total_translations: 5,
        translations_today: 2,
        translations_this_week: 4,
        plan: 'Free'
      })
    });
  });

  // Fallback for subscription status
  await page.route('**/api/subscription-status*', async route => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 200, headers: corsHeaders });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify({
        plan: 'free',
        status: 'active',
        isPro: false
      })
    });
  });

  // Fallback for developer API keys
  await page.route('**/api/api-keys*', async route => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 200, headers: corsHeaders });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify([])
    });
  });

  // Fallback for check-credits
  await page.route('**/api/check-credits*', async route => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 200, headers: corsHeaders });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify({
        credits: 100,
        unlimited: false
      })
    });
  });
}
