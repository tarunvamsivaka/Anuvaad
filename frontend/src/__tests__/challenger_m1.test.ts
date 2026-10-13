import { describe, it, expect } from 'vitest';
import { modernizeReactCode, validateTransformedCode } from '../engine';
import { parse } from '@babel/parser';

function verifyBabelParse(code: string) {
  return parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  });
}

describe('M1 Codemod Engine Adversarial & Stress Challenge Suite', () => {
  // Test 1: Multiple React Class Components in a single file
  it('Challenge 1: Multiple React Class Components in the same module', () => {
    const input = `
import React, { Component } from 'react';

class Header extends Component {
  state = { title: 'Header' };
  render() {
    return <header>{this.state.title}</header>;
  }
}

class Footer extends Component {
  state = { year: 2026 };
  render() {
    return <footer>{this.state.year}</footer>;
  }
}
`;
    const res = modernizeReactCode(input);
    expect(res.success).toBe(true);
    expect(res.syntaxValid).toBe(true);
    expect(() => verifyBabelParse(res.code)).not.toThrow();
    expect(res.code).toContain('function Header');
    expect(res.code).toContain('function Footer');
    expect(res.code).not.toContain('class Header');
    expect(res.code).not.toContain('class Footer');
  });

  // Test 2: Anonymous Class Default Export
  it('Challenge 2: Anonymous default export class component (export default class extends Component)', () => {
    const input = `
import React, { Component } from 'react';

export default class extends Component {
  state = { ready: true };
  render() {
    return <div>{this.state.ready ? 'Ready' : 'Not ready'}</div>;
  }
}
`;
    const res = modernizeReactCode(input);
    expect(res.success).toBe(true);
    expect(res.syntaxValid).toBe(true);
    expect(() => verifyBabelParse(res.code)).not.toThrow();
    expect(res.code).not.toContain('class extends');
  });

  // Test 3: Context.Consumer with Destructured parameter
  it('Challenge 3: Context.Consumer with destructured parameters', () => {
    const input = `
import React, { Component } from 'react';
const ThemeContext = React.createContext({ theme: 'dark', toggle: () => {} });

class ThemedButton extends Component {
  render() {
    return (
      <ThemeContext.Consumer>
        {({ theme, toggle }) => (
          <button className={theme} onClick={toggle}>Click</button>
        )}
      </ThemeContext.Consumer>
    );
  }
}
`;
    const res = modernizeReactCode(input);
    expect(res.success).toBe(true);
    expect(() => verifyBabelParse(res.code)).not.toThrow();
    // Consumer JSX should be replaced with useContext
    expect(res.code).not.toContain('ThemeContext.Consumer');
    expect(res.code).toContain('useContext(ThemeContext)');
  });

  // Test 4: Functional setState referencing other state fields
  it('Challenge 4: Functional setState accessing multi-state fields via prevState', () => {
    const input = `
import React, { Component } from 'react';

class MultiStepper extends Component {
  state = { count: 0, step: 5 };
  stepUp = () => {
    this.setState((prev) => ({ count: prev.count + prev.step }));
  };
  render() {
    return <button onClick={this.stepUp}>{this.state.count}</button>;
  }
}
`;
    const res = modernizeReactCode(input);
    expect(res.success).toBe(true);
    expect(() => verifyBabelParse(res.code)).not.toThrow();
    // Must not leave unresolved `prev` in the setter
    expect(res.code).not.toContain('prev.step');
  });

  // Test 5: Functional setState with intermediate statements in block
  it('Challenge 5: Functional setState containing statements before return', () => {
    const input = `
import React, { Component } from 'react';

class Calculator extends Component {
  state = { total: 0 };
  calculate = () => {
    this.setState((prev) => {
      const added = prev.total + 10;
      return { total: added };
    });
  };
  render() {
    return <div>{this.state.total}</div>;
  }
}
`;
    const res = modernizeReactCode(input);
    expect(res.success).toBe(true);
    expect(() => verifyBabelParse(res.code)).not.toThrow();
    // In generated code, 'added' must be in scope or converted to valid hook expression
    expect(res.code).not.toContain('setTotal(prevTotal => added)');
  });

  // Test 6: Direct this.state read (e.g. const s = this.state or JSON.stringify(this.state))
  it('Challenge 6: Direct this.state object read without key property', () => {
    const input = `
import React, { Component } from 'react';

class SnapshotViewer extends Component {
  state = { a: 1, b: 2 };
  render() {
    const serialized = JSON.stringify(this.state);
    return <div>{serialized}</div>;
  }
}
`;
    const res = modernizeReactCode(input);
    expect(res.success).toBe(true);
    expect(() => verifyBabelParse(res.code)).not.toThrow();
    // In functional component 'this.state' is invalid
    expect(res.code).not.toContain('this.state');
  });

  // Test 7: componentDidUpdate with prevProps and props comparison
  it('Challenge 7: componentDidUpdate prevProps scoping in useEffect', () => {
    const input = `
import React, { Component } from 'react';

class UserCard extends Component {
  componentDidUpdate(prevProps) {
    if (prevProps.userId !== this.props.userId) {
      console.log('User changed from', prevProps.userId, 'to', this.props.userId);
    }
  }
  render() {
    return <div>{this.props.userId}</div>;
  }
}
`;
    const res = modernizeReactCode(input);
    expect(res.success).toBe(true);
    expect(() => verifyBabelParse(res.code)).not.toThrow();
    // If useEffect contains prevProps, prevProps must be defined (e.g. via useRef)
    // or the condition must be valid in functional hook semantics
    if (res.code.includes('prevProps')) {
      expect(res.code).toMatch(/const prevProps|let prevProps|prevPropsRef/);
    }
  });

  // Test 8: Deeply nested helper render methods
  it('Challenge 8: Helper render methods returning JSX and calling this.setState', () => {
    const input = `
import React, { Component } from 'react';

class NestedTable extends Component {
  state = { selectedRow: -1 };

  handleSelect(index) {
    this.setState({ selectedRow: index });
  }

  renderRow(item, index) {
    return (
      <tr key={index} onClick={() => this.handleSelect(index)}>
        <td>{item}</td>
      </tr>
    );
  }

  render() {
    const items = ['apple', 'banana', 'cherry'];
    return (
      <table>
        <tbody>{items.map((it, idx) => this.renderRow(it, idx))}</tbody>
      </table>
    );
  }
}
`;
    const res = modernizeReactCode(input);
    expect(res.success).toBe(true);
    expect(res.syntaxValid).toBe(true);
    expect(() => verifyBabelParse(res.code)).not.toThrow();
    expect(res.code).not.toContain('this.renderRow');
    expect(res.code).not.toContain('this.handleSelect');
    expect(res.code).toContain('setSelectedRow(index)');
  });

  // Test 9: Complex Generic TypeScript Component: Class<T> extends Component<P<T>, S<T>>
  it('Challenge 9: Generic TypeScript Component: Component<Props<T>, State<T>>', () => {
    const input = `
import React, { Component } from 'react';

interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}

interface ListState<T> {
  activeItem: T | null;
}

class GenericList<T> extends Component<ListProps<T>, ListState<T>> {
  state: ListState<T> = { activeItem: null };

  select = (item: T) => {
    this.setState({ activeItem: item });
  };

  render() {
    return (
      <div>
        {this.props.items.map(item => this.props.renderItem(item))}
      </div>
    );
  }
}
`;
    const res = modernizeReactCode(input);
    expect(res.success).toBe(true);
    expect(res.syntaxValid).toBe(true);
    expect(() => verifyBabelParse(res.code)).not.toThrow();
    // Function component should preserve generic parameter <T>
    expect(res.code).toContain('function GenericList<T>');
  });

  // Test 10: PureComponent with static defaultProps and propTypes
  it('Challenge 10: PureComponent with static defaultProps, propTypes, and displayName', () => {
    const input = `
import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

class Badge extends PureComponent {
  static defaultProps = {
    color: 'blue',
    count: 0
  };

  static propTypes = {
    color: PropTypes.string,
    count: PropTypes.number
  };

  static displayName = 'StatusBadge';

  render() {
    return <span className={this.props.color}>{this.props.count}</span>;
  }
}
`;
    const res = modernizeReactCode(input);
    expect(res.success).toBe(true);
    expect(res.syntaxValid).toBe(true);
    expect(() => verifyBabelParse(res.code)).not.toThrow();
    expect(res.code).toContain('React.memo(');
    expect(res.code).toContain('Badge.propTypes =');
    expect(res.code).toContain('Badge.displayName =');
  });

  // Test 11: shouldComponentUpdate with custom props comparison logic
  it('Challenge 11: shouldComponentUpdate converted to arePropsEqual with custom logic', () => {
    const input = `
import React, { Component } from 'react';

class MemoizedCard extends Component {
  shouldComponentUpdate(nextProps) {
    return nextProps.id !== this.props.id || nextProps.updatedAt !== this.props.updatedAt;
  }
  render() {
    return <div>{this.props.title}</div>;
  }
}
`;
    const res = modernizeReactCode(input);
    expect(res.success).toBe(true);
    expect(res.syntaxValid).toBe(true);
    expect(() => verifyBabelParse(res.code)).not.toThrow();
    expect(res.code).toContain('arePropsEqual');
    expect(res.code).toContain('React.memo(');
  });

  // Test 12: Async componentDidMount with unmount cleanup
  it('Challenge 12: Async componentDidMount with componentWillUnmount', () => {
    const input = `
import React, { Component } from 'react';

class Poller extends Component {
  state = { data: null };
  timer = null;

  async componentDidMount() {
    const res = await fetch('/api/data');
    const json = await res.json();
    this.setState({ data: json });
  }

  componentWillUnmount() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  render() {
    return <div>{this.state.data ? 'Loaded' : 'Loading'}</div>;
  }
}
`;
    const res = modernizeReactCode(input);
    expect(res.success).toBe(true);
    expect(res.syntaxValid).toBe(true);
    expect(() => verifyBabelParse(res.code)).not.toThrow();
    expect(res.code).toContain('useEffect(');
    expect(res.code).toContain('timer.current');
  });

  // Test 13: getSnapshotBeforeUpdate with intermediate calculation statements
  it('Challenge 13: getSnapshotBeforeUpdate with local variable declarations', () => {
    const input = `
import React, { Component } from 'react';

class ScrollingList extends Component {
  listRef = React.createRef();

  getSnapshotBeforeUpdate(prevProps, prevState) {
    const el = this.listRef.current;
    if (el) {
      return el.scrollHeight - el.scrollTop;
    }
    return null;
  }

  render() {
    return <div ref={this.listRef}>List</div>;
  }
}
`;
    const res = modernizeReactCode(input);
    expect(res.success).toBe(true);
    expect(res.syntaxValid).toBe(true);
    expect(() => verifyBabelParse(res.code)).not.toThrow();
    // el must not be an undeclared reference
    if (res.code.includes('el.')) {
      expect(res.code).toMatch(/const el|let el/);
    }
  });

  // Test 14: getDerivedStateFromProps comparing props and state
  it('Challenge 14: getDerivedStateFromProps comparing props against state', () => {
    const input = `
import React, { Component } from 'react';

class SyncedInput extends Component {
  state = { value: '', prevPropValue: '' };

  static getDerivedStateFromProps(props, state) {
    if (props.value !== state.prevPropValue) {
      return {
        value: props.value,
        prevPropValue: props.value
      };
    }
    return null;
  }

  render() {
    return <input value={this.state.value} />;
  }
}
`;
    const res = modernizeReactCode(input);
    expect(res.success).toBe(true);
    expect(res.syntaxValid).toBe(true);
    expect(() => verifyBabelParse(res.code)).not.toThrow();
    // 'state' must not be an undeclared reference in the function body
    if (res.code.includes('state.prevPropValue')) {
      expect(res.code).toMatch(/const state|let state/);
    }
  });

  // Test 15: this.setState called with variable reference (e.g. this.setState(nextState))
  it('Challenge 15: this.setState called with variable or expression argument', () => {
    const input = `
import React, { Component } from 'react';

class ConfigEditor extends Component {
  state = { enabled: false };

  toggle = () => {
    const nextState = { enabled: !this.state.enabled };
    this.setState(nextState);
  };

  render() {
    return <button onClick={this.toggle}>Toggle</button>;
  }
}
`;
    const res = modernizeReactCode(input);
    expect(res.success).toBe(true);
    expect(() => verifyBabelParse(res.code)).not.toThrow();
    // 'this.setState' must not remain in the functional component
    expect(res.code).not.toContain('this.setState');
  });
});

