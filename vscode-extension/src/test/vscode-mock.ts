import Module from 'module';

export const mockVscode = {
  commands: {
    registerCommand: (command: string, callback: (...args: any[]) => any) => {
      return { dispose: () => {} };
    },
    getCommands: async (_filterInternal?: boolean) => {
      return ['anuvaad.translateInline', 'anuvaad.setApiKey'];
    }
  },
  workspace: {
    getConfiguration: (_section?: string) => ({
      get: (_key: string, defaultValue?: any) => defaultValue,
      update: async () => {}
    }),
    ConfigurationTarget: {
      Global: 1
    }
  },
  window: {
    showInformationMessage: async () => {},
    showErrorMessage: async () => {},
    showInputBox: async () => {},
    withProgress: async (_options: any, task: any) => {
      return task({ report: () => {} });
    },
    activeTextEditor: undefined
  },
  languages: {
    registerHoverProvider: () => ({ dispose: () => {} })
  },
  Position: class Position {
    constructor(public line: number, public character: number) {}
  },
  MarkdownString: class MarkdownString {
    public value = '';
    appendMarkdown(val: string) { this.value += val; return this; }
  },
  Hover: class Hover {
    constructor(public contents: any, public range?: any) {}
  },
  EventEmitter: class EventEmitter {
    event = () => {};
    fire() {}
  },
  ProgressLocation: {
    Notification: 15
  }
};

// Override Module._load to intercept require('vscode')
const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === 'vscode') {
    return mockVscode;
  }
  return originalLoad.apply(this, arguments);
};
