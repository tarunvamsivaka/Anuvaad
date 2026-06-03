import { test, expect } from '@playwright/test';
import { mockSupabaseAuth } from './mock-auth';

test.beforeEach(async ({ page }) => {
  await mockSupabaseAuth(page);
});

/**
 * ANUVAAD E2E TEST SUITE
 * ─────────────────────
 * Covers the full user journey:
 *  1. Public pages & navigation
 *  2. Authentication (sign-in, sign-up, invalid creds, redirect)
 *  3. Dashboard home (stats, quick actions, upgrade banner)
 *  4. Translation workspace (all 3 modes, Monaco input, API mock)
 *  5. Translation history (render, search, delete)
 *  6. Billing page (plan display, upgrade button)
 *  7. Settings page (profile, appearance, API keys, danger zone)
 *  8. Sidebar navigation & theme toggle
 */

// ─── Shared Helpers ───────────────────────────────────────────────────────────

/** Set Monaco editor content via the exposed window.__monacoEditor instance */
async function setMonacoValue(page: import('@playwright/test').Page, code: string) {
  await page.waitForFunction(
    () => typeof (window as any).__monacoEditor !== 'undefined',
    { timeout: 10000 }
  );
  await page.evaluate((text: string) => {
    (window as any).__monacoEditor.setValue(text);
  }, code);
  await page.waitForTimeout(300);
}

/** Mock all 3 translation backend SSE endpoints */
async function mockTranslateAPI(page: import('@playwright/test').Page) {
  const blocks = [
    {
      id: 'block-1',
      code_snippet: 'print("Hello")',
      english_translation: 'Prints the string "Hello" to the console.',
    },
  ];
  const sseBody = [
    `data: ${JSON.stringify({ chunk: 'Processing...' })}`,
    `data: ${JSON.stringify({ done: true, blocks, model_used: 'groq/llama3-70b' })}`,
    '',
  ].join('\n');
  for (const endpoint of [
    '**/api/code-to-english',
    '**/api/code-to-code',
    '**/api/generate-from-english',
  ]) {
    await page.route(endpoint, route =>
      route.fulfill({ status: 200, contentType: 'text/event-stream', body: sseBody })
    );
  }
}

/** Mock history list endpoint */
async function mockHistoryAPI(page: import('@playwright/test').Page) {
  const history = [
    {
      id: 'h1',
      input_preview: 'def hello_world():',
      source_language: 'python',
      target_language: 'javascript',
      mode: 'Code → English',
      char_count: 120,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      model_used: 'groq/llama3',
    },
    {
      id: 'h2',
      input_preview: 'SELECT * FROM users',
      source_language: 'sql',
      target_language: 'python',
      mode: 'Code → Code',
      char_count: 80,
      created_at: new Date(Date.now() - 86400000).toISOString(),
      model_used: 'groq/llama3',
    },
  ];
  await page.route('**/api/history', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(history) })
  );
}

/**
 * The dashboard layout renders TWO sidebar <aside> elements in the DOM:
 *   1. Mobile drawer  — off-screen unless mobileOpen=true  (class: md:hidden)
 *   2. Desktop sidebar — visible at ≥ md viewport          (class: hidden md:flex)
 * Each sidebar contains the same navigation links, so every link href appears twice.
 * The mobile sidebar is off-screen → its links are NOT visible.
 * Target the DESKTOP sidebar specifically to avoid strict-mode violations.
 * Playwright's default viewport is 1280×720 px (>= md breakpoint).
 */
function desktopSidebar(page: import('@playwright/test').Page) {
  // The desktop sidebar is the second <aside> (md:flex)
  return page.locator('aside').last();
}

// ─── 1. PUBLIC PAGES ──────────────────────────────────────────────────────────

test.describe('Public Pages', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('landing page loads with Anuvaad branding', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Anuvaad/i);
    await expect(page.locator('text=Anuvaad').first()).toBeVisible();
  });

  test('sign-in page renders correctly', async ({ page }) => {
    await page.goto('/signin');
    await expect(page.locator('h1')).toContainText('Welcome back');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Continue with Google")')).toBeVisible();
    await expect(page.locator('button:has-text("Continue with GitHub")')).toBeVisible();
    // Sign-in page has "Forgot password?" link
    await expect(page.locator('a[href="/forgot-password"]')).toBeVisible();
    // Sign-in page has "Sign Up" link to create account
    await expect(page.locator('a[href="/signup"]')).toBeVisible();
  });

  test('sign-up page renders correctly', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.locator('h1')).toContainText('Create your account');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Create Account")')).toBeVisible();
    // Has link back to sign-in
    await expect(page.locator('a[href="/signin"]')).toBeVisible();
  });

  test('sign-in page "Sign Up" link navigates to /signup', async ({ page }) => {
    await page.goto('/signin');
    await page.click('a[href="/signup"]');
    await expect(page).toHaveURL(/\/signup/);
    await expect(page.locator('h1')).toContainText('Create your account');
  });

  test('sign-up page "Sign In" link navigates to /signin', async ({ page }) => {
    await page.goto('/signup');
    await page.click('a[href="/signin"]');
    await expect(page).toHaveURL(/\/signin/);
    await expect(page.locator('h1')).toContainText('Welcome back');
  });
});

// ─── 2. AUTHENTICATION ────────────────────────────────────────────────────────

test.describe('Authentication — Unauthenticated Guards', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('visiting /dashboard redirects unauthenticated user to /signin', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/signin/);
  });

  test('visiting /dashboard/translate redirects to /signin', async ({ page }) => {
    await page.goto('/dashboard/translate');
    await expect(page).toHaveURL(/\/signin/);
  });

  test('visiting /dashboard/billing redirects to /signin', async ({ page }) => {
    await page.goto('/dashboard/billing');
    await expect(page).toHaveURL(/\/signin/);
  });

  test('visiting /dashboard/settings redirects to /signin', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await expect(page).toHaveURL(/\/signin/);
  });

  test('visiting /dashboard/history redirects to /signin', async ({ page }) => {
    await page.goto('/dashboard/history');
    await expect(page).toHaveURL(/\/signin/);
  });

  test('sign-in with invalid credentials shows error message', async ({ page }) => {
    await page.goto('/signin');
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('p.text-destructive, p[class*="destructive"]')).toBeVisible({ timeout: 8000 });
  });

  test('sign-up with password shorter than 8 chars shows HTML validation', async ({ page }) => {
    await page.goto('/signup');
    await page.fill('input[type="email"]', 'new@example.com');
    await page.fill('input[type="password"]', 'abc');
    await page.click('button[type="submit"]');
    // HTML5 minLength validation prevents submission
    await expect(page).not.toHaveURL(/\/dashboard/);
  });
});

// ─── 3. DASHBOARD HOME ────────────────────────────────────────────────────────

test.describe('Dashboard Home', () => {

  test('dashboard shows welcome message with user name', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('h1')).toContainText('Welcome');
  });

  test('dashboard shows all 4 stat cards', async ({ page }) => {
    await page.goto('/dashboard');
    // Wait for stats to load (async fetch)
    await expect(page.locator("text=Today's Translations")).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=This Week')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=All Time')).toBeVisible({ timeout: 5000 });
    // "Current Plan" stat card
    await expect(page.locator('p.text-xs:has-text("Current Plan")')).toBeVisible({ timeout: 5000 });
  });

  test('dashboard Quick Actions section has 3 translation mode links', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('h2:has-text("Quick Actions")')).toBeVisible();
    await expect(page.locator('a[href="/dashboard/translate"] p:has-text("Code → English")')).toBeVisible();
    await expect(page.locator('a[href*="english-to-code"]')).toBeVisible();
    await expect(page.locator('a[href*="code-to-code"]')).toBeVisible();
  });

  test('"New Translation" button navigates to translate page', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('a:has-text("New Translation")');
    await expect(page).toHaveURL(/\/dashboard\/translate/);
  });

  test('free user sees upgrade banner on dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('text=Upgrade to Pro for unlimited translations')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('a:has-text("Upgrade Now")')).toBeVisible();
  });

  test('"Upgrade Now" banner links to billing page', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('a:has-text("Upgrade Now")');
    await expect(page).toHaveURL(/\/dashboard\/billing/);
  });

  test('Recent Translations section is visible', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('h2:has-text("Recent Translations")')).toBeVisible();
  });

  test('"View All" link in Recent Translations goes to history page', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('text=View All');
    await expect(page).toHaveURL(/\/dashboard\/history/);
  });
});

// ─── 4. TRANSLATION WORKSPACE ─────────────────────────────────────────────────

test.describe('Translation Workspace', () => {

  test('translate page loads with correct heading and controls', async ({ page }) => {
    await page.goto('/dashboard/translate');
    await expect(page.locator('h1')).toContainText('Workspace');
    await expect(page.locator('button:has-text("Generate Translation")')).toBeVisible();
    await expect(page.locator('button[role="tab"]:has-text("Code → English")')).toBeVisible();
    await expect(page.locator('button[role="tab"]:has-text("English → Code")')).toBeVisible();
    await expect(page.locator('button[role="tab"]:has-text("Code → Code")')).toBeVisible();
  });

  test('Generate Translation button is disabled when editor is empty', async ({ page }) => {
    await page.goto('/dashboard/translate');
    await expect(page.locator('button:has-text("Translate")')).toBeDisabled();
  });

  test('"Type Code Manually" button dismisses drag-and-drop overlay', async ({ page }) => {
    await page.goto('/dashboard/translate');
    await expect(page.locator('text=Drag & drop a code file')).toBeVisible();
    await page.click('button:has-text("Type Code Manually")');
    await expect(page.locator('text=Drag & drop a code file')).not.toBeVisible();
  });

  test('Code→English: translation renders output blocks', async ({ page }) => {
    await page.goto('/dashboard/translate');
    await mockTranslateAPI(page);
    await page.click('button:has-text("Type Code Manually")');
    await setMonacoValue(page, 'print("Hello")');
    await expect(page.locator('button:has-text("Translate")')).toBeEnabled({ timeout: 5000 });
    await page.click('button:has-text("Translate")');
    await expect(page.locator('text=Block 1')).toBeVisible({ timeout: 10000 });
  });

  test('Code→English: Copy as Markdown button appears after translation', async ({ page }) => {
    await page.goto('/dashboard/translate');
    await mockTranslateAPI(page);
    await page.click('button:has-text("Type Code Manually")');
    await setMonacoValue(page, 'x = 42');
    await expect(page.locator('button:has-text("Translate")')).toBeEnabled({ timeout: 5000 });
    await page.click('button:has-text("Translate")');
    await expect(page.locator('button:has-text("Copy as Markdown")')).toBeVisible({ timeout: 10000 });
  });

  test('Code→English: Download JSON button downloads a file', async ({ page }) => {
    await page.goto('/dashboard/translate');
    await mockTranslateAPI(page);
    await page.click('button:has-text("Type Code Manually")');
    await setMonacoValue(page, 'y = 2');
    await expect(page.locator('button:has-text("Translate")')).toBeEnabled({ timeout: 5000 });
    await page.click('button:has-text("Translate")');
    const downloadBtn = page.locator('button:has-text("Download JSON")');
    await expect(downloadBtn).toBeVisible({ timeout: 10000 });
    const downloadPromise = page.waitForEvent('download');
    await downloadBtn.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.json');
  });

  test('English→Code: switching mode shows textarea input', async ({ page }) => {
    await page.goto('/dashboard/translate');
    await page.click('button[role="tab"]:has-text("English → Code")');
    await expect(page.locator('textarea[placeholder*="Describe the functionality"]')).toBeVisible();
  });

  test('English→Code: can submit description and see output', async ({ page }) => {
    await page.goto('/dashboard/translate');
    await mockTranslateAPI(page);
    await page.click('button[role="tab"]:has-text("English → Code")');
    await page.fill('textarea', 'Write a function that adds two numbers');
    await expect(page.locator('button:has-text("Translate")')).toBeEnabled({ timeout: 5000 });
    await page.click('button:has-text("Translate")');
    await expect(page.locator('text=Block 1')).toBeVisible({ timeout: 10000 });
  });

  test('Code→Code: switching mode shows source and target language selectors', async ({ page }) => {
    await page.goto('/dashboard/translate');
    await page.click('button[role="tab"]:has-text("Code → Code")');
    await expect(page.locator('span:has-text("Source:")')).toBeVisible();
    await expect(page.locator('span:has-text("Target:")')).toBeVisible();
  });

  test('Code→Code: can change source and target languages', async ({ page }) => {
    await page.goto('/dashboard/translate');
    await page.click('button[role="tab"]:has-text("Code → Code")');
    
    // Open Source dropdown and select JavaScript
    await page.click('span:has-text("Source:")');
    await page.click('div.max-h-48 div:has-text("JavaScript")');
    
    // Open Target dropdown and select Python
    await page.click('span:has-text("Target:")');
    await page.click('div.max-h-48 div:has-text("Python")');
    
    // Verify changes (the sibling span carries the selected name)
    await expect(page.locator('span:has-text("Source:") + span')).toHaveText('JavaScript');
    await expect(page.locator('span:has-text("Target:") + span')).toHaveText('Python');
  });

  test('Reset button clears editor and hides output', async ({ page }) => {
    await page.goto('/dashboard/translate');
    await mockTranslateAPI(page);
    await page.click('button:has-text("Type Code Manually")');
    await setMonacoValue(page, 'z = 3');
    await expect(page.locator('button:has-text("Translate")')).toBeEnabled({ timeout: 5000 });
    await page.click('button:has-text("Translate")');
    await expect(page.locator('text=Block 1')).toBeVisible({ timeout: 10000 });
    // Click the reset/clear button (rotate-ccw icon)
    await page.locator('button').filter({ has: page.locator('.lucide-rotate-ccw') }).click();
    await expect(page.locator('text=Workspace Empty')).toBeVisible({ timeout: 5000 });
  });

  test('Context & Settings panel toggles open/closed', async ({ page }) => {
    await page.goto('/dashboard/translate');
    await expect(page.locator('text=Corporate Standards / Custom Instructions')).not.toBeVisible();
    await page.click('button:has-text("Instructions")');
    await expect(page.locator('text=Corporate Standards / Custom Instructions')).toBeVisible();
    await page.click('button:has-text("Instructions")');
    await expect(page.locator('text=Corporate Standards / Custom Instructions')).not.toBeVisible();
  });

  test('output block can be collapsed and expanded', async ({ page }) => {
    await page.goto('/dashboard/translate');
    await mockTranslateAPI(page);
    await page.click('button:has-text("Type Code Manually")');
    await setMonacoValue(page, 'a = 1');
    await expect(page.locator('button:has-text("Translate")')).toBeEnabled({ timeout: 5000 });
    await page.click('button:has-text("Translate")');
    await expect(page.locator('text=Block 1')).toBeVisible({ timeout: 10000 });
    // Collapse block (chevron-up → click → chevron-down)
    const collapseBtn = page.locator('.lucide-chevron-up').first();
    await expect(collapseBtn).toBeVisible();
    await collapseBtn.click();
    await expect(page.locator('.lucide-chevron-down').first()).toBeVisible();
  });

  test('"Copy as Markdown" copies to clipboard and shows feedback', async ({ page }) => {
    await page.goto('/dashboard/translate');
    await mockTranslateAPI(page);
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.click('button:has-text("Type Code Manually")');
    await setMonacoValue(page, 'b = 2');
    await expect(page.locator('button:has-text("Translate")')).toBeEnabled({ timeout: 5000 });
    await page.click('button:has-text("Translate")');
    await expect(page.locator('button:has-text("Copy as Markdown")')).toBeVisible({ timeout: 10000 });
    await page.click('button:has-text("Copy as Markdown")');
    // Button should briefly change text to confirm copy
    await expect(page.locator('button:has-text("Copied MD")')).toBeVisible({ timeout: 3000 });
  });
});

// ─── 5. TRANSLATION HISTORY ───────────────────────────────────────────────────

test.describe('Translation History', () => {

  test('history page loads with correct heading', async ({ page }) => {
    await page.goto('/dashboard/history');
    await expect(page.locator('h1')).toContainText('Translation History');
  });

  test('history page shows items from the API', async ({ page }) => {
    await mockHistoryAPI(page);
    await page.goto('/dashboard/history');
    await expect(page.locator('text=def hello_world():')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=SELECT * FROM users')).toBeVisible({ timeout: 8000 });
  });

  test('history search filters items by keyword', async ({ page }) => {
    await mockHistoryAPI(page);
    await page.goto('/dashboard/history');
    await expect(page.locator('text=def hello_world():')).toBeVisible({ timeout: 8000 });
    await page.fill('input[aria-label="Search translations"]', 'sql');
    await page.waitForTimeout(500); // debounce
    await expect(page.locator('text=SELECT * FROM users')).toBeVisible();
    await expect(page.locator('text=def hello_world():')).not.toBeVisible();
  });

  test('history search clearing restores all items', async ({ page }) => {
    await mockHistoryAPI(page);
    await page.goto('/dashboard/history');
    await expect(page.locator('text=def hello_world():')).toBeVisible({ timeout: 8000 });
    await page.fill('input[aria-label="Search translations"]', 'nonexistent_query_xyz');
    await page.waitForTimeout(500);
    await expect(page.locator('text=No translations found')).toBeVisible();
    await page.fill('input[aria-label="Search translations"]', '');
    await page.waitForTimeout(500);
    await expect(page.locator('text=def hello_world():')).toBeVisible();
  });

  test('history item shows mode badge and language info', async ({ page }) => {
    await mockHistoryAPI(page);
    await page.goto('/dashboard/history');
    await expect(page.locator('text=Code → English').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=python').first()).toBeVisible();
  });

  test('history empty state shows start translating CTA', async ({ page }) => {
    await page.route('**/api/history', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    );
    await page.goto('/dashboard/history');
    await expect(page.locator('text=No translations found')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('a:has-text("Start Translating")')).toBeVisible();
  });

  test('"Start Translating" CTA navigates to translate page', async ({ page }) => {
    await page.route('**/api/history', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    );
    await page.goto('/dashboard/history');
    await page.click('a:has-text("Start Translating")');
    await expect(page).toHaveURL(/\/dashboard\/translate/);
  });

  test('delete button removes history item optimistically', async ({ page }) => {
    await mockHistoryAPI(page);
    await page.route('**/api/history/h1', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/dashboard/history');
    await expect(page.locator('text=def hello_world():')).toBeVisible({ timeout: 8000 });
    // Hover first card to reveal delete button
    const firstCard = page.locator('text=def hello_world():').locator('xpath=ancestor::div[contains(@class,"group")]');
    await firstCard.hover();
    const deleteBtn = page.locator('[aria-label*="Delete translation"]').first();
    await expect(deleteBtn).toBeVisible({ timeout: 3000 });
    await deleteBtn.click();
    await expect(page.locator('text=def hello_world():')).not.toBeVisible({ timeout: 3000 });
  });
});

// ─── 6. BILLING PAGE ──────────────────────────────────────────────────────────

test.describe('Billing Page', () => {

  test('billing page loads with correct heading', async ({ page }) => {
    await page.goto('/dashboard/billing');
    await expect(page.locator('h1')).toContainText('Billing');
  });

  test('free user sees Free Plan heading', async ({ page }) => {
    await page.goto('/dashboard/billing');
    await expect(page.locator('h2:has-text("Free Plan")')).toBeVisible({ timeout: 10000 });
  });

  test('billing page shows usage section', async ({ page }) => {
    await page.goto('/dashboard/billing');
    await expect(page.locator('text=Usage this billing period')).toBeVisible({ timeout: 10000 });
  });

  test('free user sees Upgrade button', async ({ page }) => {
    await page.goto('/dashboard/billing');
    await expect(page.locator('button:has-text("Upgrade")')).toBeVisible({ timeout: 10000 });
  });
});

// ─── 7. SETTINGS PAGE ─────────────────────────────────────────────────────────

test.describe('Settings Page', () => {

  test('settings page loads with correct heading', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await expect(page.locator('h1')).toContainText('Settings');
  });

  test('settings Profile section shows email and display name fields', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await expect(page.locator('h2:has-text("Profile")')).toBeVisible();
    await expect(page.locator('label:has-text("Email")')).toBeVisible();
    await expect(page.locator('label:has-text("Display Name")')).toBeVisible();
  });

  test('email field is disabled (read-only) in settings', async ({ page }) => {
    await page.goto('/dashboard/settings');
    // The email input is the first disabled input
    const emailInput = page.locator('input[disabled]').first();
    await expect(emailInput).toBeDisabled();
  });

  test('settings Appearance section has theme dropdown with 3 options', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await expect(page.locator('h2:has-text("Appearance")')).toBeVisible({ timeout: 8000 });
    // The theme select is inside main content (sidebar also has workspace selects → 3 total)
    const themeSelect = page.locator('#main-content select');
    await expect(themeSelect).toBeVisible({ timeout: 8000 });
    await expect(themeSelect.locator('option[value="system"]')).toBeAttached();
    await expect(themeSelect.locator('option[value="light"]')).toBeAttached();
    await expect(themeSelect.locator('option[value="dark"]')).toBeAttached();
  });

  test('settings Developer API Keys section loads', async ({ page }) => {
    await page.route('**/api/api-keys*', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    );
    await page.goto('/dashboard/settings');
    await expect(page.locator('h2:has-text("Developer API Keys")')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=No API keys generated yet.')).toBeVisible({ timeout: 5000 });
  });

  test('Create Key button is disabled when key name is empty', async ({ page }) => {
    await page.route('**/api/api-keys*', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    );
    await page.goto('/dashboard/settings');
    await expect(page.locator('button:has-text("Create Key")')).toBeDisabled({ timeout: 8000 });
  });

  test('Create Key button enables when key name is filled', async ({ page }) => {
    await page.route('**/api/api-keys*', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    );
    await page.goto('/dashboard/settings');
    await page.fill('input[placeholder*="CI Pipeline"]', 'My Test Key');
    await expect(page.locator('button:has-text("Create Key")')).toBeEnabled({ timeout: 5000 });
  });

  test('settings Subscription section shows plan badge', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await expect(page.locator('h2:has-text("Subscription")')).toBeVisible({ timeout: 8000 });
    // Free or Pro badge
    await expect(
      page.locator('[class*="Badge"], [class*="badge"]').filter({ hasText: /Free|Pro/ }).first()
    ).toBeVisible({ timeout: 8000 });
  });

  test('settings Danger Zone has Sign Out and Delete buttons', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await expect(page.locator('h2:has-text("Danger Zone")')).toBeVisible({ timeout: 8000 });
    // Scope to main content to avoid matching the 2 sidebar Sign Out buttons
    const mainContent = page.locator('#main-content');
    await expect(mainContent.locator('button:has-text("Sign Out")')).toBeVisible({ timeout: 5000 });
    await expect(mainContent.locator('button:has-text("Delete")')).toBeVisible({ timeout: 5000 });
  });

  test('Delete Account button opens confirmation dialog', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await page.click('button:has-text("Delete")');
    await expect(page.locator('text=Are you absolutely sure?')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Delete Account")')).toBeVisible();
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
  });

  test('Cancel button in delete dialog closes it', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await page.click('button:has-text("Delete")');
    await expect(page.locator('text=Are you absolutely sure?')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Cancel")');
    await expect(page.locator('text=Are you absolutely sure?')).not.toBeVisible();
  });
});

// ─── 8. SIDEBAR NAVIGATION ────────────────────────────────────────────────────
//
// NOTE: The layout renders TWO <aside> elements — a mobile drawer (hidden off-screen)
// and the desktop sidebar (visible at 1280px viewport). Both contain the same links,
// so href selectors resolve to 2 elements. We always scope to the LAST aside (desktop).

test.describe('Sidebar Navigation', () => {

  test('desktop sidebar has links to all main sections', async ({ page }) => {
    await page.goto('/dashboard');
    const sidebar = desktopSidebar(page);
    await expect(sidebar.locator('a[href="/dashboard"]')).toBeVisible({ timeout: 8000 });
    await expect(sidebar.locator('a[href="/dashboard/translate"]')).toBeVisible();
    await expect(sidebar.locator('a[href="/dashboard/history"]')).toBeVisible();
    await expect(sidebar.locator('a[href="/dashboard/billing"]')).toBeVisible();
    await expect(sidebar.locator('a[href="/dashboard/settings"]')).toBeVisible();
  });

  test('clicking Translate in sidebar navigates to /dashboard/translate', async ({ page }) => {
    await page.goto('/dashboard');
    await desktopSidebar(page).locator('a[href="/dashboard/translate"]').click();
    await expect(page).toHaveURL(/\/dashboard\/translate/);
  });

  test('clicking History in sidebar navigates to /dashboard/history', async ({ page }) => {
    await page.goto('/dashboard');
    await desktopSidebar(page).locator('a[href="/dashboard/history"]').click();
    await expect(page).toHaveURL(/\/dashboard\/history/);
  });

  test('clicking Billing in sidebar navigates to /dashboard/billing', async ({ page }) => {
    await page.goto('/dashboard');
    await desktopSidebar(page).locator('a[href="/dashboard/billing"]').click();
    await expect(page).toHaveURL(/\/dashboard\/billing/);
  });

  test('clicking Settings in sidebar navigates to /dashboard/settings', async ({ page }) => {
    await page.goto('/dashboard');
    await desktopSidebar(page).locator('a[href="/dashboard/settings"]').click();
    await expect(page).toHaveURL(/\/dashboard\/settings/);
  });

  test('theme toggle button is present in the desktop sidebar', async ({ page }) => {
    await page.goto('/dashboard');
    // Two ThemeToggle buttons exist (one per sidebar). Check the desktop one.
    await expect(
      desktopSidebar(page).locator('button[aria-label="Toggle theme"]')
    ).toBeVisible({ timeout: 8000 });
  });

  test('theme toggle changes the applied theme class on <html>', async ({ page }) => {
    await page.goto('/dashboard');
    // Click the desktop sidebar theme toggle (first = mobile/hidden, last = desktop)
    await desktopSidebar(page).locator('button[aria-label="Toggle theme"]').click();
    const classAttr = await page.locator('html').getAttribute('class');
    expect(classAttr).toMatch(/light|dark/);
  });
});
