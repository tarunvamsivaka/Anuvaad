import * as vscode from 'vscode';

export async function activate(context: vscode.ExtensionContext) {
  // Migration path: if apiKey exists in settings, move it to secrets and remove it from settings
  const config = vscode.workspace.getConfiguration('anuvaad');
  const legacyApiKey = config.get<string>('apiKey');
  if (legacyApiKey) {
      await context.secrets.store('anuvaad.apiKey', legacyApiKey);
      await config.update('apiKey', undefined, vscode.ConfigurationTarget.Global);
  }

  // Register command to set API Key
  let setApiKeyDisposable = vscode.commands.registerCommand('anuvaad.setApiKey', async () => {
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
  let translateDisposable = vscode.commands.registerCommand('anuvaad.translateInline', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage('No active editor found');
      return;
    }

    const selection = editor.selection;
    const text = editor.document.getText(selection);

    if (!text) {
      vscode.window.showInformationMessage('Please select some code to translate.');
      return;
    }

    // Get configuration
    const config = vscode.workspace.getConfiguration('anuvaad');
    const apiUrl = config.get<string>('apiUrl', 'http://localhost:8000');
    const apiKey = await context.secrets.get('anuvaad.apiKey');

    if (!apiKey) {
      vscode.window.showErrorMessage('Anuvaad API Key is not set. Use "Anuvaad: Set API Key" command.');
      return;
    }

    // Show progress
    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: "Translating with Anuvaad...",
      cancellable: false
    }, async (progress) => {
      try {
        const response = await fetch(`${apiUrl}/api/v1/code-to-english/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey
          },
          body: JSON.stringify({
            code: text,
            source_language: editor.document.languageId
          })
        });

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const data: any = await response.json();
        const translation = data.english_translation;

        // Insert the translation above the selection as a comment
        editor.edit(editBuilder => {
          // Detect language to use proper comment syntax
          const langId = editor.document.languageId;
          let commentPrefix = '// ';
          if (['python', 'ruby', 'yaml', 'shellscript'].includes(langId)) {
            commentPrefix = '# ';
          } else if (['html', 'xml'].includes(langId)) {
            commentPrefix = '<!-- ';
          }

          const translationLines = translation.split('\n').map((line: string) => `${commentPrefix}${line}`);
          if (['html', 'xml'].includes(langId)) {
            translationLines.push('-->');
          }

          const insertText = translationLines.join('\n') + '\n';
          editBuilder.insert(new vscode.Position(selection.start.line, 0), insertText);
        });

      } catch (error: any) {
        vscode.window.showErrorMessage(`Anuvaad Translation failed: ${error.message}`);
      }
    });
  });

  // 2. Explain Hover Provider
  let hoverTimeout: NodeJS.Timeout | undefined;
  
  let hoverProvider = vscode.languages.registerHoverProvider('*', {
    async provideHover(document, position, token) {
      const config = vscode.workspace.getConfiguration('anuvaad');
      if (!config.get<boolean>('enableHover', false)) {
        return null;
      }
      
      const apiKey = await context.secrets.get('anuvaad.apiKey');
      if (!apiKey) return null;
      
      const apiUrl = config.get<string>('apiUrl', 'http://localhost:8000');

      // Get current line or block
      const range = document.getWordRangeAtPosition(position);
      if (!range) return null;
      
      // We'll translate the whole line for better context instead of just a word
      const lineText = document.lineAt(position.line).text.trim();
      if (!lineText || lineText.length < 5) return null;
      
      return new Promise((resolve) => {
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
        }
        
        hoverTimeout = setTimeout(async () => {
            if (token.isCancellationRequested) {
                return resolve(null);
            }
            
            try {
              const response = await fetch(`${apiUrl}/api/v1/code-to-english/sync`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-API-Key': apiKey
                },
                body: JSON.stringify({
                  code: lineText,
                  source_language: document.languageId
                })
              });

              if (!response.ok) return resolve(null);

              const data: any = await response.json();
              
              const markdown = new vscode.MarkdownString();
              markdown.appendMarkdown(`**Anuvaad Explanation**\n\n${data.english_translation}`);
              
              resolve(new vscode.Hover(markdown));
            } catch (e) {
              resolve(null);
            }
        }, 800);
      });
    }
  });

  context.subscriptions.push(setApiKeyDisposable, translateDisposable, hoverProvider);
}

export function deactivate() {}

