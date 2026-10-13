import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';
import generateModule from '@babel/generator';
import * as t from '@babel/types';
import { TransformChange, TransformOptions, TransformResult } from '../types';

import {
  extractStateDefinitions,
  createStateHookDeclarations,
  transformSetStateCallNode,
} from './stateRules';

import { processLifecycleMethods } from './lifecycleRules';

import {
  extractBindingAndRefs,
} from './bindingRules';

import {
  processTypesAndStatics,
  updateReactImports,
} from './typeRules';

// Handle CommonJS / ESM interop for babel packages
const traverse = (traverseModule as any).default || traverseModule;
const generate = (generateModule as any).default || generateModule;

/**
 * Transforms React Class Components to Functional Components with Hooks
 * Implements the full 40-rule deterministic AST catalog in volatile RAM.
 */
export function transformReactClassToHooks(
  sourceCode: string,
  options: TransformOptions = {}
): TransformResult {
  const startTime = performance.now();
  const changes: TransformChange[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  let stateVariablesCount = 0;
  let effectsCount = 0;
  let methodsCount = 0;
  let refsCount = 0;

  try {
    const ast = parse(sourceCode, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });

    const neededReactHooks = new Set<string>();

    traverse(ast, {
      ClassDeclaration(path: any) {
        const superClass = path.node.superClass;
        if (!superClass) return;

        // Check if extends React.Component or Component or React.PureComponent or PureComponent
        const isReactComponent =
          (t.isMemberExpression(superClass) &&
            t.isIdentifier(superClass.object, { name: 'React' }) &&
            (t.isIdentifier(superClass.property, { name: 'Component' }) ||
              t.isIdentifier(superClass.property, { name: 'PureComponent' }))) ||
          (t.isIdentifier(superClass) &&
            (superClass.name === 'Component' || superClass.name === 'PureComponent'));

        if (!isReactComponent) return;

        const componentName = path.node.id ? path.node.id.name : 'ConvertedComponent';

        changes.push({
          type: 'signature',
          description: `Converting class '${componentName}' to modern Functional Component`,
        });

        // 1. Process Types, Statics, Context, defaultProps (Rules 10, 30-40)
        const typeStaticRes = processTypesAndStatics(path, componentName);
        typeStaticRes.neededHooks.forEach((h) => neededReactHooks.add(h));
        changes.push(...typeStaticRes.changes);

        const defaultPropKeys = new Set<string>();
        if (t.isObjectPattern(typeStaticRes.propsParam)) {
          typeStaticRes.propsParam.properties.forEach((prop: any) => {
            if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
              defaultPropKeys.add(prop.key.name);
            }
          });
        }

        // 2. Extract Lifecycles (Rules 11-18)
        const lifecycleRes = processLifecycleMethods(path.node.body.body, componentName);
        lifecycleRes.neededHooks.forEach((h) => neededReactHooks.add(h));
        effectsCount += lifecycleRes.hookStatements.length;
        changes.push(...lifecycleRes.changes);
        warnings.push(...lifecycleRes.warnings);

        // 3. Extract State (Rules 1, 2, 37) (filtering derived state keys)
        const stateRes = extractStateDefinitions(path.node.body.body);
        const filteredStateDefs = stateRes.stateDefs.filter(
          (d) => !lifecycleRes.derivedStateKeys.has(d.key)
        );
        const stateVarNames = new Set<string>();
        filteredStateDefs.forEach((d) => stateVarNames.add(d.key));
        stateVariablesCount += filteredStateDefs.length;
        if (filteredStateDefs.length > 0) {
          neededReactHooks.add('useState');
        }
        changes.push(...stateRes.changes);
        const stateHookDeclarations = createStateHookDeclarations(filteredStateDefs);

        // 4. Extract Bindings, Refs, and Methods (Rules 19, 20, 23, 24, 26, 27, 28)
        const bindingRes = extractBindingAndRefs(path.node.body.body, options);
        refsCount += bindingRes.refDeclarations.length;
        methodsCount += bindingRes.customMethodDeclarations.length;
        if (bindingRes.refDeclarations.length > 0) {
          neededReactHooks.add('useRef');
        }
        changes.push(...bindingRes.changes);

        // 5. In-place rewrite of method bodies and render statements inside the class
        const injectedBodyHookDecls: t.Statement[] = [];

        path.traverse({
          // Rule 25: Callback ref to useRef
          JSXAttribute(attrPath: any) {
            if (attrPath.node.name.name === 'ref' && attrPath.node.value) {
              const val = attrPath.node.value;
              if (t.isJSXExpressionContainer(val)) {
                const expr = val.expression;
                let targetRefName: string | null = null;

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
                  bindingRes.createRefNames.add(targetRefName);
                  if (
                    !bindingRes.refDeclarations.some(
                      (d) => (d.declarations[0].id as any).name === targetRefName
                    )
                  ) {
                    neededReactHooks.add('useRef');
                    bindingRes.refDeclarations.push(
                      t.variableDeclaration('const', [
                        t.variableDeclarator(
                          t.identifier(targetRefName),
                          t.callExpression(t.identifier('useRef'), [t.nullLiteral()])
                        ),
                      ])
                    );
                  }
                  attrPath.node.value = t.jsxExpressionContainer(t.identifier(targetRefName));
                }
              }
            }
          },

          // Rule 32: Context Consumer JSX hoisting
          JSXElement(elemPath: any) {
            const opening = elemPath.node.openingElement;
            if (
              t.isJSXMemberExpression(opening.name) &&
              t.isJSXIdentifier(opening.name.property, { name: 'Consumer' }) &&
              t.isJSXIdentifier(opening.name.object)
            ) {
              const contextName = opening.name.object.name;
              for (const child of elemPath.node.children) {
                if (t.isJSXExpressionContainer(child)) {
                  const expr = child.expression;
                  if (t.isArrowFunctionExpression(expr) || t.isFunctionExpression(expr)) {
                    const param = expr.params[0];
                    if (t.isIdentifier(param) || t.isObjectPattern(param) || t.isArrayPattern(param)) {
                      neededReactHooks.add('useContext');
                      injectedBodyHookDecls.push(
                        t.variableDeclaration('const', [
                          t.variableDeclarator(
                            param,
                            t.callExpression(t.identifier('useContext'), [
                              t.identifier(contextName),
                            ])
                          ),
                        ])
                      );

                      const body = expr.body;
                      if (t.isJSXElement(body) || t.isJSXFragment(body)) {
                        elemPath.replaceWith(body);
                        return;
                      } else if (t.isBlockStatement(body)) {
                        for (const s of body.body) {
                          if (t.isReturnStatement(s) && s.argument) {
                            elemPath.replaceWith(s.argument);
                            return;
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },

          // Rule 9: Destructured state pruning
          VariableDeclaration(declPath: any) {
            const decls = declPath.node.declarations;
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
                            t.variableDeclarator(
                              t.identifier(aliasKey),
                              t.identifier(origKey)
                            ),
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

              // Prune defaultProps destructuring collision (e.g. const { theme } = this.props / props)
              if (
                t.isVariableDeclarator(d) &&
                t.isObjectPattern(d.id) &&
                defaultPropKeys.size > 0 &&
                ((t.isMemberExpression(d.init) &&
                  t.isThisExpression(d.init.object) &&
                  t.isIdentifier(d.init.property, { name: 'props' })) ||
                  (t.isIdentifier(d.init, { name: 'props' })))
              ) {
                const remainingProps: Array<t.RestElement | t.ObjectProperty> = [];
                d.id.properties.forEach((prop: any) => {
                  if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
                    if (!defaultPropKeys.has(prop.key.name)) {
                      remainingProps.push(prop);
                    }
                  } else {
                    remainingProps.push(prop);
                  }
                });

                if (remainingProps.length === 0) {
                  shouldPruneWholeDecl = true;
                } else if (remainingProps.length < d.id.properties.length) {
                  d.id.properties = remainingProps;
                }
              }
            });

            if (shouldPruneWholeDecl) {
              if (replacements.length > 0) {
                declPath.replaceWithMultiple(replacements);
              } else {
                declPath.remove();
              }
            }
          },

          // Rule 35: this.forceUpdate()
          CallExpression(callPath: any) {
            const callee = callPath.node.callee;
            if (
              t.isMemberExpression(callee) &&
              t.isThisExpression(callee.object) &&
              t.isIdentifier(callee.property, { name: 'forceUpdate' })
            ) {
              neededReactHooks.add('useReducer');
              const incArrow = t.arrowFunctionExpression(
                [t.identifier('x')],
                t.binaryExpression('+', t.identifier('x'), t.numericLiteral(1))
              );
              injectedBodyHookDecls.push(
                t.variableDeclaration('const', [
                  t.variableDeclarator(
                    t.arrayPattern([null, t.identifier('forceUpdate')]),
                    t.callExpression(t.identifier('useReducer'), [
                      incArrow,
                      t.numericLiteral(0),
                    ])
                  ),
                ])
              );
              callPath.node.callee = t.identifier('forceUpdate');
              return;
            }

            // Rules 3, 4, 5, 6, 7: this.setState(...)
            transformSetStateCallNode(callPath, stateVarNames, changes, warnings);
          },

          // Rule 22: Instance property writes (this.timer = val, this.counter += 1)
          AssignmentExpression(assignPath: any) {
            const left = assignPath.node.left;
            if (
              t.isMemberExpression(left) &&
              t.isThisExpression(left.object) &&
              t.isIdentifier(left.property)
            ) {
              const propName = left.property.name;
              if (
                bindingRes.instanceFieldNames.has(propName) ||
                bindingRes.createRefNames.has(propName)
              ) {
                assignPath.node.left = t.memberExpression(
                  t.identifier(propName),
                  t.identifier('current')
                );
              }
            }
          },

          // Rule 22: UpdateExpression (this.counter++)
          UpdateExpression(upPath: any) {
            const arg = upPath.node.argument;
            if (
              t.isMemberExpression(arg) &&
              t.isThisExpression(arg.object) &&
              t.isIdentifier(arg.property)
            ) {
              const propName = arg.property.name;
              if (bindingRes.instanceFieldNames.has(propName)) {
                upPath.node.argument = t.memberExpression(
                  t.identifier(propName),
                  t.identifier('current')
                );
              }
            }
          },

          // Member expressions (Rules 8, 10, 21, 29, 31)
          MemberExpression(memPath: any) {
            // Rule 8: this.state.x -> x
            if (
              t.isMemberExpression(memPath.node.object) &&
              t.isThisExpression(memPath.node.object.object) &&
              t.isIdentifier(memPath.node.object.property, { name: 'state' }) &&
              t.isIdentifier(memPath.node.property)
            ) {
              memPath.replaceWith(t.identifier(memPath.node.property.name));
              return;
            }

            // Rule 8: Bare this.state -> { key1, key2, ... }
            if (
              t.isThisExpression(memPath.node.object) &&
              t.isIdentifier(memPath.node.property, { name: 'state' })
            ) {
              if (
                memPath.parentPath.isMemberExpression() &&
                memPath.parentPath.node.object === memPath.node
              ) {
                return;
              }
              if (
                memPath.parentPath.isAssignmentExpression() &&
                memPath.parentPath.node.left === memPath.node
              ) {
                return;
              }
              const stateProps = stateRes.stateDefs.map((d) =>
                t.objectProperty(t.identifier(d.key), t.identifier(d.key), false, true)
              );
              memPath.replaceWith(t.objectExpression(stateProps));
              return;
            }

            // Rule 31: this.context.theme -> context.theme
            if (
              t.isThisExpression(memPath.node.object) &&
              t.isIdentifier(memPath.node.property, { name: 'context' })
            ) {
              memPath.replaceWith(t.identifier('context'));
              return;
            }

            // Rule 10: this.props.x -> props.x (or x if default prop)
            if (
              t.isMemberExpression(memPath.node.object) &&
              t.isThisExpression(memPath.node.object.object) &&
              t.isIdentifier(memPath.node.object.property, { name: 'props' }) &&
              t.isIdentifier(memPath.node.property)
            ) {
              const propName = memPath.node.property.name;
              if (defaultPropKeys.has(propName)) {
                memPath.replaceWith(t.identifier(propName));
              } else {
                memPath.replaceWith(
                  t.memberExpression(t.identifier('props'), t.identifier(propName))
                );
              }
              return;
            }

            // Rule 10: this.props -> props
            if (
              t.isThisExpression(memPath.node.object) &&
              t.isIdentifier(memPath.node.property, { name: 'props' })
            ) {
              memPath.replaceWith(t.identifier('props'));
              return;
            }

            // Rule 21 & Rule 29: this.myVar, this.method
            if (
              t.isThisExpression(memPath.node.object) &&
              t.isIdentifier(memPath.node.property)
            ) {
              const propName = memPath.node.property.name;
              if (['state', 'props', 'setState', 'context'].includes(propName)) {
                return;
              }

              // React createRef: this.inputRef -> inputRef (preserves .current already in code)
              if (bindingRes.createRefNames.has(propName)) {
                memPath.replaceWith(t.identifier(propName));
                return;
              }

              // Rule 21: Instance property read (this.timer -> timer.current)
              if (bindingRes.instanceFieldNames.has(propName)) {
                memPath.replaceWith(
                  t.memberExpression(t.identifier(propName), t.identifier('current'))
                );
                return;
              }

              // Rule 29: Method invocation / reference
              memPath.replaceWith(t.identifier(propName));
            }
          },
        });

        // 6. Extract Render method AFTER path.traverse has completed
        const renderMethodBody: t.Statement[] = [];
        let renderReturnStatement: t.ReturnStatement | null = null;

        const renderMethod = path.node.body.body.find(
          (member: any) =>
            t.isClassMethod(member) && t.isIdentifier(member.key, { name: 'render' })
        );

        if (renderMethod) {
          renderMethod.body.body.forEach((s: any) => {
            if (t.isReturnStatement(s)) {
              renderReturnStatement = s;
            } else {
              renderMethodBody.push(s);
            }
          });
        }

        // 7. Assemble Functional Component body
        const funcBodyStatements: t.Statement[] = [];

        // 7a. State hooks
        funcBodyStatements.push(...stateHookDeclarations);

        // 7b. Ref hooks
        funcBodyStatements.push(...bindingRes.refDeclarations);

        // 7c. Context hooks (static contextType)
        funcBodyStatements.push(...typeStaticRes.contextHookDeclarations);

        // 7d. Injected body hook declarations (forceUpdate, Context.Consumer)
        funcBodyStatements.push(...injectedBodyHookDecls);

        // 7e. Lifecycle hook statements (getDerivedStateFromProps, getSnapshotBeforeUpdate, useEffects)
        funcBodyStatements.push(...lifecycleRes.hookStatements);

        // 7f. Custom method declarations
        funcBodyStatements.push(...bindingRes.customMethodDeclarations);

        // 7g. Render method body statements
        funcBodyStatements.push(...renderMethodBody);

        // 7h. Return statement
        if (renderReturnStatement) {
          funcBodyStatements.push(renderReturnStatement);
        } else {
          funcBodyStatements.push(t.returnStatement(t.nullLiteral()));
        }

        // 8. Create Function Component declaration
        const funcComponent = t.functionDeclaration(
          t.identifier(componentName),
          [typeStaticRes.propsParam as any],
          t.blockStatement(funcBodyStatements)
        );

        if (path.node.typeParameters) {
          funcComponent.typeParameters = t.cloneNode(path.node.typeParameters);
        }

        // 9. Handle PureComponent wrapping (Rule 34) and shouldComponentUpdate memo (Rule 17)
        const isExportDefault = path.parentPath.isExportDefaultDeclaration();
        const isExportNamed = path.parentPath.isExportNamedDeclaration();

        const needsMemo = typeStaticRes.isPureComponent || !!lifecycleRes.memoComparator;
        if (needsMemo) {
          neededReactHooks.add('memo');
        }

        // Clean bindings before replacement to avoid Duplicate Declaration collision
        const pScope = path.parentPath.scope || path.scope;
        if (pScope && pScope.bindings) delete pScope.bindings[componentName];
        if (path.scope && path.scope.bindings) delete path.scope.bindings[componentName];
        if (path.scope && path.scope.hasOwnBinding && path.scope.hasOwnBinding(componentName)) {
          path.scope.removeBinding(componentName);
        }

        // Prepend memoComparator if defined
        if (lifecycleRes.memoComparator) {
          if (isExportNamed || isExportDefault) {
            path.parentPath.insertBefore(lifecycleRes.memoComparator);
          } else {
            path.insertBefore(lifecycleRes.memoComparator);
          }
        }

        if (needsMemo) {
          const fnExpr = t.functionExpression(
            t.identifier(componentName),
            [typeStaticRes.propsParam as any],
            t.blockStatement(funcBodyStatements)
          );

          const arePropsEqualArg = lifecycleRes.memoComparator
            ? [fnExpr, t.identifier('arePropsEqual')]
            : [fnExpr];

          const memoExpression = t.callExpression(
            t.memberExpression(t.identifier('React'), t.identifier('memo')),
            arePropsEqualArg
          );

          if (isExportDefault) {
            path.parentPath.replaceWith(t.exportDefaultDeclaration(memoExpression));
          } else if (isExportNamed) {
            const memoDecl = t.variableDeclaration('const', [
              t.variableDeclarator(t.identifier(componentName), memoExpression),
            ]);
            path.parentPath.replaceWith(t.exportNamedDeclaration(memoDecl));
          } else {
            const memoDecl = t.variableDeclaration('const', [
              t.variableDeclarator(t.identifier(componentName), memoExpression),
            ]);
            path.replaceWith(memoDecl);
          }
        } else {
          // Standard functional component
          path.replaceWith(funcComponent);
        }

        // 10. Append static statements (Rule 40)
        if (typeStaticRes.staticStatements.length > 0) {
          const targetPath = isExportDefault || isExportNamed ? path.parentPath : path;
          targetPath.insertAfter(typeStaticRes.staticStatements);
        }
      },
    });

    // Update React imports (Rule 38)
    updateReactImports(ast, traverse, neededReactHooks);

    const output = generate(
      ast,
      {
        retainLines: false,
        compact: false,
        jsescOption: { quotes: 'single', minimal: true },
      },
      sourceCode
    );

    let finalCode = output.code;
    // Format single-property destructured arrow parameters inline: ({ target }) =>
    finalCode = finalCode.replace(
      /\(\{\s*\n\s*([a-zA-Z0-9_$]+)\s*\n\s*\}\)\s*=>/g,
      '({ $1 }) =>'
    );
    // Normalize react import quote if generated as double quotes
    finalCode = finalCode.replace(/from "react";?/g, "from 'react';");

    const timeMs = Math.round((performance.now() - startTime) * 100) / 100;

    return {
      code: finalCode,
      success: true,
      syntaxValid: true,
      changes,
      warnings,
      stats: {
        stateVariables: stateVariablesCount,
        stateVarsCount: stateVariablesCount,
        effects: effectsCount,
        effectsCount: effectsCount,
        refsCount,
        methodsConverted: methodsCount,
        timeMs,
      },
    };
  } catch (err: any) {
    errors.push(err.message || String(err));
    return {
      code: sourceCode,
      success: false,
      syntaxValid: false,
      changes,
      warnings,
      errors,
      stats: {
        stateVariables: 0,
        stateVarsCount: 0,
        effects: 0,
        effectsCount: 0,
        refsCount: 0,
        methodsConverted: 0,
        timeMs: Math.round((performance.now() - startTime) * 100) / 100,
      },
    };
  }
}
