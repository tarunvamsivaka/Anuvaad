import * as t from '@babel/types';
import { TransformChange } from '../types';

export interface LifecycleHooksResult {
  hookStatements: t.Statement[];
  neededHooks: Set<string>;
  changes: TransformChange[];
  warnings: string[];
  memoComparator?: t.FunctionDeclaration;
  hasErrorBoundary: boolean;
  derivedStateKeys: Set<string>;
}

/**
 * Extracts and converts lifecycle methods to hooks (Rules 11-18)
 */
export function processLifecycleMethods(
  classBodyNodes: t.ClassBody['body'],
  componentName: string
): LifecycleHooksResult {
  const hookStatements: t.Statement[] = [];
  const neededHooks = new Set<string>();
  const changes: TransformChange[] = [];
  const warnings: string[] = [];
  const derivedStateKeys = new Set<string>();
  let memoComparator: t.FunctionDeclaration | undefined;
  let hasErrorBoundary = false;

  const methods = new Map<string, any>();

  classBodyNodes.forEach((member) => {
    if (t.isClassMethod(member) && t.isIdentifier(member.key)) {
      methods.set(member.key.name, member);
    }
  });

  const mountMethod = methods.get('componentDidMount');
  const unmountMethod = methods.get('componentWillUnmount');
  const updateMethod = methods.get('componentDidUpdate');
  const derivedStateMethod = methods.get('getDerivedStateFromProps');
  const snapshotMethod = methods.get('getSnapshotBeforeUpdate');
  const shouldUpdateMethod = methods.get('shouldComponentUpdate');
  const catchMethod = methods.get('componentDidCatch');
  const catchErrorMethod = methods.get('getDerivedStateFromError');

  // Rule 18: componentDidCatch Error Boundary detection
  if (catchMethod || catchErrorMethod) {
    hasErrorBoundary = true;
    warnings.push(
      `componentDidCatch / Error Boundary detected in '${componentName}'. Error Boundaries must remain Class Components in React 19.`
    );
    changes.push({
      type: 'lifecycle',
      description: `Detected Error Boundary in '${componentName}'; added React 19 diagnostic notice`,
    });
  }

  // Rule 15: getDerivedStateFromProps (static) inlining
  if (derivedStateMethod) {
    const mapStateMember = (n: any): any => {
      if (!n || typeof n !== 'object') return n;
      if (
        t.isMemberExpression(n) &&
        t.isIdentifier(n.object, { name: 'state' }) &&
        t.isIdentifier(n.property)
      ) {
        return t.identifier(n.property.name);
      }
      for (const k of Object.keys(n)) {
        if (k === 'parent' || k === 'leadingComments' || k === 'trailingComments') continue;
        if (Array.isArray(n[k])) {
          n[k] = n[k].map(mapStateMember);
        } else if (typeof n[k] === 'object' && n[k] !== null) {
          n[k] = mapStateMember(n[k]);
        }
      }
      return n;
    };

    derivedStateMethod.body.body.forEach((stmt: any) => {
      if (t.isReturnStatement(stmt)) {
        if (stmt.argument && t.isObjectExpression(stmt.argument)) {
          stmt.argument.properties.forEach((prop: any) => {
            if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
              const keyName = prop.key.name;
              derivedStateKeys.add(keyName);
              hookStatements.push(
                t.variableDeclaration('const', [
                  t.variableDeclarator(t.identifier(keyName), prop.value as t.Expression),
                ])
              );
            }
          });
        }
        // Do not inline non-object returns (e.g. return null;)
        return;
      }

      if (t.isIfStatement(stmt)) {
        const clonedStmt = t.cloneNode(stmt);
        clonedStmt.test = mapStateMember(clonedStmt.test);

        const convertReturnInBlock = (block: any) => {
          if (!block) return block;
          if (t.isBlockStatement(block)) {
            const newBody: t.Statement[] = [];
            block.body.forEach((s) => {
              if (t.isReturnStatement(s)) {
                if (s.argument && t.isObjectExpression(s.argument)) {
                  s.argument.properties.forEach((p: any) => {
                    if (t.isObjectProperty(p) && t.isIdentifier(p.key)) {
                      const key = p.key.name;
                      const setter = `set${key.charAt(0).toUpperCase()}${key.slice(1)}`;
                      newBody.push(
                        t.expressionStatement(t.callExpression(t.identifier(setter), [p.value as t.Expression]))
                      );
                    }
                  });
                }
              } else {
                newBody.push(mapStateMember(s));
              }
            });
            block.body = newBody;
          } else if (t.isReturnStatement(block)) {
            if (block.argument && t.isObjectExpression(block.argument)) {
              const setterCalls: t.Statement[] = [];
              block.argument.properties.forEach((p: any) => {
                if (t.isObjectProperty(p) && t.isIdentifier(p.key)) {
                  const key = p.key.name;
                  const setter = `set${key.charAt(0).toUpperCase()}${key.slice(1)}`;
                  setterCalls.push(
                    t.expressionStatement(t.callExpression(t.identifier(setter), [p.value as t.Expression]))
                  );
                }
              });
              return t.blockStatement(setterCalls);
            }
          }
          return block;
        };

        clonedStmt.consequent = convertReturnInBlock(clonedStmt.consequent);
        if (clonedStmt.alternate) {
          clonedStmt.alternate = convertReturnInBlock(clonedStmt.alternate);
        }
        hookStatements.push(clonedStmt);
        return;
      }

      hookStatements.push(mapStateMember(t.cloneNode(stmt)));
    });
    changes.push({
      type: 'lifecycle',
      description: 'Inlined static getDerivedStateFromProps into render-time calculations',
    });
  }

  // Rule 16: getSnapshotBeforeUpdate to useLayoutEffect
  if (snapshotMethod) {
    neededHooks.add('useRef');
    neededHooks.add('useLayoutEffect');

    // Declare const snapshotRef = useRef(null);
    hookStatements.push(
      t.variableDeclaration('const', [
        t.variableDeclarator(
          t.identifier('snapshotRef'),
          t.callExpression(t.identifier('useRef'), [t.nullLiteral()])
        ),
      ])
    );

    // useLayoutEffect(() => { snapshotRef.current = <return expression>; });
    let snapshotExpr: t.Expression = t.nullLiteral();
    for (const s of snapshotMethod.body.body) {
      if (t.isReturnStatement(s) && s.argument) {
        snapshotExpr = s.argument;
        break;
      }
    }

    const assignStmt = t.expressionStatement(
      t.assignmentExpression(
        '=',
        t.memberExpression(t.identifier('snapshotRef'), t.identifier('current')),
        snapshotExpr
      )
    );

    hookStatements.push(
      t.expressionStatement(
        t.callExpression(t.identifier('useLayoutEffect'), [
          t.arrowFunctionExpression([], t.blockStatement([assignStmt])),
        ])
      )
    );

    changes.push({
      type: 'lifecycle',
      description: 'Converted getSnapshotBeforeUpdate to useLayoutEffect with snapshotRef',
    });
  }

  // Rules 11, 12, 13: Mount + Unmount (isolated or unified)
  if (mountMethod && unmountMethod) {
    // Rule 13: Mount + Unmount Unification
    neededHooks.add('useEffect');
    const effectStmts: t.Statement[] = [];

    if (mountMethod.async) {
      const asyncIIFE = t.expressionStatement(
        t.callExpression(
          t.arrowFunctionExpression([], mountMethod.body, true),
          []
        )
      );
      effectStmts.push(asyncIIFE);
    } else {
      effectStmts.push(...mountMethod.body.body);
    }

    // Cleanup return
    const cleanupReturn = t.returnStatement(
      t.arrowFunctionExpression([], unmountMethod.body)
    );
    effectStmts.push(cleanupReturn);

    hookStatements.push(
      t.expressionStatement(
        t.callExpression(t.identifier('useEffect'), [
          t.arrowFunctionExpression([], t.blockStatement(effectStmts)),
          t.arrayExpression([]),
        ])
      )
    );

    changes.push({
      type: 'lifecycle',
      description: 'Unified componentDidMount and componentWillUnmount into single useEffect with [] deps',
    });
  } else if (mountMethod) {
    // Rule 11: componentDidMount isolated
    neededHooks.add('useEffect');
    const effectStmts: t.Statement[] = [];

    if (mountMethod.async) {
      const asyncIIFE = t.expressionStatement(
        t.callExpression(
          t.arrowFunctionExpression([], mountMethod.body, true),
          []
        )
      );
      effectStmts.push(asyncIIFE);
    } else {
      effectStmts.push(...mountMethod.body.body);
    }

    hookStatements.push(
      t.expressionStatement(
        t.callExpression(t.identifier('useEffect'), [
          t.arrowFunctionExpression([], t.blockStatement(effectStmts)),
          t.arrayExpression([]),
        ])
      )
    );

    changes.push({
      type: 'lifecycle',
      description: 'Converted componentDidMount to isolated useEffect hook with [] deps',
    });
  } else if (unmountMethod) {
    // Rule 12: componentWillUnmount isolated
    neededHooks.add('useEffect');
    const cleanupReturn = t.returnStatement(
      t.arrowFunctionExpression([], unmountMethod.body)
    );

    hookStatements.push(
      t.expressionStatement(
        t.callExpression(t.identifier('useEffect'), [
          t.arrowFunctionExpression([], t.blockStatement([cleanupReturn])),
          t.arrayExpression([]),
        ])
      )
    );

    changes.push({
      type: 'lifecycle',
      description: 'Converted componentWillUnmount to isolated useEffect cleanup hook with [] deps',
    });
  }

  // Rule 14: componentDidUpdate with diff guard extraction
  if (updateMethod) {
    neededHooks.add('useEffect');
    const deps: t.Expression[] = [];
    const seenDepNames = new Set<string>();

    const addDep = (propName: string) => {
      if (!seenDepNames.has(propName)) {
        seenDepNames.add(propName);
        deps.push(t.memberExpression(t.identifier('props'), t.identifier(propName)));
      }
    };

    // Analyze method body for diff guards: if (prevProps.x !== this.props.x) ...
    const analyzeGuard = (stmt: any) => {
      if (t.isIfStatement(stmt)) {
        const test = stmt.test;
        if (t.isBinaryExpression(test) && (test.operator === '!==' || test.operator === '!=')) {
          // Check left and right
          [test.left, test.right].forEach((side) => {
            if (
              t.isMemberExpression(side) &&
              t.isIdentifier(side.property) &&
              t.isIdentifier(side.object) &&
              side.object.name === 'prevProps'
            ) {
              addDep(side.property.name);
            } else if (
              t.isMemberExpression(side) &&
              t.isIdentifier(side.property) &&
              t.isMemberExpression(side.object) &&
              t.isThisExpression(side.object.object) &&
              t.isIdentifier(side.object.property, { name: 'props' })
            ) {
              addDep(side.property.name);
            }
          });
        }
      }
    };

    updateMethod.body.body.forEach(analyzeGuard);

    if (deps.length === 0) {
      warnings.push(`componentDidUpdate converted to useEffect. Please review dependency array.`);
    }

    const hasPrevProps =
      updateMethod.params.length > 0 ||
      JSON.stringify(updateMethod.body).includes('"name":"prevProps"');

    if (hasPrevProps) {
      neededHooks.add('useRef');
      hookStatements.push(
        t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier('prevPropsRef'),
            t.callExpression(t.identifier('useRef'), [t.identifier('props')])
          ),
        ])
      );
      hookStatements.push(
        t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier('prevProps'),
            t.memberExpression(t.identifier('prevPropsRef'), t.identifier('current'))
          ),
        ])
      );
    }

    const effectBodyStmts = [...updateMethod.body.body];
    if (hasPrevProps) {
      effectBodyStmts.push(
        t.expressionStatement(
          t.assignmentExpression(
            '=',
            t.memberExpression(t.identifier('prevPropsRef'), t.identifier('current')),
            t.identifier('props')
          )
        )
      );
    }

    hookStatements.push(
      t.expressionStatement(
        t.callExpression(t.identifier('useEffect'), [
          t.arrowFunctionExpression([], t.blockStatement(effectBodyStmts)),
          deps.length > 0 ? t.arrayExpression(deps) : t.arrayExpression([]),
        ])
      )
    );

    changes.push({
      type: 'lifecycle',
      description: `Converted componentDidUpdate to useEffect with [${deps.map(d => t.isMemberExpression(d) && t.isIdentifier(d.property) ? `props.${d.property.name}` : '').filter(Boolean).join(', ')}] deps`,
    });
  }

  // Rule 17: shouldComponentUpdate to React.memo comparator
  if (shouldUpdateMethod) {
    neededHooks.add('memo');
    const prevParam = t.identifier('prevProps');
    const nextParam = t.identifier('nextProps');

    // Invert the return expression: e.g. nextProps.id !== this.props.id -> prevProps.id === nextProps.id
    let comparatorExpr: t.Expression = t.booleanLiteral(true);

    for (const s of shouldUpdateMethod.body.body) {
      if (t.isReturnStatement(s) && s.argument) {
        const arg = s.argument;
        if (t.isBinaryExpression(arg) && (arg.operator === '!==' || arg.operator === '!=')) {
          // Invert operator to ===
          const left = t.cloneNode(arg.left);
          const right = t.cloneNode(arg.right);

          // Replace this.props.x with prevProps.x
          const fixProps = (node: any): any => {
            if (
              t.isMemberExpression(node) &&
              t.isMemberExpression(node.object) &&
              t.isThisExpression(node.object.object) &&
              t.isIdentifier(node.object.property, { name: 'props' })
            ) {
              return t.memberExpression(prevParam, node.property);
            }
            if (t.isMemberExpression(node) && t.isIdentifier(node.object, { name: 'this' })) {
              return t.memberExpression(prevParam, node.property);
            }
            return node;
          };

          const invertedLeft = fixProps(left);
          const invertedRight = fixProps(right);

          // Return prevProps.id === nextProps.id
          comparatorExpr = t.binaryExpression('===', invertedRight, invertedLeft);
        } else {
          comparatorExpr = t.unaryExpression('!', arg as t.Expression);
        }
        break;
      }
    }

    memoComparator = t.functionDeclaration(
      t.identifier('arePropsEqual'),
      [prevParam, nextParam],
      t.blockStatement([t.returnStatement(comparatorExpr)])
    );

    changes.push({
      type: 'lifecycle',
      description: 'Converted shouldComponentUpdate to React.memo arePropsEqual comparator',
    });
  }

  return {
    hookStatements,
    neededHooks,
    changes,
    warnings,
    memoComparator,
    hasErrorBoundary,
    derivedStateKeys,
  };
}
