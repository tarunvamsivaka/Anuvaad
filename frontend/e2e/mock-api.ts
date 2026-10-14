import type { Page, Route } from '@playwright/test';

export async function setupDeterministicApiMocks(page: Page) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-LLM-Key',
  };

  // Health probes
  await page.route('**/health/live', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify({ status: 'alive' }),
    });
  });

  await page.route('**/health/ready', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify({ status: 'ready', redis: true, postgres: true }),
    });
  });

  const mockBlocks = [
    {
      id: 'block-1',
      code_snippet: 'def hello_world():\n    print("Hello world")',
      english_translation: 'Defines a hello_world function that outputs a greeting to the console.',
    },
  ];

  // SSE Multi-chunk response
  const sseChunks = [
    `data: ${JSON.stringify({ chunk: 'Analyzing code semantics...' })}\n\n`,
    `data: ${JSON.stringify({ chunk: ' Parsing symbol boundaries...' })}\n\n`,
    `data: ${JSON.stringify({ chunk: ' Generating explanation...' })}\n\n`,
    `data: ${JSON.stringify({ done: true, blocks: mockBlocks, model_used: 'gemini-2.5-flash' })}\n\n`,
    `data: [DONE]\n\n`,
  ];

  const streamHandler = async (route: Route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 200, headers: corsHeaders });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream; charset=utf-8',
      headers: {
        ...corsHeaders,
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
      body: sseChunks.join(''),
    });
  };

  await page.route('**/api/code-to-english*', streamHandler);
  await page.route('**/api/generate-from-english*', streamHandler);
  await page.route('**/api/code-to-code*', streamHandler);
}
