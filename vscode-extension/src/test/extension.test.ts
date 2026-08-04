import './vscode-mock';
import * as assert from 'assert';
import * as vscode from 'vscode';
import {
  activate,
  formatCodePayload,
  parseTranslationResponse,
  getErrorMessageFromResponse,
  formatCommentText
} from '../extension';

describe('Anuvaad VSCode Extension Unit Test Suite', () => {

  describe('Extension Activation & Commands Registration (EXT-01)', () => {
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

  describe('SecretStorage Migration Scope (EXT-06)', () => {
    it('migrates legacy apiKey from config and clears Global and Workspace targets', async () => {
      const mockSecrets: Record<string, string> = {};
      const updatedTargets: number[] = [];

      const mockContext = {
        subscriptions: [],
        secrets: {
          get: async (key: string) => mockSecrets[key],
          store: async (key: string, val: string) => { mockSecrets[key] = val; },
          delete: async (key: string) => { delete mockSecrets[key]; },
          onDidChange: new vscode.EventEmitter<vscode.SecretStorageChangeEvent>().event
        },
        extensionPath: '/mock/path'
      } as unknown as vscode.ExtensionContext;

      // Mock workspace configuration with a legacy API key
      const origGetConfig = vscode.workspace.getConfiguration;
      vscode.workspace.getConfiguration = (_section?: string) => ({
        get: (key: string) => (key === 'apiKey' ? 'legacy-secret-key-123' : undefined),
        update: async (_key: string, _value: any, target?: number) => {
          if (target !== undefined) {
            updatedTargets.push(target);
          }
        }
      } as any);

      try {
        await activate(mockContext);
        assert.strictEqual(mockSecrets['anuvaad.apiKey'], 'legacy-secret-key-123', 'Secret key should be migrated');
        assert.ok(updatedTargets.includes(vscode.ConfigurationTarget.Global), 'Global target updated');
        assert.ok(updatedTargets.includes(vscode.ConfigurationTarget.Workspace), 'Workspace target updated');
      } finally {
        vscode.workspace.getConfiguration = origGetConfig;
      }
    });
  });

  describe('CodePayload Request Body Structure', () => {
    it('constructs correct payload matching FastAPI backend CodePayload contract', () => {
      const code = 'def hello(): pass';
      const language = 'python';

      const payload = formatCodePayload(code, language);

      assert.strictEqual(payload.raw_code, code, 'payload.raw_code must equal input code');
      assert.strictEqual(payload.language, language, 'payload.language must equal input language');

      const jsonStr = JSON.stringify(payload);
      const parsedJson = JSON.parse(jsonStr);
      assert.ok('raw_code' in parsedJson, 'JSON payload must contain raw_code key');
      assert.ok('language' in parsedJson, 'JSON payload must contain language key');
      assert.strictEqual(Object.keys(parsedJson).length, 2, 'Payload must contain exactly 2 keys');
    });
  });

  describe('Translation Response Parsing & Edge Case Handling (EXT-05)', () => {
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

    it('handles unexpected/malformed response shapes gracefully without returning undefined or crashing', () => {
      assert.strictEqual(parseTranslationResponse([]), '');
      assert.strictEqual(parseTranslationResponse(null), '');
      assert.strictEqual(parseTranslationResponse(undefined), '');
      assert.strictEqual(parseTranslationResponse({}), '');
      assert.strictEqual(parseTranslationResponse({ detail: 'Error message' }), '');
      assert.strictEqual(parseTranslationResponse([{ unexpected: 123 }]), '');
    });

    it('supports alternative translation field names', () => {
      const inputData = { translation: 'Alternative translation format.' };
      const result = parseTranslationResponse(inputData);
      assert.strictEqual(result, 'Alternative translation format.');
    });
  });

  describe('FastAPI HTTP Error Detail Extraction (EXT-04)', () => {
    it('surfaces FastAPI string detail error message', async () => {
      const mockResponse = {
        status: 401,
        json: async () => ({ detail: 'Invalid API key provided' })
      };

      const msg = await getErrorMessageFromResponse(mockResponse);
      assert.strictEqual(msg, 'API Error 401: Invalid API key provided');
    });

    it('surfaces FastAPI object detail error message as JSON', async () => {
      const mockResponse = {
        status: 422,
        json: async () => ({ detail: [{ loc: ['body', 'raw_code'], msg: 'field required' }] })
      };

      const msg = await getErrorMessageFromResponse(mockResponse);
      assert.strictEqual(msg, 'API Error 422: [{"loc":["body","raw_code"],"msg":"field required"}]');
    });

    it('falls back to generic status code if JSON parsing fails', async () => {
      const mockResponse = {
        status: 500,
        json: async () => { throw new Error('HTML response body'); }
      };

      const msg = await getErrorMessageFromResponse(mockResponse);
      assert.strictEqual(msg, 'API Error: 500');
    });
  });

  describe('Comment Prefix Generator Syntax (EXT-07)', () => {
    it('generates correct comment prefix for Python/Ruby/YAML', () => {
      const result = formatCommentText('Line 1\nLine 2', 'python');
      assert.strictEqual(result, '# Line 1\n# Line 2\n');
    });

    it('generates correct comment prefix for SQL/Lua', () => {
      const resultSql = formatCommentText('SELECT * FROM users;', 'sql');
      assert.strictEqual(resultSql, '-- SELECT * FROM users;\n');

      const resultLua = formatCommentText('local x = 10', 'lua');
      assert.strictEqual(resultLua, '-- local x = 10\n');
    });

    it('generates correct comment prefix for Lisp/Clojure', () => {
      const result = formatCommentText('(def x 10)', 'lisp');
      assert.strictEqual(result, ';; (def x 10)\n');
    });

    it('formats single-line HTML comments with enclosing tags', () => {
      const result = formatCommentText('Paragraph text explanation', 'html');
      assert.strictEqual(result, '<!-- Paragraph text explanation -->\n');
    });

    it('formats multi-line HTML comments with enclosing block tags', () => {
      const result = formatCommentText('Line 1 explanation\nLine 2 explanation', 'html');
      assert.strictEqual(result, '<!--\nLine 1 explanation\nLine 2 explanation\n-->\n');
    });
  });

});
