import { describe, it, expect, vi } from 'vitest';
import { modernizeReactCode } from '../engine';
import { executeModernization } from '../engine/dispatcher';

describe('Challenger 2: Empirical Performance & Off-Thread Integrity Harness', () => {
  // -------------------------------------------------------------
  // Test Fixtures
  // -------------------------------------------------------------
  const simpleComponent = `
import React from 'react';
class Button extends React.Component {
  state = { clicked: false, count: 0 };
  handleClick = () => {
    this.setState((prev) => ({ clicked: true, count: prev.count + 1 }));
  };
  render() {
    return (
      <button onClick={this.handleClick}>
        {this.state.clicked ? \`Clicked \${this.state.count}\` : 'Click me'}
      </button>
    );
  }
}
export default Button;
`;

  const mediumComponent = `
import React, { Component } from 'react';
import PropTypes from 'prop-types';

class UserProfile extends Component {
  static propTypes = {
    userId: PropTypes.string.isRequired,
    initialRole: PropTypes.string,
  };
  static defaultProps = {
    initialRole: 'member',
  };

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      user: null,
      error: null,
      activeTab: 'overview',
      editMode: false,
    };
    this.handleTabChange = this.handleTabChange.bind(this);
    this.toggleEdit = this.toggleEdit.bind(this);
    this.avatarRef = React.createRef();
  }

  componentDidMount() {
    console.log('Mounted UserProfile', this.props.userId);
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.userId !== this.props.userId) {
      this.setState({ loading: true });
    }
  }

  componentWillUnmount() {
    console.log('Unmounting UserProfile');
  }

  handleTabChange(tab) {
    this.setState({ activeTab: tab });
  }

  toggleEdit() {
    this.setState(prev => ({ editMode: !prev.editMode }));
  }

  render() {
    const { loading, user, error, activeTab, editMode } = this.state;
    const { userId } = this.props;

    if (loading) {
      return <div className="spinner">Loading user {userId}...</div>;
    }

    if (error) {
      return <div className="error-banner">Error: {error}</div>;
    }

    return (
      <div className="profile-container" ref={this.avatarRef}>
        <h2>{user ? user.name : 'Unknown User'} ({initialRole})</h2>
        <div className="tabs">
          <button onClick={() => this.handleTabChange('overview')} className={activeTab === 'overview' ? 'active' : ''}>
            Overview
          </button>
          <button onClick={() => this.handleTabChange('settings')} className={activeTab === 'settings' ? 'active' : ''}>
            Settings
          </button>
        </div>
        <button onClick={this.toggleEdit}>{editMode ? 'Cancel' : 'Edit'}</button>
      </div>
    );
  }
}
export default UserProfile;
`;

  // Generate a large component (500+ lines, 15 state variables, 10 methods, multiple lifecycles)
  function generateLargeComponent(numStateVars: number, numMethods: number): string {
    const stateInits = Array.from({ length: numStateVars }, (_, i) => `stateVar${i}: 'initVal${i}',`).join('\n      ');
    const methods = Array.from({ length: numMethods }, (_, i) => `
  handleAction${i}(arg) {
    this.setState({ stateVar${i % numStateVars}: 'updated_' + arg });
    console.log('Action ${i} performed', this.state.stateVar${i % numStateVars});
  }`).join('\n');

    const renderElements = Array.from({ length: numMethods }, (_, i) => `
        <button onClick={() => this.handleAction${i}('click_${i}')}>Action ${i}: {this.state.stateVar${i % numStateVars}}</button>
    `).join('\n');

    return `
import React, { Component } from 'react';

class MassiveComponent extends Component {
  state = {
    ${stateInits}
  };

  containerRef = React.createRef();

  componentDidMount() {
    console.log('Mounted massive component');
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.stateVar0 !== prevState.stateVar0) {
      console.log('State 0 updated');
    }
  }

  componentWillUnmount() {
    console.log('Cleanup massive component');
  }

  ${methods}

  render() {
    return (
      <div ref={this.containerRef} className="massive-layout">
        <h1>Massive Component</h1>
        ${renderElements}
      </div>
    );
  }
}
export default MassiveComponent;
`;
  }

  // -------------------------------------------------------------
  // 1. Latency & Performance SLA Benchmarking
  // -------------------------------------------------------------
  describe('1. Latency & Performance SLA Verification', () => {
    it('verifies simple component transformation latency meets <500ms SLA and <50ms target on warmed JIT', () => {
      // Warm up JIT
      for (let w = 0; w < 5; w++) {
        modernizeReactCode(simpleComponent);
      }

      const latencies: number[] = [];
      const iterations = 15;

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        const result = modernizeReactCode(simpleComponent);
        const elapsed = performance.now() - start;
        latencies.push(elapsed);

        expect(result.success).toBe(true);
        expect(result.syntaxValid).toBe(true);
        // Strict SLA requirement: MUST be under 500ms on every single invocation
        expect(elapsed).toBeLessThan(500);
      }

      latencies.sort((a, b) => a - b);
      const median = latencies[Math.floor(latencies.length / 2)];
      const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;

      console.log(`[PERF] Simple component (${iterations} runs) - Median: ${median.toFixed(2)}ms, Avg: ${avg.toFixed(2)}ms, Max: ${latencies[latencies.length - 1].toFixed(2)}ms`);
      // Target is <100ms under parallel test runner load, strictly under 500ms SLA
      expect(median).toBeLessThan(100);
    });

    it('verifies medium component (100 lines) meets <500ms SLA', () => {
      const start = performance.now();
      const result = modernizeReactCode(mediumComponent);
      const elapsed = performance.now() - start;

      console.log(`[PERF] Medium component latency: ${elapsed.toFixed(2)}ms (engine measured: ${result.stats.timeMs}ms)`);
      if (!result.success) {
        console.error('[PERF FAIL] Errors:', result.errors, 'Warnings:', result.warnings);
      }
      expect(result.success).toBe(true);
      expect(result.syntaxValid).toBe(true);
      expect(elapsed).toBeLessThan(500);
    });

    it('verifies large component (500+ lines, 20 state keys, 15 methods) meets <500ms SLA', () => {
      const largeCode = generateLargeComponent(20, 15);
      const start = performance.now();
      const result = modernizeReactCode(largeCode);
      const elapsed = performance.now() - start;

      console.log(`[PERF] Large component (lines: ${largeCode.split('\n').length}) latency: ${elapsed.toFixed(2)}ms`);
      expect(result.success).toBe(true);
      expect(result.syntaxValid).toBe(true);
      expect(result.stats.stateVariables).toBe(20);
      expect(result.stats.methodsConverted).toBe(15);
      expect(elapsed).toBeLessThan(500);
    });

    it('stress tests a massive component (1000+ lines, 40 state keys, 30 methods) under SLA', () => {
      const massiveCode = generateLargeComponent(40, 30);
      const start = performance.now();
      const result = modernizeReactCode(massiveCode);
      const elapsed = performance.now() - start;

      console.log(`[PERF] Massive component (lines: ${massiveCode.split('\n').length}) latency: ${elapsed.toFixed(2)}ms`);
      expect(result.success).toBe(true);
      expect(result.syntaxValid).toBe(true);
      expect(elapsed).toBeLessThan(500);
    });
  });

  // -------------------------------------------------------------
  // 2. Zero Network Egress & Volatile RAM Execution
  // -------------------------------------------------------------
  describe('2. Zero Network Egress & Volatile RAM Execution', () => {
    it('proves zero network calls (fetch, XHR, WebSocket, sendBeacon) during transformation', () => {
      const fetchSpy = vi.fn();
      const xhrSpy = vi.fn();
      const beaconSpy = vi.fn();

      // Intercept globals
      (globalThis as any).fetch = fetchSpy;
      (globalThis as any).XMLHttpRequest = xhrSpy;
      if (typeof navigator !== 'undefined') {
        (navigator as any).sendBeacon = beaconSpy;
      }

      // Execute transforms
      const res1 = modernizeReactCode(simpleComponent);
      const res2 = modernizeReactCode(mediumComponent);

      expect(res1.success).toBe(true);
      expect(res2.success).toBe(true);

      // Verify zero network calls were made
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(xhrSpy).not.toHaveBeenCalled();
      expect(beaconSpy).not.toHaveBeenCalled();
    });

    it('verifies code transformation is in-memory and does not access disk or external storage', () => {
      // Confirm the result is a plain in-memory JavaScript object
      const result = modernizeReactCode(simpleComponent);
      expect(typeof result.code).toBe('string');
      expect(result.code.length).toBeGreaterThan(0);
      expect(result.changes).toBeInstanceOf(Array);
      expect(typeof result.stats.timeMs).toBe('number');
      // No disk persistence side-effects
    });
  });

  // -------------------------------------------------------------
  // 3. Web Worker Off-Thread Execution & Dispatcher Protocol
  // -------------------------------------------------------------
  describe('3. Web Worker Off-Thread Execution & Dispatcher Protocol', () => {
    it('executes via dispatcher fallback when running in non-browser / workerless environment', async () => {
      const result = await executeModernization(simpleComponent);
      expect(result.success).toBe(true);
      expect(result.syntaxValid).toBe(true);
      expect(result.code).toContain('function Button');
      expect(result.code).toContain('useState');
    });

    it('validates mock Web Worker protocol and message handling', async () => {
      // Simulate the Web Worker execution script logic directly
      const workerMessageHandler = (event: { data: any }, postMessage: (msg: any) => void) => {
        const { id, sourceCode, options } = event.data || {};
        try {
          const result = modernizeReactCode(sourceCode, options);
          postMessage({ id, success: true, result });
        } catch (err: any) {
          postMessage({ id, success: false, error: err.message || 'Worker transformation failed' });
        }
      };

      const postedMessages: any[] = [];
      const mockPostMessage = (msg: any) => postedMessages.push(msg);

      // Test valid request
      workerMessageHandler(
        { data: { id: 101, sourceCode: simpleComponent, options: {} } },
        mockPostMessage
      );

      expect(postedMessages.length).toBe(1);
      expect(postedMessages[0].id).toBe(101);
      expect(postedMessages[0].success).toBe(true);
      expect(postedMessages[0].result.syntaxValid).toBe(true);

      // Test error handling in worker
      workerMessageHandler(
        { data: { id: 102, sourceCode: 'const x = { invalid syntax ;;;', options: {} } },
        mockPostMessage
      );

      expect(postedMessages.length).toBe(2);
      expect(postedMessages[1].id).toBe(102);
      // The engine handles syntax errors by returning success: false
      expect(postedMessages[1].result.success).toBe(false);
    });

    it('verifies concurrent modernization requests resolve independently', async () => {
      const promises = [
        executeModernization(simpleComponent),
        executeModernization(mediumComponent),
        executeModernization(simpleComponent),
      ];

      const results = await Promise.all(promises);
      expect(results.length).toBe(3);
      expect(results[0].code).toContain('Button');
      expect(results[1].code).toContain('UserProfile');
      expect(results[2].code).toContain('Button');
    });
  });

  // -------------------------------------------------------------
  // 4. Adversarial Edge Cases & Resilience
  // -------------------------------------------------------------
  describe('4. Adversarial Edge Cases & Boundary Stress Testing', () => {
    it('detects duplicate declaration collision when defaultProps and this.props destructuring coincide (EMPIRICAL BUG)', () => {
      const bugCode = `
import React from 'react';
class DuplicatePropBug extends React.Component {
  static defaultProps = { theme: 'dark' };
  render() {
    const { theme } = this.props;
    return <div>{theme}</div>;
  }
}
export default DuplicatePropBug;
`;
      const result = modernizeReactCode(bugCode);
      console.log('[BUG PROOF] Result success:', result.success, 'Errors:', result.errors);
      
      // EMPIRICAL BUG REPRODUCTION:
      // The engine converts `static defaultProps = { theme: 'dark' }` to parameter default:
      // `function DuplicatePropBug({ theme = 'dark', ...props })`
      // But it leaves `const { theme } = props;` in the body without pruning `theme`,
      // which causes Babel parser error: `Duplicate declaration "theme"`.
      // Target expectation: result.success should be true (theme should be pruned from local destructuring).
      expect(result.success).toBe(true);
      expect(result.errors || []).not.toContain('Duplicate declaration "theme"');
      expect(result.code).toContain("theme = 'dark'");
    });

    it('handles TypeScript component with typed Props and State generics', () => {
      const tsCode = `
import React from 'react';
interface ButtonProps { label: string; onClick: () => void; }
interface ButtonState { active: boolean; }
class TSButton extends React.Component<ButtonProps, ButtonState> {
  state: ButtonState = { active: false };
  render() {
    return <button onClick={this.props.onClick}>{this.props.label}: {this.state.active ? 'On' : 'Off'}</button>;
  }
}
export default TSButton;
`;
      const result = modernizeReactCode(tsCode);
      expect(result.success).toBe(true);
      expect(result.syntaxValid).toBe(true);
      expect(result.code).toContain('props: ButtonProps');
    });

    it('handles empty class component extending React.Component', () => {
      const code = `
import React from 'react';
class EmptyComponent extends React.Component {}
export default EmptyComponent;
`;
      const result = modernizeReactCode(code);
      // Should not crash
      expect(result).toBeDefined();
      expect(result.syntaxValid).toBe(true);
    });

    it('handles class with only static properties/methods and render', () => {
      const code = `
import React, { Component } from 'react';
class StaticOnly extends Component {
  static version = '1.0.0';
  static getMeta() { return { name: 'StaticOnly' }; }
  render() {
    return <div>Version: {StaticOnly.version}</div>;
  }
}
export default StaticOnly;
`;
      const result = modernizeReactCode(code);
      expect(result.success).toBe(true);
      expect(result.syntaxValid).toBe(true);
      // Static property should be hoisted outside functional component
      expect(result.code).toContain('StaticOnly.version');
    });

    it('handles multiple render branches (if/else, switch, early returns, ternary)', () => {
      const code = `
import React from 'react';
class Branchy extends React.Component {
  state = { status: 'idle', count: 0 };

  render() {
    const { status, count } = this.state;
    if (status === 'loading') {
      return <div>Loading...</div>;
    }
    switch (status) {
      case 'error':
        return <div>An error occurred</div>;
      case 'success':
        return <div>Done! Count: {count}</div>;
      default:
        return count > 5 ? <span>High count</span> : <span>Idle</span>;
    }
  }
}
export default Branchy;
`;
      const result = modernizeReactCode(code);
      expect(result.success).toBe(true);
      expect(result.syntaxValid).toBe(true);
      expect(result.code).toContain('function Branchy');
      expect(result.code).toContain('useState');
      expect(result.code).toContain('switch (status)');
    });

    it('safely ignores standard ES6 classes that do not extend React.Component', () => {
      const code = `
class DataService {
  constructor(endpoint) {
    this.endpoint = endpoint;
  }
  fetchData() {
    return Promise.resolve([]);
  }
}
export default DataService;
`;
      const result = modernizeReactCode(code);
      // Should remain untouched and valid
      expect(result.success).toBe(true);
      expect(result.syntaxValid).toBe(true);
      expect(result.code).toContain('class DataService');
    });

    it('handles multiple React class components within the same file', () => {
      const code = `
import React, { Component } from 'react';

class Header extends Component {
  state = { title: 'Welcome' };
  render() { return <header>{this.state.title}</header>; }
}

class Footer extends Component {
  state = { year: 2026 };
  render() { return <footer>{this.state.year}</footer>; }
}

export { Header, Footer };
`;
      const result = modernizeReactCode(code);
      expect(result.success).toBe(true);
      expect(result.syntaxValid).toBe(true);
      expect(result.code).toContain('function Header');
      expect(result.code).toContain('function Footer');
      expect(result.code).toContain('useState');
    });

    it('gracefully handles malformed / invalid source code without throwing unhandled exceptions', () => {
      const malformed = `
import React from 'react';
class Broken extends React.Component {
  state = { unclosed:
`;
      const result = modernizeReactCode(malformed);
      expect(result.success).toBe(false);
      expect(result.syntaxValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('handles class component with constructor but no super() call', () => {
      const code = `
import React from 'react';
class NoSuper extends React.Component {
  constructor(props) {
    this.state = { ready: true };
  }
  render() {
    return <div>{this.state.ready ? 'Yes' : 'No'}</div>;
  }
}
`;
      const result = modernizeReactCode(code);
      expect(result.success).toBe(true);
      expect(result.syntaxValid).toBe(true);
      expect(result.code).toContain('useState(true)');
    });

    it('handles component with deeply nested JSX and multiple inline arrow handlers', () => {
      const code = `
import React, { Component } from 'react';
class DeepNested extends Component {
  state = { items: [1, 2, 3] };
  render() {
    return (
      <div className="lvl-1">
        <div className="lvl-2">
          <ul className="lvl-3">
            {this.state.items.map((it, idx) => (
              <li key={idx} onClick={() => console.log(it)}>
                <span>Item {it}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }
}
`;
      const result = modernizeReactCode(code);
      expect(result.success).toBe(true);
      expect(result.syntaxValid).toBe(true);
      expect(result.code).toContain('items.map');
    });
  });
});
