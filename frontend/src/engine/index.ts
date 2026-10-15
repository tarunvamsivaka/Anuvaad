import { transformReactClassToHooks } from './rules/classToHooks';
import { validateTransformedCode } from './validator';
import { TransformOptions, TransformResult } from './types';

export * from './types';
export * from './validator';
export * from './dispatcher';
export { transformReactClassToHooks };

/**
 * Main execution facade: transforms code and verifies AST validity in-memory
 */
export function modernizeReactCode(
  sourceCode: string,
  options: TransformOptions = {}
): TransformResult {
  const result = transformReactClassToHooks(sourceCode, options);

  if (result.success) {
    const validation = validateTransformedCode(result.code);
    if (!validation.isValid) {
      return {
        ...result,
        success: false,
        syntaxValid: false,
        errors: [...(result.errors || []), ...validation.errors],
      };
    }
    return {
      ...result,
      syntaxValid: true,
    };
  }

  return {
    ...result,
    syntaxValid: false,
  };
}
