import { describe, it, expect } from 'vitest';
import { modernizeReactCode } from '../engine';
import { parse } from '@babel/parser';

function verifyBabelParse(code: string) {
  return parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  });
}

describe('Challenger M1: Adversarial Edge Cases Suite', () => {
  // ==========================================
  // Section 1: Context Consumer Destructuring
  // ==========================================
  describe('Context Consumer Destructuring', () => {
    it('handles nested destructuring in Context.Consumer', () => {
      const input = `
import React, { Component } from 'react';
const UserContext = React.createContext({ profile: { name: 'Alice' } });

class UserHeader extends Component {
  render() {
    return (
      <UserContext.Consumer>
        {({ profile: { name } }) => (
          <h1>Welcome, {name}</h1>
        )}
      </UserContext.Consumer>
    );
  }
}
`;
      const res = modernizeReactCode(input);
      expect(res.success).toBe(true);
      expect(res.syntaxValid).toBe(true);
      expect(() => verifyBabelParse(res.code)).not.toThrow();
      expect(res.code).toContain('useContext(UserContext)');
      expect(res.code).not.toContain('UserContext.Consumer');
    });

    it('handles default values in Context.Consumer destructuring', () => {
      const input = `
import React, { Component } from 'react';
const SettingsContext = React.createContext({ mode: 'light' });

class SettingsPanel extends Component {
  render() {
    return (
      <SettingsContext.Consumer>
        {({ mode = 'dark', lang = 'en' }) => (
          <div>{mode} - {lang}</div>
        )}
      </SettingsContext.Consumer>
    );
  }
}
`;
      const res = modernizeReactCode(input);
      expect(res.success).toBe(true);
      expect(res.syntaxValid).toBe(true);
      expect(() => verifyBabelParse(res.code)).not.toThrow();
      expect(res.code).toContain('useContext(SettingsContext)');
    });

    it('handles array destructuring in Context.Consumer', () => {
      const input = `
import React, { Component } from 'react';
const StateContext = React.createContext(['initial', () => {}]);

class StateWatcher extends Component {
  render() {
    return (
      <StateContext.Consumer>
        {([state, dispatch]) => (
          <button onClick={() => dispatch('click')}>{state}</button>
        )}
      </StateContext.Consumer>
    );
  }
}
`;
      const res = modernizeReactCode(input);
      expect(res.success).toBe(true);
      expect(res.syntaxValid).toBe(true);
      expect(() => verifyBabelParse(res.code)).not.toThrow();
      expect(res.code).toContain('useContext(StateContext)');
      expect(res.code).toContain('const [state, dispatch] = useContext(StateContext);');
    });

    it('handles Context.Consumer with block statement and intermediate statements', () => {
      const input = `
import React, { Component } from 'react';
const ThemeContext = React.createContext({ color: 'red' });

class StyledBox extends Component {
  render() {
    return (
      <ThemeContext.Consumer>
        {({ color }) => {
          const bg = color === 'red' ? '#ff0000' : '#000000';
          return <div style={{ backgroundColor: bg }}>Box</div>;
        }}
      </ThemeContext.Consumer>
    );
  }
}
`;
      const res = modernizeReactCode(input);
      expect(res.success).toBe(true);
      expect(res.syntaxValid).toBe(true);
      expect(() => verifyBabelParse(res.code)).not.toThrow();
      expect(res.code).toContain('useContext(ThemeContext)');
    });
  });

  // ==========================================
  // Section 2: Multi-Key Functional setState
  // ==========================================
  describe('Multi-Key Functional setState', () => {
    it('handles 3+ state fields cross-referencing each other in functional setState', () => {
      const input = `
import React, { Component } from 'react';

class TriangleTracker extends Component {
  state = { a: 1, b: 2, c: 3 };

  expand = () => {
    this.setState((prev) => ({
      a: prev.a + 1,
      b: prev.a + prev.b,
      c: prev.b + prev.c,
    }));
  };

  render() {
    return <div>{this.state.a} {this.state.b} {this.state.c}</div>;
  }
}
`;
      const res = modernizeReactCode(input);
      expect(res.success).toBe(true);
      expect(res.syntaxValid).toBe(true);
      expect(() => verifyBabelParse(res.code)).not.toThrow();
      expect(res.code).not.toContain('prev.a');
      expect(res.code).not.toContain('prev.b');
      expect(res.code).not.toContain('prev.c');
      expect(res.code).toContain('setA(');
      expect(res.code).toContain('setB(');
      expect(res.code).toContain('setC(');
    });

    it('handles functional setState using traditional function expression', () => {
      const input = `
import React, { Component } from 'react';

class Counter extends Component {
  state = { count: 0 };

  increment = () => {
    this.setState(function(prev) {
      return { count: prev.count + 1 };
    });
  };

  render() {
    return <button onClick={this.increment}>{this.state.count}</button>;
  }
}
`;
      const res = modernizeReactCode(input);
      expect(res.success).toBe(true);
      expect(res.syntaxValid).toBe(true);
      expect(() => verifyBabelParse(res.code)).not.toThrow();
      expect(res.code).not.toContain('this.setState');
      expect(res.code).toContain('setCount(');
    });

    it('handles functional setState block with intermediate variables and calculations', () => {
      const input = `
import React, { Component } from 'react';

class MultiCalc extends Component {
  state = { count: 10, factor: 2 };

  scale = () => {
    this.setState((prev) => {
      const scaledFactor = prev.factor * 2;
      const newCount = prev.count * scaledFactor;
      return {
        count: newCount,
        factor: scaledFactor,
      };
    });
  };

  render() {
    return <div>{this.state.count} - {this.state.factor}</div>;
  }
}
`;
      const res = modernizeReactCode(input);
      expect(res.success).toBe(true);
      expect(res.syntaxValid).toBe(true);
      expect(() => verifyBabelParse(res.code)).not.toThrow();
      expect(res.code).not.toContain('this.setState');
    });
  });

  // ==========================================
  // Section 3: Bare this.state Reads
  // ==========================================
  describe('Bare this.state Reads', () => {
    it('handles object spread of bare this.state', () => {
      const input = `
import React, { Component } from 'react';

class StateMerger extends Component {
  state = { x: 10, y: 20 };

  render() {
    const payload = { ...this.state, extra: true };
    return <div>{JSON.stringify(payload)}</div>;
  }
}
`;
      const res = modernizeReactCode(input);
      expect(res.success).toBe(true);
      expect(res.syntaxValid).toBe(true);
      expect(() => verifyBabelParse(res.code)).not.toThrow();
      expect(res.code).not.toContain('this.state');
      expect(res.code).toMatch(/\{\s*\.\.\.{\s*x,\s*y\s*},\s*extra:\s*true\s*\}/);
    });

    it('handles bare this.state passed as function arguments in methods', () => {
      const input = `
import React, { Component } from 'react';

class Logger extends Component {
  state = { message: 'hello', level: 'info' };

  logCurrentState() {
    console.log('Current state:', this.state);
  }

  render() {
    return <button onClick={() => this.logCurrentState()}>{this.state.message}</button>;
  }
}
`;
      const res = modernizeReactCode(input);
      expect(res.success).toBe(true);
      expect(res.syntaxValid).toBe(true);
      expect(() => verifyBabelParse(res.code)).not.toThrow();
      expect(res.code).not.toContain('this.state');
      expect(res.code).toMatch(/console\.log\('Current state:',\s*{\s*message,\s*level\s*}\)/);
    });

    it('handles coexistence of bare this.state and specific this.state.field reads', () => {
      const input = `
import React, { Component } from 'react';

class HybridViewer extends Component {
  state = { id: 1, title: 'Test' };

  render() {
    const full = this.state;
    const titleOnly = this.state.title;
    return <h1>{titleOnly}</h1>;
  }
}
`;
      const res = modernizeReactCode(input);
      expect(res.success).toBe(true);
      expect(res.syntaxValid).toBe(true);
      expect(() => verifyBabelParse(res.code)).not.toThrow();
      expect(res.code).not.toContain('this.state');
      expect(res.code).toMatch(/const full = {\s*id,\s*title\s*};/);
      expect(res.code).toContain('const titleOnly = title;');
    });
  });

  // ==========================================
  // Section 4: Generic TypeScript Parameters
  // ==========================================
  describe('Generic TypeScript Parameters', () => {
    it('handles multiple generic type parameters with constraints', () => {
      const input = `
import React, { Component } from 'react';

interface DictProps<K extends string | number, V> {
  data: Record<K, V>;
}

interface DictState<V> {
  selected: V | null;
}

class DictViewer<K extends string | number, V> extends Component<DictProps<K, V>, DictState<V>> {
  state: DictState<V> = { selected: null };

  render() {
    return <div>Dict</div>;
  }
}
`;
      const res = modernizeReactCode(input);
      expect(res.success).toBe(true);
      expect(res.syntaxValid).toBe(true);
      expect(() => verifyBabelParse(res.code)).not.toThrow();
      expect(res.code).toContain('function DictViewer<K extends string | number, V>');
    });

    it('handles generic type parameters with defaults', () => {
      const input = `
import React, { Component } from 'react';

interface SelectorProps<T = string> {
  values: T[];
}

class Selector<T = string> extends Component<SelectorProps<T>> {
  render() {
    return <div>Select</div>;
  }
}
`;
      const res = modernizeReactCode(input);
      expect(res.success).toBe(true);
      expect(res.syntaxValid).toBe(true);
      expect(() => verifyBabelParse(res.code)).not.toThrow();
      expect(res.code).toContain('function Selector<T = string>');
    });

    it('handles generic PureComponent wrapped in React.memo', () => {
      const input = `
import React, { PureComponent } from 'react';

interface ListProps<T> {
  items: T[];
}

class FastList<T> extends PureComponent<ListProps<T>> {
  render() {
    return <ul>{this.props.items.length}</ul>;
  }
}
`;
      const res = modernizeReactCode(input);
      expect(res.success).toBe(true);
      expect(res.syntaxValid).toBe(true);
      expect(() => verifyBabelParse(res.code)).not.toThrow();
      expect(res.code).toContain('React.memo(');
      expect(res.code).toContain('function FastList');
    });
  });

  // ==========================================
  // Section 5: defaultProps Collision & Edge Cases
  // ==========================================
  describe('defaultProps Collision & Props Destructuring', () => {
    it('handles partial destructuring with defaultProps', () => {
      const input = `
import React, { Component } from 'react';

class Card extends Component {
  static defaultProps = {
    theme: 'dark',
    size: 'medium'
  };

  render() {
    const { theme, title, size } = this.props;
    return <div className={theme}>{title} - {size}</div>;
  }
}
`;
      const res = modernizeReactCode(input);
      expect(res.success).toBe(true);
      expect(res.syntaxValid).toBe(true);
      expect(() => verifyBabelParse(res.code)).not.toThrow();
      // Should not declare theme or size twice
      // Should keep title from props
      expect(res.code).toContain('title');
    });

    it('handles renamed/aliased destructuring with defaultProps', () => {
      const input = `
import React, { Component } from 'react';

class ThemedBox extends Component {
  static defaultProps = {
    theme: 'light'
  };

  render() {
    const { theme: activeTheme, content } = this.props;
    return <div className={activeTheme}>{content}</div>;
  }
}
`;
      const res = modernizeReactCode(input);
      expect(res.success).toBe(true);
      expect(res.syntaxValid).toBe(true);
      expect(() => verifyBabelParse(res.code)).not.toThrow();
    });

    it('handles defaultProps when this.props has no destructuring but direct property accesses', () => {
      const input = `
import React, { Component } from 'react';

class SimpleBadge extends Component {
  static defaultProps = {
    count: 0
  };

  render() {
    return <span>{this.props.count} - {this.props.label}</span>;
  }
}
`;
      const res = modernizeReactCode(input);
      expect(res.success).toBe(true);
      expect(res.syntaxValid).toBe(true);
      expect(() => verifyBabelParse(res.code)).not.toThrow();
      expect(res.code).toContain('count = 0');
    });
  });
});
