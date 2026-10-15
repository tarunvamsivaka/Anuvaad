import { parse } from '@babel/parser';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates that the transformed JavaScript/TypeScript code parses with zero syntax errors.
 */
export function validateTransformedCode(code: string): ValidationResult {
  try {
    parse(code, {
      sourceType: 'module',
      plugins: [
        'jsx',
        'typescript',
      ],
    });
    return {
      isValid: true,
      errors: [],
    };
  } catch (err: any) {
    return {
      isValid: false,
      errors: [err.message || 'AST validation syntax error'],
    };
  }
}
