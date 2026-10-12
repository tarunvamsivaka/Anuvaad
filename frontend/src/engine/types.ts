export interface TransformOptions {
  useCallbackForMethods?: boolean;
  functionStyle?: 'arrow' | 'declaration';
  typescript?: boolean;
}

export interface TransformChange {
  type: 'state' | 'lifecycle' | 'method' | 'props' | 'render' | 'signature';
  description: string;
  original?: string;
  transformed?: string;
}

export interface TransformResult {
  code: string;
  success: boolean;
  changes: TransformChange[];
  warnings: string[];
  stats: {
    stateVariables: number;
    effects: number;
    methodsConverted: number;
    timeMs: number;
  };
  errors?: string[];
}
