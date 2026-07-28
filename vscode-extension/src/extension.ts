import * as vscode from 'vscode';

export interface CodePayload {
  raw_code: string;
  language: string;
}

export function formatCodePayload(rawCode: string, language: string): CodePayload {
  return {
    raw_code: rawCode,
    language
  };
}

export function parseTranslationResponse(data: any): string {
  if (!data) {
    return '';
  }

  if (Array.isArray(data)) {
    const translations = data
      .map((b: any) => {
        if (typeof b === 'string') {
          return b.trim();
        }
        if (b && typeof b === 'object') {
          const val = b.english_translation || b.translation;
          return typeof val === 'string' ? val.trim() : '';
        }
        return '';
      })
      .filter((t: string) => t.length > 0);

    return translations.join('\n');
  }

  if (typeof data === 'object') {
    const val = data.english_translation || data.translation;
    if (typeof val === 'string') {
      return val.trim();
    }
  }

  if (typeof data === 'string') {
    return data.trim();
  }

  return '';
}

export async function getErrorMessageFromResponse(response: { status: number; json: () => Promise<any> }): Promise<string> {
  let detailMsg = '';
  try {
    const errorData = await response.json();
    if (errorData) {
      if (typeof errorData.detail === 'string') {
        detailMsg = errorData.detail;
      } else if (typeof errorData.detail === 'object') {
        detailMsg = JSON.stringify(errorData.detail);
      } else if (typeof errorData.message === 'string') {
        detailMsg = errorData.message;
      }
    }
  } catch {
    // Ignore JSON parsing failure for non-JSON error responses
  }
  return detailMsg ? `API Error ${response.status}: ${detailMsg}` : `API Error: ${response.status}`;
}

export function formatCommentText(translation: string, langId: string): string {
  const normalizedLang = langId ? langId.toLowerCase() : '';

  if (['html', 'xml', 'svg', 'xhtml', 'handlebars'].includes(normalizedLang)) {
    const lines = translation.split('\n');
    if (lines.length === 1) {
      return `<!-- ${translation.trim()} -->\n`;
    }
    return `<!--\n${translation}\n-->\n`;
  }

  let commentPrefix = '// ';
  if (['python', 'ruby', 'yaml', 'shellscript', 'dockerfile', 'r', 'perl', 'bash', 'sh'].includes(normalizedLang)) {
    commentPrefix = '# ';
  } else if (['sql', 'lua', 'haskell', 'ada'].includes(normalizedLang)) {
    commentPrefix = '-- ';
  } else if (['lisp', 'clojure', 'scheme'].includes(normalizedLang)) {
    commentPrefix = ';; ';
  }

  const lines = translation.split('\n');
  return lines.map((line) => `${commentPrefix}${line}`).join('\n') + '\n';
}

export async function activate(context: vscode.ExtensionContext) {
  // EXT-06: Migration path - clear both Global and Workspace configuration targets if legacy apiKey exists
  const config = vscode.workspace.getConfiguration('anuvaad');
  const legacyApiKey = config.get<string>('apiKey');
  if (legacyApiKey) {
    await context.secrets.store('anuvaad.apiKey', legacyApiKey);
    const globalTarget = vscode.ConfigurationTarget ? vscode.ConfigurationTarget.Global : 1;
    const workspaceTarget = vscode.ConfigurationTarget ? vscode.ConfigurationTarget.Workspace : 2;
    const workspaceFolderTarget = vscode.ConfigurationTarget ? vscode.ConfigurationTarget.WorkspaceFolder : 3;

    await config.update('apiKey', undefined, globalTarget);
    try {
      await config.update('apiKey', undefined, workspaceTarget);
    } catch {
      // ConfigurationTarget.Workspace may not be supported in some environments
    }
    try {
      await config.update('apiKey', undefined, workspaceFolderTarget);
    } catch {
      // ConfigurationTarget.WorkspaceFolder may not be supported in some environments
    }
  }

  // EXT-01: Register command to set API Key
  const setApiKeyDisposable = vscode.commands.registerCommand('anuvaad.setApiKey', async () => {
    const apiKey = await vscode.window.showInputBox({
      prompt: 'Enter your Anuvaad API Key',
      password: true
    });
    if (apiKey) {
      await context.secrets.store('anuvaad.apiKey', apiKey);
      vscode.window.showInformationMessage('Anuvaad API Key saved securely.');
    }
  });

  // 1. Translate Inline Command
  const translateDisposable = vscode.commands.registerCommand('anuvaad.translateInline', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage('No active editor found');
      return;
    }

    const selection = editor.selection;
    const text = editor.document.getText(selection);

    if (!text || !text.trim()) {
      return;
    }

    // Get configuration
    const currentConfig = vscode.workspace.getConfiguration('anuvaad');
    const apiUrl = currentConfig.get<string>('apiUrl', 'http://localhost:8000');
    const apiKey = await context.secrets.get('anuvaad.apiKey');

    if (!apiKey) {
      vscode.window.showErrorMessage('Anuvaad API Key is not set. Use "Anuvaad: Set API Key" command.');
      return;
    }

    // Show progress
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Translating with Anuvaad...',
      cancellable: false
    }, async () => {
      try {
        const payload = formatCodePayload(text, editor.document.languageId);
        const response = await fetch(`${apiUrl}/api/v1/code-to-english/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey
          },
          body: JSON.stringify(payload)
        });

        // EXT-04: Surface FastAPI detail error message on non-200 responses
        if (!response.ok) {
          const errorMessage = await getErrorMessageFromResponse(response);
          throw new Error(errorMessage);
        }

        const data: any = await response.json();
        // EXT-05: Handle empty or unexpected translation response shapes
        const translation = parseTranslationResponse(data);

        if (!translation || !translation.trim()) {
          vscode.window.showErrorMessage('Anuvaad Translation failed: Received empty translation from server.');
          return;
        }

        // EXT-07: Insert the translation above the selection using proper comment syntax
        editor.edit((editBuilder) => {
          const insertText = formatCommentText(translation, editor.document.languageId);
          editBuilder.insert(new vscode.Position(selection.start.line, 0), insertText);
        });

      } catch (error: any) {
        vscode.window.showErrorMessage(`Anuvaad Translation failed: ${error.message}`);
      }
    });
  });

  // 2. Explain Hover Provider
  // EXT-02: Eliminate global hoverTimeout race conditions via per-request signal/cancellation pattern
  const hoverProvider = vscode.languages.registerHoverProvider('*', {
    async provideHover(document, position, token) {
      if (token.isCancellationRequested) {
        return null;
      }

      const currentConfig = vscode.workspace.getConfiguration('anuvaad');
      // EXT-03: Fall back to true matching package.json default
      if (!currentConfig.get<boolean>('enableHover', true)) {
        return null;
      }

      const apiKey = await context.secrets.get('anuvaad.apiKey');
      if (!apiKey) {
        return null;
      }

      const apiUrl = currentConfig.get<string>('apiUrl', 'http://localhost:8000');

      // Get current line or block
      const range = document.getWordRangeAtPosition(position);
      if (!range) {
        return null;
      }

      // Translate the whole line for better context instead of just a word
      const lineText = document.lineAt(position.line).text.trim();
      if (!lineText || lineText.length < 5) {
        return null;
      }

      // EXT-02: Debounce and handle cancellation per request
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 800);
        token.onCancellationRequested(() => {
          clearTimeout(timer);
          resolve();
        });
      });

      if (token.isCancellationRequested) {
        return null;
      }

      try {
        const payload = formatCodePayload(lineText, document.languageId);
        const response = await fetch(`${apiUrl}/api/v1/code-to-english/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey
          },
          body: JSON.stringify(payload)
        });

        // EXT-08: Re-check token.isCancellationRequested after async fetch completes
        if (token.isCancellationRequested) {
          return null;
        }

        if (!response.ok) {
          return null;
        }

        const data: any = await response.json();
        // EXT-05: Unexpected API response shape handled gracefully
        const explanation = parseTranslationResponse(data);

        if (!explanation || !explanation.trim() || token.isCancellationRequested) {
          return null;
        }

        const markdown = new vscode.MarkdownString();
        markdown.appendMarkdown(`**Anuvaad Explanation**\n\n${explanation}`);

        return new vscode.Hover(markdown);
      } catch {
        return null;
      }
    }
  });

  context.subscriptions.push(setApiKeyDisposable, translateDisposable, hoverProvider);
}

export function deactivate() {}
