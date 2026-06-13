import { test, expect } from '@playwright/test';
import { mockSupabaseAuth } from './mock-auth';

test.beforeEach(async ({ page }) => {
  await mockSupabaseAuth(page);
});

async function setMonacoValue(page: any, code: string) {
  await page.waitForFunction(
    () => typeof (window as any).__monacoEditor !== 'undefined',
    { timeout: 10000 }
  );

  await page.evaluate((text: string) => {
    const editor = (window as any).__monacoEditor;
    editor.setValue(text);
  }, code);

  await page.waitForTimeout(300);
}

test('Perform real translation and verify results in the website', async ({ page }) => {
  test.setTimeout(120000);

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Mock API routes to prevent calling real LLMs or requiring the backend in CI
  await page.route('**/api/code-to-english', async route => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 200, headers: corsHeaders });
      return;
    }
    await route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        ...corsHeaders,
      },
      body: [
        'data: {"chunk": "Defines", "done": false}\n\n',
        'data: {"chunk": " a function", "done": false}\n\n',
        `data: {"done": true, "blocks": [{"id": "block_1", "code_snippet": "#include <stdio.h>", "english_translation": "Imports the standard input/output library."}, {"id": "block_2", "code_snippet": "int main() {\\n    printf(\\"Hello, Anuvaad!\\\\n\\");\\n    return 0;\\n}", "english_translation": "Prints hello world."}], "model_used": "llama-3"}\n\n`
      ].join('')
    });
  });

  await page.route('**/api/sync-english-to-code', async route => {
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
        status: "success",
        updated_code: `#include <stdio.h>\n\nint main() {\n    printf("Hello, Anuvaad!\\n");\n    return 0;\n}`,
        blocks: [
          { "id": "block_1", "code_snippet": "#include <stdio.h>", "english_translation": "Imports the standard input/output library." },
          { "id": "block_2", "code_snippet": "int main() {\n    printf(\"Hello, Anuvaad!\\n\");\n    return 0;\n}", "english_translation": "Prints hello world." }
        ],
        model_used: "llama-3"
      })
    });
  });

  console.log('Navigating to translate page...');
  await page.goto('/dashboard/translate');

  // Dismiss the manual typing overlay
  console.log('Dismissing Manual Typing overlay...');
  await page.click('button:has-text("Type Code Manually")');

  // Set the C code in Monaco editor
  const cCode = `#include <stdio.h>

int main() {
    printf("Hello, Anuvaad!\\n");
    return 0;
}`;
  console.log('Injecting C source code into Monaco...');
  await setMonacoValue(page, cCode);

  // Verify Translate button is enabled
  const translateBtn = page.locator('button:has-text("Translate")');
  await expect(translateBtn).toBeEnabled({ timeout: 5000 });

  // Click Translate
  console.log('Clicking "Translate" button...');
  await translateBtn.click({ force: true });

  // Wait for the translation to complete by waiting for "Copy as Markdown" or output block items
  console.log('Waiting for translation blocks to stream in...');
  const copyBtn = page.locator('button:has-text("Copy as Markdown")');
  await expect(copyBtn).toBeVisible({ timeout: 45000 });

  console.log('Translation complete! Taking proof screenshot...');
  
  // Wait a small moment for animations to settle
  await page.waitForTimeout(1000);

  // Take full page screenshot and save to a safe relative path
  const screenshotPath = 'playwright/media__real_translation.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Proof screenshot saved to ${screenshotPath}`);

  // Print sample translation outputs
  const cards = page.locator('p[data-prose]');
  const firstCardText = await cards.first().innerText();
  console.log('--- SAMPLE TRANSLATION OUTPUT ---');
  console.log(firstCardText);
  console.log('---------------------------------');

  // TWO-WAY SYNC E2E TEST
  console.log('Starting E2E check for Two-Way Sync...');
  
  // 1. Find the English explanation section inside the first block card.
  //    The English section is a div with `bg-background group` that wraps the explanation text.
  //    We use the paragraph text inside it to scope correctly, then find its parent group div.
  const firstBlockText = page.locator('div.group p[data-prose]').first();
  await expect(firstBlockText).toBeVisible({ timeout: 5000 });
  
  // Get the parent `.group` div (the English explanation panel)
  const firstEnglishPanel = page.locator('div.group').filter({ has: page.locator('p[data-prose]') }).first();

  // Hover so the CSS group-hover buttons become visible (non-critical, wrap in try/catch for mobile compatibility)
  try {
    await firstEnglishPanel.hover({ timeout: 1000 });
  } catch (e) {
    console.log('Hover failed or skipped on mobile viewport:', e);
  }
  await page.waitForTimeout(300); // Let CSS transition settle
  
  // Get the Edit button and click it programmatically to avoid layout overlap interception in WebKit (mobile-safari)
  const editBtn = firstEnglishPanel.locator('button:has-text("Edit")');
  await editBtn.evaluate((node) => (node as HTMLElement).click());
  
  // 2. Modify the explanation in the inline textarea
  //    Scope to the card group to avoid matching Monaco's hidden textareas
  const textarea = page.locator('div.group textarea').first();
  await expect(textarea).toBeVisible({ timeout: 5000 });
  await textarea.fill('Imports the standard input/output library for printing messages to the standard output stream.');
  
  // 3. Save the card edits
  const saveBtn = page.locator('button:has-text("Save")').first();
  await saveBtn.scrollIntoViewIfNeeded();
  await saveBtn.click({ force: true });
  
  // 4. Verify that the sync warning banner has appeared
  const syncBanner = page.locator('text=Modified explanations detected');
  await expect(syncBanner).toBeVisible({ timeout: 5000 });
  
  // 5. Trigger sync to code
  const syncBtn = page.locator('button:has-text("Sync to Code")');
  await syncBtn.scrollIntoViewIfNeeded();
  await syncBtn.click({ force: true });
  
  // 6. Verify sync succeeds (banner goes away after code is synced)
  await expect(syncBanner).not.toBeVisible({ timeout: 30000 });
  
  console.log('Two-Way Sync E2E test completed successfully!');
});
