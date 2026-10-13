export interface TransformOptions {
  componentName?: string;
  removeDeadMethods?: boolean;
  arrowMethods?: boolean;
  extractPropsInterface?: boolean;
  useCallbackForHandlers?: boolean;
  useCallbackForMethods?: boolean;
  functionStyle?: 'arrow' | 'declaration';
  typescript?: boolean;
}

export interface TransformChange {
  type:
    | 'state'
    | 'lifecycle'
    | 'method'
    | 'props'
    | 'render'
    | 'signature'
    | 'ref'
    | 'context'
    | 'type'
    | 'syntax'
    | 'effect';
  description: string;
  original?: string;
  transformed?: string;
  from?: string;
  to?: string;
}

export interface TransformResult {
  code: string;
  success: boolean;
  syntaxValid: boolean;
  changes: TransformChange[];
  warnings: string[];
  stats: {
    stateVariables: number;
    stateVarsCount: number;
    effects: number;
    effectsCount: number;
    refsCount: number;
    methodsConverted: number;
    timeMs: number;
  };
  errors?: string[];
}
