import * as vscode from 'vscode';
import fetch from 'node-fetch';

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand('anuvaad.translateInline', async () => {
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
    const apiKey = config.get<string>('apiKey', '');

    if (!apiKey) {
      vscode.window.showErrorMessage('Anuvaad API Key is not set in settings.');
      return;
    }

    // Show progress
    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: "Translating with Anuvaad...",
      cancellable: false
    }, async (progress) => {
      try {
        const response = await fetch(`${apiUrl}/api/translate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            prompt: text,
            model_name: "default",
            mode: "code-to-english",
            source_language: "auto",
            target_language: "english"
          })
        });

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const data: any = await response.json();
        const translation = data.translation;

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

  context.subscriptions.push(disposable);
}

export function deactivate() {}
