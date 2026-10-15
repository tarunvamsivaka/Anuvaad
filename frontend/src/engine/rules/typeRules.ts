import * as t from '@babel/types';
import { TransformChange } from '../types';

export interface TypeAndStaticResult {
  propsParam: t.Identifier | t.ObjectPattern;
  staticStatements: t.Statement[];
  contextHookDeclarations: t.Statement[];
  forceUpdateDeclarations: t.Statement[];
  isPureComponent: boolean;
  stateTypeName?: string;
  neededHooks: Set<string>;
  changes: TransformChange[];
}

/**
 * Processes TypeScript generics, statics, contextType, and defaultProps (Rules 10, 30-40)
 */
export function processTypesAndStatics(
  classPath: any,
  componentName: string
): TypeAndStaticResult {
  const staticStatements: t.Statement[] = [];
  const contextHookDeclarations: t.Statement[] = [];
  const forceUpdateDeclarations: t.Statement[] = [];
  const neededHooks = new Set<string>();
  const changes: TransformChange[] = [];

  const classNode = classPath.node;
  const superClass = classNode.superClass;

  // Rule 34: PureComponent detection
  const isPureComponent =
    (t.isMemberExpression(superClass) &&
      t.isIdentifier(superClass.property, { name: 'PureComponent' })) ||
    (t.isIdentifier(superClass) && superClass.name === 'PureComponent');

  if (isPureComponent) {
    changes.push({
      type: 'signature',
      description: `Detected PureComponent; wrapping with React.memo()`,
    });
  }

  // Rules 36 & 37: Extract generics Component<Props, State>
  let propsTypeAnnotation: any = null;
  let stateTypeName: string | undefined = undefined;
  const typeArgs = classNode.superTypeArguments || classNode.superTypeParameters;
  if (typeArgs && typeArgs.params && typeArgs.params.length > 0) {
    // Rule 36: Props generic
    propsTypeAnnotation = typeArgs.params[0];
    changes.push({
      type: 'type',
      description: `Extracted Props generic parameter for component parameter typing`,
    });

    // Rule 37: State generic
    if (typeArgs.params.length > 1) {
      const stateArg = typeArgs.params[1];
      if (t.isTSTypeReference(stateArg) && t.isIdentifier(stateArg.typeName)) {
        stateTypeName = stateArg.typeName.name;
        changes.push({
          type: 'type',
          description: `Extracted State generic '${stateTypeName}' for useState hook typing`,
        });
      }
    }
  }

  // Scan static properties and methods
  let defaultPropsObj: t.ObjectExpression | null = null;

  classNode.body.body.forEach((member: any) => {
    // Static properties
    if (t.isClassProperty(member) && member.static && t.isIdentifier(member.key)) {
      const name = member.key.name;

      // Rule 30: static contextType = Context
      if (name === 'contextType' && member.value) {
        neededHooks.add('useContext');
        contextHookDeclarations.push(
          t.variableDeclaration('const', [
            t.variableDeclarator(
              t.identifier('context'),
              t.callExpression(t.identifier('useContext'), [member.value as t.Expression])
            ),
          ])
        );
        changes.push({
          type: 'context',
          description: 'Converted static contextType to useContext hook',
        });
        return;
      }

      // Rule 39: static defaultProps = { ... }
      if (name === 'defaultProps' && member.value && t.isObjectExpression(member.value)) {
        defaultPropsObj = member.value;
        changes.push({
          type: 'props',
          description: 'Converted static defaultProps to ES6 function parameter defaults',
        });
        return;
      }

      // Rule 40: static propTypes, static displayName, or custom statics
      if (member.value) {
        staticStatements.push(
          t.expressionStatement(
            t.assignmentExpression(
              '=',
              t.memberExpression(t.identifier(componentName), t.identifier(name)),
              member.value as t.Expression
            )
          )
        );
        changes.push({
          type: 'render',
          description: `Hoisted static property '${name}' outside component`,
        });
      }
    }

    // Rule 40: Static class methods (excluding React lifecycle static methods)
    if (
      t.isClassMethod(member) &&
      member.static &&
      t.isIdentifier(member.key) &&
      member.key.name !== 'getDerivedStateFromProps' &&
      member.key.name !== 'getDerivedStateFromError'
    ) {
      const name = member.key.name;
      const fnExpr = t.functionExpression(
        null,
        member.params as any,
        member.body,
        member.generator,
        member.async
      );
      staticStatements.push(
        t.expressionStatement(
          t.assignmentExpression(
            '=',
            t.memberExpression(t.identifier(componentName), t.identifier(name)),
            fnExpr
          )
        )
      );
      changes.push({
        type: 'method',
        description: `Hoisted static method '${name}' outside component`,
      });
    }
  });

  // Assemble props parameter (Rule 39 defaultProps support)
  let propsParam: t.Identifier | t.ObjectPattern;

  const rawDefaultProps = defaultPropsObj as any;
  if (rawDefaultProps && rawDefaultProps.properties && rawDefaultProps.properties.length > 0) {
    const patternProps: Array<t.RestElement | t.ObjectProperty> = [];
    const defaultPropKeys = new Set<string>();

    rawDefaultProps.properties.forEach((prop: any) => {
      if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
        defaultPropKeys.add(prop.key.name);
        const assign = t.assignmentPattern(t.identifier(prop.key.name), prop.value as t.Expression);
        patternProps.push(t.objectProperty(prop.key, assign as any, false, true));
      }
    });

    // Add rest element ...props
    patternProps.push(t.restElement(t.identifier('props')));
    const objPattern = t.objectPattern(patternProps);
    if (propsTypeAnnotation) {
      objPattern.typeAnnotation = t.tsTypeAnnotation(propsTypeAnnotation);
    }
    propsParam = objPattern;
  } else {
    const ident = t.identifier('props');
    if (propsTypeAnnotation) {
      ident.typeAnnotation = t.tsTypeAnnotation(propsTypeAnnotation);
    }
    propsParam = ident;
  }

  return {
    propsParam,
    staticStatements,
    contextHookDeclarations,
    forceUpdateDeclarations,
    isPureComponent,
    stateTypeName,
    neededHooks,
    changes,
  };
}

/**
 * Transforms Context Consumer JSX element to useContext (Rule 32)
 */
export function transformContextConsumers(
  ast: any,
  traverse: any,
  injectedHookDecls: t.Statement[],
  neededHooks: Set<string>
): void {
  traverse(ast, {
    JSXElement(path: any) {
      const opening = path.node.openingElement;
      if (
        t.isJSXMemberExpression(opening.name) &&
        t.isJSXIdentifier(opening.name.property, { name: 'Consumer' }) &&
        t.isJSXIdentifier(opening.name.object)
      ) {
        const contextName = opening.name.object.name;
        // Find child function
        for (const child of path.node.children) {
          if (t.isJSXExpressionContainer(child)) {
            const expr = child.expression;
            if (t.isArrowFunctionExpression(expr) || t.isFunctionExpression(expr)) {
              const param = expr.params[0];
              if (t.isIdentifier(param) || t.isObjectPattern(param) || t.isArrayPattern(param)) {
                neededHooks.add('useContext');
                injectedHookDecls.push(
                  t.variableDeclaration('const', [
                    t.variableDeclarator(
                      param,
                      t.callExpression(t.identifier('useContext'), [t.identifier(contextName)])
                    ),
                  ])
                );

                // Replace the consumer element with the function return JSX
                const body = expr.body;
                if (t.isJSXElement(body) || t.isJSXFragment(body)) {
                  path.replaceWith(body);
                  return;
                } else if (t.isBlockStatement(body)) {
                  for (const s of body.body) {
                    if (t.isReturnStatement(s) && s.argument) {
                      path.replaceWith(s.argument);
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
  });
}

/**
 * Transforms this.props, this.context, this.forceUpdate() (Rules 10, 31, 35)
 */
export function transformPropsContextAndForceUpdate(
  ast: any,
  traverse: any,
  defaultPropKeys: Set<string>,
  injectedHookDecls: t.Statement[],
  neededHooks: Set<string>
): void {
  let forceUpdateUsed = false;

  traverse(ast, {
    // Rule 35: this.forceUpdate() -> forceUpdate()
    CallExpression(path: any) {
      const callee = path.node.callee;
      if (
        t.isMemberExpression(callee) &&
        t.isThisExpression(callee.object) &&
        t.isIdentifier(callee.property, { name: 'forceUpdate' })
      ) {
        forceUpdateUsed = true;
        path.node.callee = t.identifier('forceUpdate');
      }
    },

    // Rule 10 & 31: this.props and this.context
    MemberExpression(path: any) {
      // 1. this.context.theme -> context.theme
      if (
        t.isThisExpression(path.node.object) &&
        t.isIdentifier(path.node.property, { name: 'context' })
      ) {
        path.replaceWith(t.identifier('context'));
        return;
      }

      // 2. this.props.x -> props.x (or x if destructured default prop)
      if (
        t.isMemberExpression(path.node.object) &&
        t.isThisExpression(path.node.object.object) &&
        t.isIdentifier(path.node.object.property, { name: 'props' }) &&
        t.isIdentifier(path.node.property)
      ) {
        const propName = path.node.property.name;
        if (defaultPropKeys.has(propName)) {
          path.replaceWith(t.identifier(propName));
        } else {
          path.replaceWith(t.memberExpression(t.identifier('props'), t.identifier(propName)));
        }
        return;
      }

      // 3. this.props -> props
      if (
        t.isThisExpression(path.node.object) &&
        t.isIdentifier(path.node.property, { name: 'props' })
      ) {
        path.replaceWith(t.identifier('props'));
        return;
      }
    },
  });

  if (forceUpdateUsed) {
    neededHooks.add('useReducer');
    // const [, forceUpdate] = useReducer(x => x + 1, 0);
    const incArrow = t.arrowFunctionExpression(
      [t.identifier('x')],
      t.binaryExpression('+', t.identifier('x'), t.numericLiteral(1))
    );
    injectedHookDecls.push(
      t.variableDeclaration('const', [
        t.variableDeclarator(
          t.arrayPattern([null, t.identifier('forceUpdate')]),
          t.callExpression(t.identifier('useReducer'), [incArrow, t.numericLiteral(0)])
        ),
      ])
    );
  }
}

/**
 * Cleans up React imports, removing Component/PureComponent, and adding required hooks (Rule 38)
 */
export function updateReactImports(
  ast: any,
  traverse: any,
  neededHooks: Set<string>
): void {
  let reactImportFound = false;

  traverse(ast, {
    ImportDeclaration(path: any) {
      if (path.node.source.value === 'react') {
        reactImportFound = true;
        // Remove Component and PureComponent
        path.node.specifiers = path.node.specifiers.filter((s: any) => {
          if (t.isImportSpecifier(s) && t.isIdentifier(s.imported)) {
            return s.imported.name !== 'Component' && s.imported.name !== 'PureComponent';
          }
          return true;
        });

        // Add needed hooks
        neededHooks.forEach((hook) => {
          const already = path.node.specifiers.some(
            (s: any) => t.isImportSpecifier(s) && t.isIdentifier(s.imported, { name: hook })
          );
          if (!already) {
            path.node.specifiers.push(
              t.importSpecifier(t.identifier(hook), t.identifier(hook))
            );
          }
        });
      }
    },
  });

  // If no React import exists at all, inject one
  if (!reactImportFound && neededHooks.size > 0) {
    const specifiers: Array<t.ImportSpecifier | t.ImportDefaultSpecifier> = Array.from(neededHooks).map(
      (hook) => t.importSpecifier(t.identifier(hook), t.identifier(hook))
    );
    specifiers.unshift(t.importDefaultSpecifier(t.identifier('React')));
    const reactSource = t.stringLiteral('react');
    (reactSource as any).extra = { raw: "'react'", rawValue: 'react' };
    const newImport = t.importDeclaration(specifiers, reactSource);
    ast.program.body.unshift(newImport);
  }
}
