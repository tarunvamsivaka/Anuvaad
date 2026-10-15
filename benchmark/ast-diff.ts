import path from 'path';
import { createRequire } from 'module';
import { AstPreservationDetails, DiffNormalizationDetails } from './types';

// Safe Babel parser resolver for both monorepo workspace and CLI environments
let parseFn: (code: string, options?: any) => any;

try {
  const req = createRequire(path.resolve(__dirname, '../../frontend/package.json'));
  parseFn = req('@babel/parser').parse;
} catch {
  try {
    const req = createRequire(path.resolve(__dirname, '../frontend/package.json'));
    parseFn = req('@babel/parser').parse;
  } catch {
    // Fallback to standard require
    parseFn = require('@babel/parser').parse;
  }
}

/**
 * Safely parses JS/TS/JSX code into a Babel AST
 */
export function parseCodeToAst(code: string): any {
  return parseFn(code, {
    sourceType: 'module',
    plugins: [
      'jsx',
      'typescript',
      'classProperties',
      'classPrivateProperties',
      'classPrivateMethods',
    ],
  });
}

/**
 * Simple AST walker without external dependencies
 */
function walkAst(node: any, visitor: { enter?: (node: any, parent: any) => void }) {
  if (!node || typeof node !== 'object') return;

  function traverse(n: any, parent: any) {
    if (!n || typeof n !== 'object') return;
    if (visitor.enter) {
      visitor.enter(n, parent);
    }
    for (const key of Object.keys(n)) {
      if (key === 'parent' || key === 'tokens') continue;
      const child = n[key];
      if (Array.isArray(child)) {
        for (const item of child) {
          if (item && typeof item === 'object' && item.type) {
            traverse(item, n);
          }
        }
      } else if (child && typeof child === 'object' && child.type) {
        traverse(child, n);
      }
    }
  }

  traverse(node, null);
}

/**
 * Analyzes semantic AST preservation between original React class code
 * and transformed functional hook code.
 *
 * Evaluates:
 * 1. Hard gate: Valid AST syntax
 * 2. Invariants: No remaining ClassDeclaration, no dangling this.state
 * 3. Props fidelity: Original prop usages preserved in new parameter signature
 * 4. JSX fidelity: Return JSX tags preserved
 * 5. State fidelity: Original class state keys converted to useState hooks
 * 6. Exports fidelity: Default and named exports preserved
 */
export function validateAstPreservation(
  originalCode: string,
  transformedCode: string
): AstPreservationDetails {
  let origAst: any;
  let transAst: any;

  try {
    origAst = parseCodeToAst(originalCode);
  } catch {
    origAst = null;
  }

  try {
    transAst = parseCodeToAst(transformedCode);
  } catch {
    transAst = null;
  }

  if (!transAst) {
    return {
      validAst: false,
      noRemainingClass: false,
      noDanglingThis: false,
      propsScore: 0,
      jsxScore: 0,
      stateScore: 0,
      exportsScore: 0,
      overallScore: 0,
    };
  }

  // 1. Invariant Checks in transformed code
  let hasClassDeclaration = false;
  let hasDanglingThisState = false;

  walkAst(transAst, {
    enter(node) {
      if (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') {
        hasClassDeclaration = true;
      }
      if (
        node.type === 'MemberExpression' &&
        node.object &&
        node.object.type === 'ThisExpression' &&
        node.property &&
        (node.property.name === 'state' || node.property.name === 'setState')
      ) {
        hasDanglingThisState = true;
      }
    },
  });

  const noRemainingClass = !hasClassDeclaration;
  const noDanglingThis = !hasDanglingThisState;

  // 2. Extract original artifacts
  const origProps = new Set<string>();
  const origStateKeys = new Set<string>();
  const origJsxTags = new Set<string>();
  const origExports = new Set<string>();

  if (origAst) {
    walkAst(origAst, {
      enter(node) {
        // Find this.props.xxx
        if (
          node.type === 'MemberExpression' &&
          node.object &&
          node.object.type === 'MemberExpression' &&
          node.object.object &&
          node.object.object.type === 'ThisExpression' &&
          node.object.property &&
          node.object.property.name === 'props' &&
          node.property &&
          node.property.name
        ) {
          origProps.add(node.property.name);
        }
        // Find const { x, y } = this.props
        if (
          node.type === 'VariableDeclarator' &&
          node.init &&
          node.init.type === 'MemberExpression' &&
          node.init.object &&
          node.init.object.type === 'ThisExpression' &&
          node.init.property &&
          node.init.property.name === 'props' &&
          node.id &&
          node.id.type === 'ObjectPattern'
        ) {
          for (const prop of node.id.properties) {
            if (prop && prop.key && prop.key.name) {
              origProps.add(prop.key.name);
            }
          }
        }
        // Find state = { ... }
        if (
          node.type === 'ClassProperty' &&
          node.key &&
          node.key.name === 'state' &&
          node.value &&
          node.value.type === 'ObjectExpression'
        ) {
          for (const prop of node.value.properties) {
            if (prop && prop.key && prop.key.name) {
              origStateKeys.add(prop.key.name);
            }
          }
        }
        // Find this.state = { ... } in constructor
        if (
          node.type === 'AssignmentExpression' &&
          node.left &&
          node.left.type === 'MemberExpression' &&
          node.left.object &&
          node.left.object.type === 'ThisExpression' &&
          node.left.property &&
          node.left.property.name === 'state' &&
          node.right &&
          node.right.type === 'ObjectExpression'
        ) {
          for (const prop of node.right.properties) {
            if (prop && prop.key && prop.key.name) {
              origStateKeys.add(prop.key.name);
            }
          }
        }
        // Find JSX element tags
        if (node.type === 'JSXOpeningElement' && node.name) {
          if (node.name.type === 'JSXIdentifier') {
            origJsxTags.add(node.name.name);
          }
        }
        // Find Exports
        if (node.type === 'ExportNamedDeclaration' && node.declaration) {
          if (node.declaration.id && node.declaration.id.name) {
            origExports.add(node.declaration.id.name);
          }
        }
        if (node.type === 'ExportDefaultDeclaration') {
          origExports.add('default');
        }
      },
    });
  }

  // 3. Extract transformed artifacts
  const transProps = new Set<string>();
  const transStateKeys = new Set<string>();
  const transJsxTags = new Set<string>();
  const transExports = new Set<string>();

  walkAst(transAst, {
    enter(node) {
      // Find useState declarations: const [query, setQuery] = useState(...)
      if (
        node.type === 'VariableDeclarator' &&
        node.init &&
        node.init.type === 'CallExpression' &&
        node.init.callee &&
        (node.init.callee.name === 'useState' ||
          (node.init.callee.property && node.init.callee.property.name === 'useState')) &&
        node.id &&
        node.id.type === 'ArrayPattern' &&
        node.id.elements &&
        node.id.elements[0] &&
        node.id.elements[0].name
      ) {
        transStateKeys.add(node.id.elements[0].name);
      }
      // Find destructured props in function parameter: function Foo({ a, b }) or ({ a, b }) =>
      if (
        (node.type === 'FunctionDeclaration' || node.type === 'ArrowFunctionExpression') &&
        node.params &&
        node.params.length > 0
      ) {
        const firstParam = node.params[0];
        if (firstParam.type === 'ObjectPattern') {
          for (const p of firstParam.properties) {
            if (p && p.key && p.key.name) {
              transProps.add(p.key.name);
            }
          }
        } else if (firstParam.type === 'Identifier') {
          transProps.add(firstParam.name);
        }
      }
      // Also look for const { a, b } = props; inside functional body
      if (
        node.type === 'VariableDeclarator' &&
        node.init &&
        node.init.type === 'Identifier' &&
        node.init.name === 'props' &&
        node.id &&
        node.id.type === 'ObjectPattern'
      ) {
        for (const p of node.id.properties) {
          if (p && p.key && p.key.name) {
            transProps.add(p.key.name);
          }
        }
      }
      // Direct props.xxx usages
      if (
        node.type === 'MemberExpression' &&
        node.object &&
        node.object.type === 'Identifier' &&
        node.object.name === 'props' &&
        node.property &&
        node.property.name
      ) {
        transProps.add(node.property.name);
      }
      // Transformed JSX element tags
      if (node.type === 'JSXOpeningElement' && node.name) {
        if (node.name.type === 'JSXIdentifier') {
          transJsxTags.add(node.name.name);
        }
      }
      // Transformed Exports
      if (node.type === 'ExportNamedDeclaration' && node.declaration) {
        if (node.declaration.id && node.declaration.id.name) {
          transExports.add(node.declaration.id.name);
        } else if (node.declaration.declarations) {
          for (const d of node.declaration.declarations) {
            if (d.id && d.id.name) transExports.add(d.id.name);
          }
        }
      }
      if (node.type === 'ExportDefaultDeclaration') {
        transExports.add('default');
      }
    },
  });

  // Calculate scores
  // Props Score
  let propsScore = 100.0;
  if (origProps.size > 0) {
    let matched = 0;
    for (const p of origProps) {
      if (transProps.has(p)) matched++;
    }
    propsScore = Math.round((matched / origProps.size) * 1000) / 10;
  }

  // JSX Score
  let jsxScore = 100.0;
  if (origJsxTags.size > 0) {
    let matched = 0;
    for (const tag of origJsxTags) {
      if (transJsxTags.has(tag)) matched++;
    }
    jsxScore = Math.round((matched / origJsxTags.size) * 1000) / 10;
  }

  // State Score
  let stateScore = 100.0;
  if (origStateKeys.size > 0) {
    let matched = 0;
    for (const key of origStateKeys) {
      if (transStateKeys.has(key)) matched++;
    }
    stateScore = Math.round((matched / origStateKeys.size) * 1000) / 10;
  }

  // Exports Score
  let exportsScore = 100.0;
  if (origExports.size > 0) {
    let matched = 0;
    for (const exp of origExports) {
      if (transExports.has(exp)) matched++;
    }
    exportsScore = Math.round((matched / origExports.size) * 1000) / 10;
  }

  // Weighted calculation (30% props, 30% jsx, 20% state, 20% exports)
  let rawScore =
    0.30 * propsScore +
    0.30 * jsxScore +
    0.20 * stateScore +
    0.20 * exportsScore;

  // Penalty if invariants failed
  if (!noRemainingClass) rawScore *= 0.5;
  if (!noDanglingThis) rawScore *= 0.7;

  const overallScore = Math.max(0, Math.min(100, Math.round(rawScore * 10) / 10));

  return {
    validAst: true,
    noRemainingClass,
    noDanglingThis,
    propsScore,
    jsxScore,
    stateScore,
    exportsScore,
    overallScore,
  };
}

/**
 * Calculates normalized diff score based on expected boilerplate reduction.
 *
 * Boilerplate reduction ratio delta = (|added| + |deleted|) / origTokens.
 * Expected delta* ~= 0.35 (35% churn for constructor/lifecycle/class wrapping).
 */
export function calculateDiffNormalization(
  originalCode: string,
  transformedCode: string
): DiffNormalizationDetails {
  // Tokenize roughly by words / punctuation
  const tokenRegex = /[a-zA-Z_$][a-zA-Z0-9_$]*|[0-9]+|===|!==|==|!=|=>|<=|>=|&&|\|\||[{}()[\].,;:?]/g;
  const origTokens = (originalCode.match(tokenRegex) || []).length;
  const transTokens = (transformedCode.match(tokenRegex) || []).length;

  if (origTokens === 0) {
    return {
      originalTokens: 0,
      transformedTokens: 0,
      tokenChurnRatio: 0,
      diffScore: 100.0,
    };
  }

  // Churn estimation
  const tokenDelta = Math.abs(origTokens - transTokens);
  const tokenChurnRatio = Math.round((tokenDelta / origTokens) * 1000) / 1000;

  // Expected optimal boilerplate reduction churn ratio is ~0.35 (35%)
  const optimalChurn = 0.35;
  const maxTolerance = 1.0;
  const deviation = Math.abs(tokenChurnRatio - optimalChurn);

  // Clamped formula: 100 * (1.0 - deviation / maxTolerance)
  let diffScore = Math.round(100.0 * (1.0 - deviation / maxTolerance) * 10) / 10;
  diffScore = Math.max(0, Math.min(100, diffScore));

  return {
    originalTokens: origTokens,
    transformedTokens: transTokens,
    tokenChurnRatio,
    diffScore,
  };
}
