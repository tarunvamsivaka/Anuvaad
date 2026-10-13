import * as t from '@babel/types';
import { TransformChange, TransformOptions } from '../types';

export interface BindingAndRefResult {
  refDeclarations: t.VariableDeclaration[];
  createRefNames: Set<string>;
  instanceFieldNames: Set<string>;
  customMethodDeclarations: t.Statement[];
  customMethodNames: Set<string>;
  changes: TransformChange[];
  constructorStmtsToPrune: Set<t.Statement>;
}

/**
 * Extracts instance properties, refs, and method definitions (Rules 19, 20, 23, 24, 26, 27, 28)
 */
export function extractBindingAndRefs(
  classBodyNodes: t.ClassBody['body'],
  options: TransformOptions = {}
): BindingAndRefResult {
  const refDeclarations: t.VariableDeclaration[] = [];
  const createRefNames = new Set<string>();
  const instanceFieldNames = new Set<string>();
  const customMethodDeclarations: t.Statement[] = [];
  const customMethodNames = new Set<string>();
  const changes: TransformChange[] = [];
  const constructorStmtsToPrune = new Set<t.Statement>();

  const reservedFieldNames = new Set([
    'state',
    'contextType',
    'defaultProps',
    'propTypes',
    'displayName',
  ]);

  // 1. Scan class properties
  classBodyNodes.forEach((member) => {
    if (t.isClassProperty(member) && t.isIdentifier(member.key) && !member.static) {
      const name = member.key.name;
      if (reservedFieldNames.has(name)) return;

      const val = member.value;

      // Rule 23: React.createRef field
      if (
        val &&
        t.isCallExpression(val) &&
        ((t.isMemberExpression(val.callee) &&
          t.isIdentifier(val.callee.property, { name: 'createRef' })) ||
          (t.isIdentifier(val.callee, { name: 'createRef' })))
      ) {
        createRefNames.add(name);
        const refCall = t.callExpression(t.identifier('useRef'), [t.nullLiteral()]);
        if (member.typeAnnotation && t.isTSTypeAnnotation(member.typeAnnotation)) {
          (refCall as any).typeParameters = t.tsTypeParameterInstantiation([
            member.typeAnnotation.typeAnnotation,
          ]);
        }
        refDeclarations.push(
          t.variableDeclaration('const', [
            t.variableDeclarator(t.identifier(name), refCall),
          ])
        );
        changes.push({
          type: 'ref',
          description: `Transformed React.createRef property '${name}' to useRef hook`,
        });
        return;
      }

      // Rule 27: Arrow function class property
      if (val && t.isArrowFunctionExpression(val)) {
        customMethodNames.add(name);
        customMethodDeclarations.push(
          t.variableDeclaration('const', [
            t.variableDeclarator(t.identifier(name), val),
          ])
        );
        changes.push({
          type: 'method',
          description: `Converted arrow function property '${name}' to const function`,
        });
        return;
      }

      // Rule 19: Class field instance property to useRef
      instanceFieldNames.add(name);
      const initVal = val || t.nullLiteral();
      refDeclarations.push(
        t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier(name),
            t.callExpression(t.identifier('useRef'), [initVal as t.Expression])
          ),
        ])
      );
      changes.push({
        type: 'ref',
        description: `Transformed instance property field '${name}' to useRef hook`,
      });
    }

    // Rule 28: Standard class methods
    if (t.isClassMethod(member) && t.isIdentifier(member.key) && !member.static) {
      const name = member.key.name;
      const lifecycleAndSpecial = new Set([
        'constructor',
        'render',
        'componentDidMount',
        'componentWillUnmount',
        'componentDidUpdate',
        'shouldComponentUpdate',
        'getSnapshotBeforeUpdate',
        'componentDidCatch',
        'getDerivedStateFromError',
        'getDerivedStateFromProps',
      ]);

      if (!lifecycleAndSpecial.has(name)) {
        customMethodNames.add(name);
        const fnDecl = t.functionDeclaration(
          t.identifier(name),
          member.params as any,
          member.body,
          member.generator,
          member.async
        );
        customMethodDeclarations.push(fnDecl);
        changes.push({
          type: 'method',
          description: `Converted standard class method '${name}' to function declaration`,
        });
      }
    }
  });

  // 2. Scan constructor statements
  classBodyNodes.forEach((member) => {
    if (t.isClassMethod(member, { kind: 'constructor' })) {
      member.body.body.forEach((stmt) => {
        if (
          t.isExpressionStatement(stmt) &&
          t.isAssignmentExpression(stmt.expression) &&
          t.isMemberExpression(stmt.expression.left) &&
          t.isThisExpression(stmt.expression.left.object) &&
          t.isIdentifier(stmt.expression.left.property)
        ) {
          const propName = stmt.expression.left.property.name;
          const right = stmt.expression.right;

          // Skip this.state = ...
          if (propName === 'state') return;

          // Rule 26: Constructor this.handleClick = this.handleClick.bind(this)
          if (
            t.isCallExpression(right) &&
            t.isMemberExpression(right.callee) &&
            t.isIdentifier(right.callee.property, { name: 'bind' }) &&
            right.arguments.length >= 1 &&
            t.isThisExpression(right.arguments[0])
          ) {
            constructorStmtsToPrune.add(stmt);
            changes.push({
              type: 'method',
              description: `Pruned redundant constructor .bind(this) statement for '${propName}'`,
            });
            return;
          }

          // Rule 24: Constructor this.myRef = React.createRef()
          if (
            t.isCallExpression(right) &&
            ((t.isMemberExpression(right.callee) &&
              t.isIdentifier(right.callee.property, { name: 'createRef' })) ||
              (t.isIdentifier(right.callee, { name: 'createRef' })))
          ) {
            constructorStmtsToPrune.add(stmt);
            if (!createRefNames.has(propName)) {
              createRefNames.add(propName);
              refDeclarations.push(
                t.variableDeclaration('const', [
                  t.variableDeclarator(
                    t.identifier(propName),
                    t.callExpression(t.identifier('useRef'), [t.nullLiteral()])
                  ),
                ])
              );
              changes.push({
                type: 'ref',
                description: `Transformed constructor React.createRef '${propName}' to useRef hook`,
              });
            }
            return;
          }

          // Rule 20: Constructor this.var = expr to useRef
          constructorStmtsToPrune.add(stmt);
          if (!instanceFieldNames.has(propName)) {
            instanceFieldNames.add(propName);
            refDeclarations.push(
              t.variableDeclaration('const', [
                t.variableDeclarator(
                  t.identifier(propName),
                  t.callExpression(t.identifier('useRef'), [right])
                ),
              ])
            );
            changes.push({
              type: 'ref',
              description: `Transformed constructor instance assignment '${propName}' to useRef hook`,
            });
          }
        }
      });
    }
  });

  return {
    refDeclarations,
    createRefNames,
    instanceFieldNames,
    customMethodDeclarations,
    customMethodNames,
    changes,
    constructorStmtsToPrune,
  };
}

/**
 * Traverses JSX to convert callback refs to useRef (Rule 25)
 */
export function transformCallbackRefs(
  ast: any,
  traverse: any,
  createRefNames: Set<string>,
  refDeclarations: t.VariableDeclaration[]
): void {
  traverse(ast, {
    JSXAttribute(path: any) {
      if (path.node.name.name === 'ref' && path.node.value) {
        const val = path.node.value;
        if (t.isJSXExpressionContainer(val)) {
          const expr = val.expression;
          let targetRefName: string | null = null;

          // el => this.boxElement = el
          if (t.isArrowFunctionExpression(expr) || t.isFunctionExpression(expr)) {
            const body = expr.body;
            let assignExpr: t.AssignmentExpression | null = null;

            if (t.isAssignmentExpression(body)) {
              assignExpr = body;
            } else if (t.isBlockStatement(body)) {
              for (const s of body.body) {
                if (t.isExpressionStatement(s) && t.isAssignmentExpression(s.expression)) {
                  assignExpr = s.expression;
                  break;
                }
              }
            }

            if (
              assignExpr &&
              t.isMemberExpression(assignExpr.left) &&
              t.isThisExpression(assignExpr.left.object) &&
              t.isIdentifier(assignExpr.left.property)
            ) {
              targetRefName = assignExpr.left.property.name;
            }
          }

          if (targetRefName) {
            createRefNames.add(targetRefName);
            if (!refDeclarations.some((d) => (d.declarations[0].id as any).name === targetRefName)) {
              refDeclarations.push(
                t.variableDeclaration('const', [
                  t.variableDeclarator(
                    t.identifier(targetRefName),
                    t.callExpression(t.identifier('useRef'), [t.nullLiteral()])
                  ),
                ])
              );
            }
            path.node.value = t.jsxExpressionContainer(t.identifier(targetRefName));
          }
        }
      }
    },
  });
}

/**
 * Rewrites instance variable reads/writes (Rules 21, 22) and method invocations (Rule 29)
 */
export function transformBindingsAndRefsUsage(
  ast: any,
  traverse: any,
  createRefNames: Set<string>,
  instanceFieldNames: Set<string>,
  methodNames: Set<string>
): void {
  traverse(ast, {
    // Rule 22: Instance property writes: this.timer = val -> timer.current = val & this.counter += 1
    AssignmentExpression(path: any) {
      const left = path.node.left;
      if (
        t.isMemberExpression(left) &&
        t.isThisExpression(left.object) &&
        t.isIdentifier(left.property)
      ) {
        const propName = left.property.name;
        if (instanceFieldNames.has(propName) || createRefNames.has(propName)) {
          path.node.left = t.memberExpression(
            t.identifier(propName),
            t.identifier('current')
          );
        }
      }
    },

    // Rule 22: Update expressions: this.counter++ -> counter.current++
    UpdateExpression(path: any) {
      const arg = path.node.argument;
      if (
        t.isMemberExpression(arg) &&
        t.isThisExpression(arg.object) &&
        t.isIdentifier(arg.property)
      ) {
        const propName = arg.property.name;
        if (instanceFieldNames.has(propName)) {
          path.node.argument = t.memberExpression(
            t.identifier(propName),
            t.identifier('current')
          );
        }
      }
    },

    // Rule 21 & Rule 29: Instance property reads and method references
    MemberExpression(path: any) {
      if (t.isThisExpression(path.node.object) && t.isIdentifier(path.node.property)) {
        const propName = path.node.property.name;

        // Skip state, props, setState, context which are handled by state/type rules
        if (['state', 'props', 'setState', 'context'].includes(propName)) {
          return;
        }

        // Refs created via createRef: this.inputRef -> inputRef
        if (createRefNames.has(propName)) {
          path.replaceWith(t.identifier(propName));
          return;
        }

        // Rule 21: Instance property read (this.timer -> timer.current)
        if (instanceFieldNames.has(propName)) {
          path.replaceWith(
            t.memberExpression(t.identifier(propName), t.identifier('current'))
          );
          return;
        }

        // Rule 29: Method invocation / reference (this.handleClick -> handleClick)
        path.replaceWith(t.identifier(propName));
      }
    },
  });
}
