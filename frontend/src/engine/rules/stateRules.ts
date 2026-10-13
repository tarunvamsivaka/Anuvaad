import * as t from '@babel/types';
import { TransformChange } from '../types';

export interface StateDefinition {
  key: string;
  initNode: t.Expression;
  setterName: string;
}

export function toSetterName(stateKey: string): string {
  return `set${stateKey.charAt(0).toUpperCase()}${stateKey.slice(1)}`;
}

/**
 * Extracts state definitions from constructor and class properties (Rules 1, 2)
 */
export function extractStateDefinitions(
  classBodyNodes: t.ClassBody['body']
): {
  stateDefs: StateDefinition[];
  changes: TransformChange[];
  constructorStmtsToPrune: Set<t.Statement>;
} {
  const stateDefs: StateDefinition[] = [];
  const changes: TransformChange[] = [];
  const constructorStmtsToPrune = new Set<t.Statement>();
  const seenKeys = new Set<string>();

  // 1. Look for class property state = { ... } or state = expr
  classBodyNodes.forEach((member) => {
    if (
      t.isClassProperty(member) &&
      t.isIdentifier(member.key, { name: 'state' }) &&
      member.value
    ) {
      if (t.isObjectExpression(member.value)) {
        member.value.properties.forEach((prop) => {
          if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
            const key = prop.key.name;
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              const def: StateDefinition = {
                key,
                initNode: prop.value as t.Expression,
                setterName: toSetterName(key),
              };
              stateDefs.push(def);
              changes.push({
                type: 'state',
                description: `Transformed class field state property '${key}' to useState hook [${key}, ${def.setterName}]`,
              });
            }
          }
        });
      } else {
        // Fallback for non-object state expression
        if (!seenKeys.has('state')) {
          seenKeys.add('state');
          stateDefs.push({
            key: 'state',
            initNode: member.value as t.Expression,
            setterName: 'setState',
          });
          changes.push({
            type: 'state',
            description: `Transformed non-object state property to useState hook [state, setState]`,
          });
        }
      }
    }
  });

  // 2. Look for constructor this.state = { ... } or this.state = expr
  classBodyNodes.forEach((member) => {
    if (t.isClassMethod(member, { kind: 'constructor' })) {
      member.body.body.forEach((stmt) => {
        if (
          t.isExpressionStatement(stmt) &&
          t.isAssignmentExpression(stmt.expression) &&
          t.isMemberExpression(stmt.expression.left) &&
          t.isThisExpression(stmt.expression.left.object) &&
          t.isIdentifier(stmt.expression.left.property, { name: 'state' })
        ) {
          constructorStmtsToPrune.add(stmt);
          const right = stmt.expression.right;
          if (t.isObjectExpression(right)) {
            right.properties.forEach((prop) => {
              if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
                const key = prop.key.name;
                if (!seenKeys.has(key)) {
                  seenKeys.add(key);
                  const def: StateDefinition = {
                    key,
                    initNode: prop.value as t.Expression,
                    setterName: toSetterName(key),
                  };
                  stateDefs.push(def);
                  changes.push({
                    type: 'state',
                    description: `Transformed constructor state property '${key}' to useState hook [${key}, ${def.setterName}]`,
                  });
                }
              }
            });
          } else {
            if (!seenKeys.has('state')) {
              seenKeys.add('state');
              stateDefs.push({
                key: 'state',
                initNode: right as t.Expression,
                setterName: 'setState',
              });
              changes.push({
                type: 'state',
                description: `Transformed constructor state expression to useState hook [state, setState]`,
              });
            }
          }
        }
      });
    }
  });

  return { stateDefs, changes, constructorStmtsToPrune };
}

/**
 * Creates useState hook AST variable declarations (Rule 1, 2)
 */
export function createStateHookDeclarations(
  stateDefs: StateDefinition[]
): t.VariableDeclaration[] {
  return stateDefs.map((def) => {
    const call = t.callExpression(t.identifier('useState'), [def.initNode]);
    return t.variableDeclaration('const', [
      t.variableDeclarator(
        t.arrayPattern([t.identifier(def.key), t.identifier(def.setterName)]),
        call
      ),
    ]);
  });
}

/**
 * Transforms this.setState calls (Rules 3, 4, 5, 6, 7)
 */
export function transformSetStateCallNode(
  callPath: any,
  stateVarNames: Set<string>,
  changes: TransformChange[],
  warnings: string[]
): void {
  const callee = callPath.node.callee;
  if (
    !t.isMemberExpression(callee) ||
    !t.isThisExpression(callee.object) ||
    !t.isIdentifier(callee.property, { name: 'setState' })
  ) {
    return;
  }

  const args = callPath.node.arguments;
  if (args.length === 0) return;

  const firstArg = args[0];
  const callbackArg = args.length > 1 ? args[1] : null;
  const setterStatements: t.ExpressionStatement[] = [];
  const setterExpressions: t.Expression[] = [];

  // Helper to extract callback execution
  const callbackStatements: t.Statement[] = [];
  if (callbackArg) {
    if (t.isArrowFunctionExpression(callbackArg) || t.isFunctionExpression(callbackArg)) {
      if (t.isBlockStatement(callbackArg.body)) {
        callbackStatements.push(...callbackArg.body.body);
      } else {
        callbackStatements.push(t.expressionStatement(callbackArg.body as t.Expression));
      }
    } else if (t.isExpression(callbackArg)) {
      callbackStatements.push(t.expressionStatement(t.callExpression(callbackArg, [])));
    }
    changes.push({
      type: 'state',
      description: 'Extracted this.setState completion callback to post-update execution',
    });
  }

  // Case A: Object expression this.setState({ x: 1, y: 2 })
  if (t.isObjectExpression(firstArg)) {
    firstArg.properties.forEach((prop) => {
      if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
        const key = prop.key.name;
        const setterName = toSetterName(key);
        const val = prop.value as t.Expression;
        const call = t.callExpression(t.identifier(setterName), [val]);
        setterExpressions.push(call);
        setterStatements.push(t.expressionStatement(call));
      }
    });

    changes.push({
      type: 'state',
      description: `Converted this.setState object to atomic useState setters`,
    });
  }
  // Case B: Functional updater this.setState((prev, props) => ({ count: prev.count + 1 }))
  else if (t.isArrowFunctionExpression(firstArg) || t.isFunctionExpression(firstArg)) {
    const fn = firstArg;
    const prevParam = fn.params[0];
    const propsParam = fn.params[1];

    let returnObject: t.ObjectExpression | null = null;
    const precedingStatements: t.Statement[] = [];
    if (t.isObjectExpression(fn.body)) {
      returnObject = fn.body;
    } else if (t.isBlockStatement(fn.body)) {
      for (const s of fn.body.body) {
        if (t.isReturnStatement(s) && s.argument && t.isObjectExpression(s.argument)) {
          returnObject = s.argument;
          break;
        } else {
          precedingStatements.push(s);
        }
      }
    }

    if (returnObject) {
      returnObject.properties.forEach((prop) => {
        if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
          const key = prop.key.name;
          const setterName = toSetterName(key);
          const prevName = `prev${key.charAt(0).toUpperCase()}${key.slice(1)}`;

          const clonedVal = t.cloneNode(prop.value as t.Expression);

          const replacePrev = (node: any): any => {
            if (!node || typeof node !== 'object') return node;

            // prev.key -> prevKey; prev.otherKey -> otherKey (closure state)
            if (
              t.isMemberExpression(node) &&
              t.isIdentifier(node.object) &&
              t.isIdentifier(prevParam) &&
              node.object.name === prevParam.name &&
              t.isIdentifier(node.property)
            ) {
              if (node.property.name === key) {
                return t.identifier(prevName);
              } else {
                return t.identifier(node.property.name);
              }
            }

            // Destructured param: ({ key }) => key -> prevKey
            if (
              t.isObjectPattern(prevParam) &&
              t.isIdentifier(node)
            ) {
              if (node.name === key) {
                return t.identifier(prevName);
              } else {
                return node;
              }
            }

            // props.x -> props.x
            if (
              propsParam &&
              t.isIdentifier(propsParam) &&
              t.isMemberExpression(node) &&
              t.isIdentifier(node.object, { name: propsParam.name })
            ) {
              return t.memberExpression(t.identifier('props'), node.property);
            }

            for (const k of Object.keys(node)) {
              if (k === 'parent' || k === 'leadingComments' || k === 'trailingComments') continue;
              if (Array.isArray(node[k])) {
                node[k] = node[k].map(replacePrev);
              } else if (typeof node[k] === 'object' && node[k] !== null) {
                node[k] = replacePrev(node[k]);
              }
            }
            return node;
          };

          const transformedVal = replacePrev(clonedVal);
          let updaterArrow: t.ArrowFunctionExpression;
          if (precedingStatements.length > 0) {
            const transformedStmts = precedingStatements.map((s) => replacePrev(t.cloneNode(s)));
            const block = t.blockStatement([...transformedStmts, t.returnStatement(transformedVal)]);
            updaterArrow = t.arrowFunctionExpression([t.identifier(prevName)], block);
          } else {
            updaterArrow = t.arrowFunctionExpression([t.identifier(prevName)], transformedVal);
          }
          const call = t.callExpression(t.identifier(setterName), [updaterArrow]);
          setterExpressions.push(call);
          setterStatements.push(t.expressionStatement(call));
        }
      });
      changes.push({
        type: 'state',
        description: 'Converted functional this.setState to functional useState updater',
      });
    } else {
      warnings.push('Complex functional setState encountered; please review updater.');
    }
  }
  // Case C: Variable or expression argument this.setState(nextState)
  else {
    let resolvedProps: string[] = [];

    if (t.isIdentifier(firstArg)) {
      try {
        const binding = callPath.scope.getBinding(firstArg.name);
        if (binding && binding.path && binding.path.isVariableDeclarator()) {
          const init = binding.path.node.init;
          if (init && t.isObjectExpression(init)) {
            init.properties.forEach((p: any) => {
              if (t.isObjectProperty(p) && t.isIdentifier(p.key) && stateVarNames.has(p.key.name)) {
                resolvedProps.push(p.key.name);
              }
            });
          }
        }
      } catch {
        // Fallback
      }
    }

    if (resolvedProps.length === 0) {
      resolvedProps = Array.from(stateVarNames);
    }

    resolvedProps.forEach((key) => {
      const setterName = toSetterName(key);
      const val = t.memberExpression(t.cloneNode(firstArg), t.identifier(key));
      const call = t.callExpression(t.identifier(setterName), [val]);
      setterExpressions.push(call);
      setterStatements.push(t.expressionStatement(call));
    });

    changes.push({
      type: 'state',
      description: 'Converted variable this.setState to useState setter(s)',
    });
  }

  if (setterExpressions.length === 0) return;

  const isExprStmt = callPath.parentPath && callPath.parentPath.isExpressionStatement();
  if (isExprStmt && (setterStatements.length > 1 || callbackStatements.length > 0)) {
    callPath.parentPath.replaceWithMultiple([...setterStatements, ...callbackStatements]);
  } else if (setterExpressions.length === 1 && callbackStatements.length === 0) {
    callPath.replaceWith(setterExpressions[0]);
  } else if (setterExpressions.length > 1) {
    callPath.replaceWith(t.sequenceExpression(setterExpressions));
  }
}

/**
 * Transforms direct state reads (Rule 8) and prunes destructured state declarations (Rule 9)
 */
export function transformStateReadsAndDestructuring(
  ast: any,
  traverse: any,
  stateVarNames: Set<string>
): void {
  traverse(ast, {
    // Rule 9: Destructured state pruning: const { count, active } = this.state;
    VariableDeclaration(path: any) {
      const decls = path.node.declarations;
      let shouldPruneWholeDecl = false;
      const replacements: t.VariableDeclaration[] = [];

      decls.forEach((d: any) => {
        if (
          t.isVariableDeclarator(d) &&
          t.isMemberExpression(d.init) &&
          t.isThisExpression(d.init.object) &&
          t.isIdentifier(d.init.property, { name: 'state' }) &&
          t.isObjectPattern(d.id)
        ) {
          let allMatch = true;
          d.id.properties.forEach((prop: any) => {
            if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
              const origKey = prop.key.name;
              if (t.isIdentifier(prop.value)) {
                const aliasKey = prop.value.name;
                if (aliasKey !== origKey) {
                  replacements.push(
                    t.variableDeclaration('const', [
                      t.variableDeclarator(t.identifier(aliasKey), t.identifier(origKey)),
                    ])
                  );
                }
              }
            } else {
              allMatch = false;
            }
          });

          if (allMatch) {
            shouldPruneWholeDecl = true;
          }
        }
      });

      if (shouldPruneWholeDecl) {
        if (replacements.length > 0) {
          path.replaceWithMultiple(replacements);
        } else {
          path.remove();
        }
      }
    },

    // Rule 8: Direct state read: this.state.x -> x and bare this.state -> { var1, var2, ... }
    MemberExpression(path: any) {
      if (
        t.isMemberExpression(path.node.object) &&
        t.isThisExpression(path.node.object.object) &&
        t.isIdentifier(path.node.object.property, { name: 'state' }) &&
        t.isIdentifier(path.node.property)
      ) {
        const propName = path.node.property.name;
        path.replaceWith(t.identifier(propName));
      } else if (
        t.isThisExpression(path.node.object) &&
        t.isIdentifier(path.node.property, { name: 'state' })
      ) {
        if (
          path.parentPath &&
          path.parentPath.isMemberExpression() &&
          path.parentPath.node.object === path.node
        ) {
          return;
        }
        if (
          path.parentPath &&
          path.parentPath.isAssignmentExpression() &&
          path.parentPath.node.left === path.node
        ) {
          return;
        }
        const props = Array.from(stateVarNames).map((key) =>
          t.objectProperty(t.identifier(key), t.identifier(key), false, true)
        );
        path.replaceWith(t.objectExpression(props));
      }
    },
  });
}
