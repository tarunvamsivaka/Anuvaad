import { test, expect } from '@playwright/test';
import { mockSupabaseAuth } from './mock-auth';

test.beforeEach(async ({ page }) => {
  await mockSupabaseAuth(page);
});

// Helper: set Monaco editor value via the exposed editor instance on window.__monacoEditor.
// page.keyboard.type() hits the DOM textarea but does NOT fire Monaco's onChange → React never
// updates the `input` state → the "Translate" button stays disabled.
async function setMonacoValue(page: import('@playwright/test').Page, code: string) {
  // Wait for Monaco to mount and expose itself via onMount handler
  await page.waitForFunction(
    () => typeof (window as any).__monacoEditor !== 'undefined',
    { timeout: 10000 }
  );

  await page.evaluate((text: string) => {
    const editor = (window as any).__monacoEditor;
    editor.setValue(text);
  }, code);

  // Give React one tick to process the onChange event and update state
  await page.waitForTimeout(300);
}

// Helper: mock the backend streaming API with a realistic SSE response
async function mockTranslateAPI(page: import('@playwright/test').Page) {
  const mockBlocks = [
    {
      id: 'block-1',
      code_snippet: 'print("Hello world")',
      english_translation: 'This line prints the text "Hello world" to the console.',
    },
  ];

  // SSE stream: a chunk line + a done line
  const sseBody = [
    `data: ${JSON.stringify({ chunk: 'Analyzing code...' })}`,
    `data: ${JSON.stringify({ done: true, blocks: mockBlocks, model_used: 'groq/llama3' })}`,
    '',
  ].join('\n');

  // Intercept all code-to-english, code-to-code, and generate-from-english endpoints
  await page.route('**/api/code-to-english', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream; charset=utf-8',
      body: sseBody,
    });
  });

  await page.route('**/api/code-to-code', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream; charset=utf-8',
      body: sseBody,
    });
  });

  await page.route('**/api/generate-from-english', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream; charset=utf-8',
      body: sseBody,
    });
  });
}

// Unauthenticated tests don't use the stored storageState
test.describe('Unauthenticated Translation Flow', () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // Clear auth state
  
  test('unauthenticated user is redirected from /dashboard to /signin', async ({ page }) => {
    await page.goto('/dashboard');
    // Expect the middleware to redirect to /signin
    await expect(page).toHaveURL(/\/signin/);
  });
});

test.describe('Authenticated Translation Flow', () => {
  // Uses the auth.setup.ts storageState by default

  test('authenticated user can see the translate page', async ({ page }) => {
    await page.goto('/dashboard/translate');
    await expect(page.locator('h1')).toContainText('Workspace');
    await expect(page.locator('button:has-text("Translate")')).toBeVisible();
  });

  test('pasting Python code and clicking Translate shows output blocks', async ({ page }) => {
    await page.goto('/dashboard/translate');

    // Mock the backend API (backend is not running during E2E tests)
    await mockTranslateAPI(page);

    // Dismiss the drag-and-drop overlay so the Monaco editor is uncovered
    await page.click('button:has-text("Type Code Manually")');

    // Set Monaco value directly via Monaco API (keyboard.type won't trigger React onChange)
    await setMonacoValue(page, 'print("Hello world")');

    // The button should now be enabled
    const translateBtn = page.locator('button:has-text("Translate")');
    await expect(translateBtn).toBeEnabled({ timeout: 5000 });
    await translateBtn.click({ force: true });
    
    // Expect output blocks to appear (copy icon appears inside each block card)
    await expect(page.locator('.lucide-copy').first()).toBeVisible({ timeout: 15000 });
  });

  test('switching from Code→English to English→Code mode changes the input placeholder', async ({ page }) => {
    await page.goto('/dashboard/translate');
    
    // Look for the mode tabs
    const englishToCodeTab = page.locator('button[role="tab"]:has-text("English → Code")');
    if (await englishToCodeTab.isVisible()) {
      await englishToCodeTab.click();
      
      // English→Code uses a standard textarea (no Monaco)
      const textarea = page.locator('textarea[placeholder*="Describe the functionality"]');
      await expect(textarea).toBeVisible();
    }
  });

  test('Copy button on an output block copies text to clipboard', async ({ page }) => {
    // Navigate to translate page
    await page.goto('/dashboard/translate');

    // Mock the backend API
    await mockTranslateAPI(page);
    
    // Grant clipboard permissions
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    
    // Type code manually
    await page.click('button:has-text("Type Code Manually")');

    // Fill the editor with a simple Python script
    await setMonacoValue(page, 'def greet(name):\n    print(f"Hello, {name}!")\n\ngreet("Alice")');

    const translateBtn = page.locator('button:has-text("Translate")');
    await expect(translateBtn).toBeEnabled({ timeout: 5000 });
    await translateBtn.click({ force: true });
    
    // Wait for the copy button to appear
    const copyBtn = page.locator('button', { has: page.locator('.lucide-copy') }).first();
    await expect(copyBtn).toBeVisible({ timeout: 15000 });

    // Click to copy
    await copyBtn.scrollIntoViewIfNeeded();
    await copyBtn.click({ force: true });

    // Verify it changes to checkmark
    await expect(page.locator('.lucide-check')).toBeVisible({ timeout: 2000 });

    // Check clipboard contents (using page.evaluate)
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBeTruthy();
    expect(clipboardText.length).toBeGreaterThan(0);
  });

  test('Download JSON button appears after translation', async ({ page }) => {
    // Navigate to translate page
    await page.goto('/dashboard/translate');

    // Mock the backend API
    await mockTranslateAPI(page);
    
    // Type code manually
    await page.click('button:has-text("Type Code Manually")');

    // Fill the editor
    await setMonacoValue(page, 'print("Ready for JSON export")');

    const translateBtn = page.locator('button:has-text("Translate")');
    await expect(translateBtn).toBeEnabled({ timeout: 5000 });
    await translateBtn.click({ force: true });
    
    // Wait for output panel header buttons to appear
    const downloadBtn = page.locator('button:has-text("Download JSON")');
    await expect(downloadBtn).toBeVisible({ timeout: 15000 });
    
    const downloadPromise = page.waitForEvent('download');
    await downloadBtn.scrollIntoViewIfNeeded();
    await downloadBtn.click({ force: true });
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBeTruthy();
  });
});
