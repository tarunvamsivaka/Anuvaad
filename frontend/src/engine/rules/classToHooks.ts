import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';
import generateModule from '@babel/generator';
import * as t from '@babel/types';
import { TransformChange, TransformOptions, TransformResult } from '../types';

// Handle CommonJS / ESM interop for babel packages
const traverse = (traverseModule as any).default || traverseModule;
const generate = (generateModule as any).default || generateModule;

/**
 * Capitalize first letter helper for setter name (e.g., count -> setCount)
 */
function toSetterName(stateKey: string): string {
  return `set${stateKey.charAt(0).toUpperCase()}${stateKey.slice(1)}`;
}

/**
 * Transforms React Class Components to Functional Components with Hooks
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

  try {
    const ast = parse(sourceCode, {
      sourceType: 'module',
      plugins: [
        'jsx',
        'typescript',
      ],
    });

    const neededReactHooks = new Set<string>();

    traverse(ast, {
      ClassDeclaration(path: any) {
        const superClass = path.node.superClass;
        if (!superClass) return;

        // Check if extends React.Component or Component or PureComponent
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

        // Collect TypeScript types if available
        let propsTypeAnnotation: any = null;
        const typeArgs = path.node.superTypeArguments || path.node.superTypeParameters;
        if (typeArgs && typeArgs.params && typeArgs.params.length > 0) {
          propsTypeAnnotation = typeArgs.params[0];
        }

        const stateInitializers: Array<{ key: string; initNode: t.Expression }> = [];
        const lifecycleMethods: Map<string, any> = new Map();
        const customMethods: Array<{ name: string; node: any; isArrow: boolean }> = [];
        const refDeclarations: Array<{ name: string; initNode?: t.Expression }> = [];
        let renderMethodBody: t.Statement[] = [];
        let renderReturnStatement: t.ReturnStatement | null = null;

        // Inspect class body
        path.node.body.body.forEach((member: any) => {
          // 1. State property: state = { count: 0 }
          if (
            t.isClassProperty(member) &&
            t.isIdentifier(member.key, { name: 'state' }) &&
            member.value &&
            t.isObjectExpression(member.value)
          ) {
            member.value.properties.forEach((prop: any) => {
              if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
                stateInitializers.push({
                  key: prop.key.name,
                  initNode: prop.value as t.Expression,
                });
              }
            });
          }

          // 2. Ref property: myRef = React.createRef()
          if (
            t.isClassProperty(member) &&
            t.isIdentifier(member.key) &&
            member.value &&
            t.isCallExpression(member.value)
          ) {
            const callee = member.value.callee;
            if (
              (t.isMemberExpression(callee) &&
                t.isIdentifier(callee.property, { name: 'createRef' })) ||
              (t.isIdentifier(callee, { name: 'createRef' }))
            ) {
              refDeclarations.push({ name: member.key.name });
            }
          }

          // 3. Constructor
          if (t.isClassMethod(member, { kind: 'constructor' })) {
            member.body.body.forEach((stmt: any) => {
              // Look for this.state = { ... }
              if (
                t.isExpressionStatement(stmt) &&
                t.isAssignmentExpression(stmt.expression) &&
                t.isMemberExpression(stmt.expression.left) &&
                t.isThisExpression(stmt.expression.left.object) &&
                t.isIdentifier(stmt.expression.left.property, { name: 'state' }) &&
                t.isObjectExpression(stmt.expression.right)
              ) {
                stmt.expression.right.properties.forEach((prop: any) => {
                  if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
                    stateInitializers.push({
                      key: prop.key.name,
                      initNode: prop.value as t.Expression,
                    });
                  }
                });
              }
              // Look for this.myRef = React.createRef()
              if (
                t.isExpressionStatement(stmt) &&
                t.isAssignmentExpression(stmt.expression) &&
                t.isMemberExpression(stmt.expression.left) &&
                t.isThisExpression(stmt.expression.left.object) &&
                t.isIdentifier(stmt.expression.left.property) &&
                t.isCallExpression(stmt.expression.right)
              ) {
                const callee = stmt.expression.right.callee;
                if (
                  (t.isMemberExpression(callee) &&
                    t.isIdentifier(callee.property, { name: 'createRef' })) ||
                  (t.isIdentifier(callee, { name: 'createRef' }))
                ) {
                  refDeclarations.push({ name: stmt.expression.left.property.name });
                }
              }
            });
          }

          // 4. Lifecycle methods
          if (t.isClassMethod(member) && t.isIdentifier(member.key)) {
            const name = member.key.name;
            if (
              [
                'componentDidMount',
                'componentWillUnmount',
                'componentDidUpdate',
                'componentDidCatch',
              ].includes(name)
            ) {
              lifecycleMethods.set(name, member);
            } else if (name === 'render') {
              // Extract render method statements and return statement
              member.body.body.forEach((s: any) => {
                if (t.isReturnStatement(s)) {
                  renderReturnStatement = s;
                } else {
                  renderMethodBody.push(s);
                }
              });
            } else if (name === 'constructor') {
              // Handled separately in constructor block
            } else {
              // Custom method
              customMethods.push({
                name,
                node: member,
                isArrow: false,
              });
            }
          }

          // 5. Arrow function class property: handleClick = () => { ... }
          if (
            t.isClassProperty(member) &&
            t.isIdentifier(member.key) &&
            member.value &&
            t.isArrowFunctionExpression(member.value)
          ) {
            customMethods.push({
              name: member.key.name,
              node: member.value,
              isArrow: true,
            });
          }
        });

        // Assemble the functional component body statements
        const funcBodyStatements: t.Statement[] = [];

        // Add useState declarations
        stateInitializers.forEach(({ key, initNode }) => {
          neededReactHooks.add('useState');
          stateVariablesCount++;
          const setter = toSetterName(key);
          const stateDecl = t.variableDeclaration('const', [
            t.variableDeclarator(
              t.arrayPattern([t.identifier(key), t.identifier(setter)]),
              t.callExpression(t.identifier('useState'), [initNode])
            ),
          ]);
          funcBodyStatements.push(stateDecl);
          changes.push({
            type: 'state',
            description: `Transformed state property '${key}' to useState hook [${key}, ${setter}]`,
          });
        });

        // Add useRef declarations
        refDeclarations.forEach(({ name }) => {
          neededReactHooks.add('useRef');
          const refDecl = t.variableDeclaration('const', [
            t.variableDeclarator(
              t.identifier(name),
              t.callExpression(t.identifier('useRef'), [t.nullLiteral()])
            ),
          ]);
          funcBodyStatements.push(refDecl);
          changes.push({
            type: 'method',
            description: `Transformed ref '${name}' to useRef hook`,
          });
        });

        // Add custom methods as regular functions or callbacks
        customMethods.forEach(({ name, node, isArrow }) => {
          methodsCount++;
          let fnStatement: t.Statement;
          if (isArrow) {
            fnStatement = t.variableDeclaration('const', [
              t.variableDeclarator(t.identifier(name), node),
            ]);
          } else {
            fnStatement = t.functionDeclaration(
              t.identifier(name),
              node.params,
              node.body,
              node.generator,
              node.async
            );
          }
          funcBodyStatements.push(fnStatement);
          changes.push({
            type: 'method',
            description: `Transformed class method '${name}' to component function`,
          });
        });

        // Add useEffect for componentDidMount and/or componentWillUnmount
        const mountMethod = lifecycleMethods.get('componentDidMount');
        const unmountMethod = lifecycleMethods.get('componentWillUnmount');
        const updateMethod = lifecycleMethods.get('componentDidUpdate');

        if (mountMethod || unmountMethod) {
          neededReactHooks.add('useEffect');
          effectsCount++;

          const effectStatements: t.Statement[] = [];
          if (mountMethod) {
            effectStatements.push(...mountMethod.body.body);
          }

          if (unmountMethod) {
            // Add return () => { ... } cleanup
            const cleanupFn = t.arrowFunctionExpression([], unmountMethod.body);
            effectStatements.push(t.returnStatement(cleanupFn));
          }

          const effectCall = t.expressionStatement(
            t.callExpression(t.identifier('useEffect'), [
              t.arrowFunctionExpression([], t.blockStatement(effectStatements)),
              t.arrayExpression([]), // empty dependency array for mount/unmount
            ])
          );
          funcBodyStatements.push(effectCall);
          changes.push({
            type: 'lifecycle',
            description: `Unified ${mountMethod ? 'componentDidMount' : ''}${
              mountMethod && unmountMethod ? ' and ' : ''
            }${unmountMethod ? 'componentWillUnmount' : ''} into useEffect hook with [] deps`,
          });
        }

        if (updateMethod) {
          neededReactHooks.add('useEffect');
          effectsCount++;
          warnings.push(
            `componentDidUpdate converted to useEffect. Please review dependency array.`
          );
          const updateEffectCall = t.expressionStatement(
            t.callExpression(t.identifier('useEffect'), [
              t.arrowFunctionExpression([], updateMethod.body),
            ])
          );
          funcBodyStatements.push(updateEffectCall);
          changes.push({
            type: 'lifecycle',
            description: `Converted componentDidUpdate to useEffect hook`,
          });
        }

        // Add statements from render method
        renderMethodBody.forEach((stmt) => {
          // If statement is `const { ... } = this.state;`, skip it because state variables are now top-level
          if (
            t.isVariableDeclaration(stmt) &&
            stmt.declarations.some(
              (d) =>
                t.isMemberExpression(d.init) &&
                t.isThisExpression(d.init.object) &&
                t.isIdentifier(d.init.property, { name: 'state' })
            )
          ) {
            return;
          }
          funcBodyStatements.push(stmt);
        });

        // Add return statement from render
        if (renderReturnStatement) {
          funcBodyStatements.push(renderReturnStatement);
        } else {
          funcBodyStatements.push(t.returnStatement(t.nullLiteral()));
        }

        // Create the functional component
        // Parameters: props (typed if TypeScript was present)
        const propsParam = t.identifier('props');
        if (propsTypeAnnotation) {
          propsParam.typeAnnotation = t.tsTypeAnnotation(propsTypeAnnotation);
        }

        const funcComponent = t.functionDeclaration(
          t.identifier(componentName),
          [propsParam],
          t.blockStatement(funcBodyStatements)
        );

        // Replace the class declaration with the function component
        if (path.scope && path.scope.hasOwnBinding && path.scope.hasOwnBinding(componentName)) {
          path.scope.removeBinding(componentName);
        }
        path.replaceWith(funcComponent);
      },
    });

    // Second traversal pass: replace `this.state.x` -> `x`, `this.props.x` -> `props.x`, `this.setState(...)` -> setters, `this.method` -> `method`
    traverse(ast, {
      MemberExpression(path: any) {
        // 1. this.state.something -> something
        if (
          t.isMemberExpression(path.node.object) &&
          t.isThisExpression(path.node.object.object) &&
          t.isIdentifier(path.node.object.property, { name: 'state' }) &&
          t.isIdentifier(path.node.property)
        ) {
          path.replaceWith(t.identifier(path.node.property.name));
          return;
        }

        // 2. this.props.something -> props.something
        if (
          t.isThisExpression(path.node.object) &&
          t.isIdentifier(path.node.property, { name: 'props' })
        ) {
          path.replaceWith(t.identifier('props'));
          return;
        }

        // 3. this.methodName -> methodName (or this.myRef -> myRef)
        if (
          t.isThisExpression(path.node.object) &&
          t.isIdentifier(path.node.property) &&
          path.node.property.name !== 'state' &&
          path.node.property.name !== 'props' &&
          path.node.property.name !== 'setState'
        ) {
          path.replaceWith(t.identifier(path.node.property.name));
          return;
        }
      },

      CallExpression(path: any) {
        // Handle this.setState({ x: 1, y: 2 })
        const callee = path.node.callee;
        if (
          t.isMemberExpression(callee) &&
          t.isThisExpression(callee.object) &&
          t.isIdentifier(callee.property, { name: 'setState' })
        ) {
          const arg = path.node.arguments[0];
          if (t.isObjectExpression(arg)) {
            // Replace with sequence of setter calls: setX(1); setY(2)
            const setterCalls: t.Expression[] = [];
            arg.properties.forEach((prop: any) => {
              if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
                const setter = toSetterName(prop.key.name);
                setterCalls.push(
                  t.callExpression(t.identifier(setter), [prop.value as t.Expression])
                );
              }
            });

            if (setterCalls.length === 1) {
              path.replaceWith(setterCalls[0]);
            } else if (setterCalls.length > 1) {
              path.replaceWith(t.sequenceExpression(setterCalls));
            }
          } else if (t.isArrowFunctionExpression(arg) || t.isFunctionExpression(arg)) {
            // Handle this.setState(prev => ({ count: prev.count + 1 }))
            warnings.push(`Functional setState converted. Please review updater arguments.`);
          }
        }
      },
    });

    // Update React imports to ensure required hooks are imported
    let reactImportFound = false;
    traverse(ast, {
      ImportDeclaration(path: any) {
        if (path.node.source.value === 'react') {
          reactImportFound = true;
          // Remove Component and PureComponent specifiers
          path.node.specifiers = path.node.specifiers.filter((s: any) => {
            if (t.isImportSpecifier(s) && t.isIdentifier(s.imported)) {
              return s.imported.name !== 'Component' && s.imported.name !== 'PureComponent';
            }
            return true;
          });

          // Add needed hooks if not already present
          neededReactHooks.forEach((hook) => {
            const alreadyImported = path.node.specifiers.some(
              (s: any) => t.isImportSpecifier(s) && t.isIdentifier(s.imported, { name: hook })
            );
            if (!alreadyImported) {
              path.node.specifiers.push(
                t.importSpecifier(t.identifier(hook), t.identifier(hook))
              );
            }
          });
        }
      },
    });

    // If no react import exists at all but hooks are needed, add one at the top
    if (!reactImportFound && neededReactHooks.size > 0) {
      const specifiers: Array<t.ImportSpecifier | t.ImportDefaultSpecifier> = Array.from(neededReactHooks).map((hook) =>
        t.importSpecifier(t.identifier(hook), t.identifier(hook))
      );
      specifiers.unshift(t.importDefaultSpecifier(t.identifier('React')));
      const newImport = t.importDeclaration(specifiers, t.stringLiteral('react'));
      ast.program.body.unshift(newImport);
    }

    const output = generate(ast, {
      retainLines: false,
      compact: false,
      jsescOption: { minimal: true },
    }, sourceCode);

    const timeMs = Math.round((performance.now() - startTime) * 100) / 100;

    return {
      code: output.code,
      success: true,
      changes,
      warnings,
      stats: {
        stateVariables: stateVariablesCount,
        effects: effectsCount,
        methodsConverted: methodsCount,
        timeMs,
      },
    };
  } catch (err: any) {
    errors.push(err.message || String(err));
    return {
      code: sourceCode,
      success: false,
      changes,
      warnings,
      errors,
      stats: {
        stateVariables: 0,
        effects: 0,
        methodsConverted: 0,
        timeMs: Math.round((performance.now() - startTime) * 100) / 100,
      },
    };
  }
}
