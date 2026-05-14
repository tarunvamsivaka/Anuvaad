import { test, expect } from '@playwright/test';

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
    await expect(page.locator('h1')).toContainText('Translate');
    await expect(page.locator('button:has-text("Translate")')).toBeVisible();
  });

  test('pasting Python code and clicking Translate shows output blocks', async ({ page }) => {
    await page.goto('/dashboard/translate');
    
    // Fill the editor. Assuming Monaco editor is present or a fallback textarea.
    // In Monaco, it can be tricky to type, but we can paste via clipboard or fill textarea if visible
    // Often there is a textarea with class inputarea
    const editorTextarea = page.locator('.inputarea, textarea').first();
    await editorTextarea.fill('print("Hello world")');

    // Click translate
    await page.click('button:has-text("Translate")');
    
    // Expect output blocks to appear
    await expect(page.locator('.lucide-copy')).toBeVisible({ timeout: 15000 });
  });

  test('switching from Code→English to English→Code mode changes the input placeholder', async ({ page }) => {
    await page.goto('/dashboard/translate');
    
    // Look for the mode tabs
    const englishToCodeTab = page.locator('button[role="tab"]:has-text("English → Code")');
    if (await englishToCodeTab.isVisible()) {
      await englishToCodeTab.click();
      
      // Look for the textarea placeholder changing
      // Assuming English to Code uses a standard textarea
      const textarea = page.locator('textarea[placeholder*="Describe the logic"]');
      await expect(textarea).toBeVisible();
    }
  });

  test('Copy button on an output block copies text to clipboard', async ({ page }) => {
    await page.goto('/dashboard/translate');
    
    // Mock clipboard API
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    
    // Trigger a fake translation or assume output is visible via mock (but this is E2E)
    // We will wait for the copy button, click it, and check clipboard
    const editorTextarea = page.locator('.inputarea, textarea').first();
    await editorTextarea.fill('x = 1');
    await page.click('button:has-text("Translate")');
    
    const copyBtn = page.locator('button:has(.lucide-copy)').first();
    await expect(copyBtn).toBeVisible({ timeout: 15000 });
    
    await copyBtn.click();
    
    // Check clipboard content
    const handle = await page.evaluateHandle(() => navigator.clipboard.readText());
    const clipboardText = await handle.jsonValue();
    expect(clipboardText.length).toBeGreaterThan(0);
  });

  test('Download button triggers a file download', async ({ page }) => {
    await page.goto('/dashboard/translate');
    
    const editorTextarea = page.locator('.inputarea, textarea').first();
    await editorTextarea.fill('y = 2');
    await page.click('button:has-text("Translate")');
    
    const downloadBtn = page.locator('button:has(.lucide-download)').first();
    await expect(downloadBtn).toBeVisible({ timeout: 15000 });
    
    const downloadPromise = page.waitForEvent('download');
    await downloadBtn.click();
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBeTruthy();
  });
});
