import './vscode-mock';
import * as assert from 'assert';
import * as vscode from 'vscode';
import { activate, formatCodePayload, parseTranslationResponse } from '../extension';

describe('Anuvaad VSCode Extension Unit Test Suite', () => {

  describe('Extension Activation & Commands Registration', () => {
    it('registers extension commands upon activation', async () => {
      const subscriptions: vscode.Disposable[] = [];
      const mockSecrets: Record<string, string> = {};

      const mockContext = {
        subscriptions,
        secrets: {
          get: async (key: string) => mockSecrets[key],
          store: async (key: string, val: string) => { mockSecrets[key] = val; },
          delete: async (key: string) => { delete mockSecrets[key]; },
          onDidChange: new vscode.EventEmitter<vscode.SecretStorageChangeEvent>().event
        },
        extensionPath: '/mock/path'
      } as unknown as vscode.ExtensionContext;

      await activate(mockContext);

      // Verify disposables registered in subscriptions (setApiKey, translateInline, hoverProvider)
      assert.strictEqual(mockContext.subscriptions.length, 3, 'Expected 3 disposables registered');
    });

    it('exposes registered commands in command registry', async () => {
      const commands = await vscode.commands.getCommands(true);
      assert.ok(commands.includes('anuvaad.translateInline'), 'Command anuvaad.translateInline must be present');
      assert.ok(commands.includes('anuvaad.setApiKey'), 'Command anuvaad.setApiKey must be present');
    });
  });

  describe('CodePayload Request Body Structure', () => {
    it('constructs correct payload matching FastAPI backend CodePayload contract', () => {
      const code = 'def hello(): pass';
      const language = 'python';

      const payload = formatCodePayload(code, language);

      // Must have raw_code and language
      assert.strictEqual(payload.raw_code, code, 'payload.raw_code must equal input code');
      assert.strictEqual(payload.language, language, 'payload.language must equal input language');

      // Verify JSON serialization contains exact keys expected by FastAPI backend
      const jsonStr = JSON.stringify(payload);
      const parsedJson = JSON.parse(jsonStr);
      assert.ok('raw_code' in parsedJson, 'JSON payload must contain raw_code key');
      assert.ok('language' in parsedJson, 'JSON payload must contain language key');
      assert.strictEqual(Object.keys(parsedJson).length, 2, 'Payload must contain exactly 2 keys');
    });
  });

  describe('Translation Response Parsing & Array Joining', () => {
    it('joins array of translation blocks with newlines', () => {
      const inputData = [
        { english_translation: 'Imports fast API library.' },
        { english_translation: 'Defines root GET endpoint returning greeting.' }
      ];

      const result = parseTranslationResponse(inputData);
      assert.strictEqual(result, 'Imports fast API library.\nDefines root GET endpoint returning greeting.');
    });

    it('parses single object translation response', () => {
      const inputData = { english_translation: 'Single line translation.' };

      const result = parseTranslationResponse(inputData);
      assert.strictEqual(result, 'Single line translation.');
    });

    it('returns empty string when given empty response', () => {
      assert.strictEqual(parseTranslationResponse([]), '');
      assert.strictEqual(parseTranslationResponse(null), '');
      assert.strictEqual(parseTranslationResponse({}), '');
    });
  });

});
