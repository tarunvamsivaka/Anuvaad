import { describe, it, expect } from 'vitest';
import { modernizeReactCode, validateTransformedCode } from '../engine';

describe('AST Codemod Rules Matrix (40 Deterministic Rules)', () => {
  // =========================================================================
  // CATEGORY 1: State Conversion (Rules 01 - 07)
  // =========================================================================
  describe('Category 1: State Conversion', () => {
    it('Rule 01: transforms constructor this.state scalar initialization to useState', () => {
      const code = `
import React, { Component } from 'react';
class Counter extends Component {
  constructor(props) {
    super(props);
    this.state = { count: 0 };
  }
  render() { return <div>{this.state.count}</div>; }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(res.code).toContain('const [count, setCount] = useState(0);');
      expect(validateTransformedCode(res.code).isValid).toBe(true);
    });

    it('Rule 01b: transforms multi-property constructor state into distinct useState hooks', () => {
      const code = `
import React, { Component } from 'react';
class Profile extends Component {
  constructor(props) {
    super(props);
    this.state = { name: 'Alice', age: 30, isActive: true };
  }
  render() { return <div>{this.state.name}</div>; }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(res.code).toContain('const [name, setName] = useState(\'Alice\');');
      expect(res.code).toContain('const [age, setAge] = useState(30);');
      expect(res.code).toContain('const [isActive, setIsActive] = useState(true);');
      expect(res.stats.stateVariables).toBe(3);
    });

    it('Rule 02: transforms class property state = { ... } to useState', () => {
      const code = `
import React, { Component } from 'react';
class Toggle extends Component {
  state = { open: false };
  render() { return <div>{this.state.open ? 'Open' : 'Closed'}</div>; }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(res.code).toContain('const [open, setOpen] = useState(false);');
      expect(res.code).toContain('{open ?');
    });

    it('Rule 02b: transforms complex array and null class property state', () => {
      const code = `
import React, { Component } from 'react';
class ListHolder extends Component {
  state = { items: [], selected: null };
  render() { return <ul>{this.state.items.length}</ul>; }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(res.code).toContain('const [items, setItems] = useState([]);');
      expect(res.code).toContain('const [selected, setSelected] = useState(null);');
    });

    it('Rule 03: rewrites single-property this.setState to direct setter call', () => {
      const code = `
import React, { Component } from 'react';
class Stepper extends Component {
  state = { step: 1 };
  next = () => { this.setState({ step: 2 }); };
  render() { return <button onClick={this.next}>{this.state.step}</button>; }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(res.code).toContain('setStep(2)');
      expect(res.code).not.toContain('this.setState');
    });

    it('Rule 03b: rewrites this.setState passing variables and expressions', () => {
      const code = `
import React, { Component } from 'react';
class QueryInput extends Component {
  state = { query: '' };
  update = (val) => { this.setState({ query: val.trim() }); };
  render() { return <input value={this.state.query} />; }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(res.code).toContain('setQuery(val.trim())');
    });

    it('Rule 04: decomposes multi-property this.setState into sequential setter calls', () => {
      const code = `
import React, { Component } from 'react';
class Form extends Component {
  state = { a: 1, b: 2 };
  reset = () => { this.setState({ a: 0, b: 0 }); };
  render() { return <div>{this.state.a}</div>; }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(res.code).toContain('setA(0)');
      expect(res.code).toContain('setB(0)');
    });

    it('Rule 05: detects functional updater this.setState(prev => ...)', () => {
      const code = `
import React, { Component } from 'react';
class Counter extends Component {
  state = { count: 0 };
  inc = () => { this.setState((prev) => ({ count: prev.count + 1 })); };
  render() { return <button onClick={this.inc}>{this.state.count}</button>; }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(res.code).toContain('const [count, setCount] = useState(0);');
      expect(validateTransformedCode(res.code).isValid).toBe(true);
    });

    it('Rule 06: handles functional updater referencing props', () => {
      const code = `
import React, { Component } from 'react';
class Score extends Component {
  state = { total: 0 };
  add = () => { this.setState((prev, props) => ({ total: prev.total + props.step })); };
  render() { return <div>{this.state.total}</div>; }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(res.code).toContain('function Score(props)');
      expect(validateTransformedCode(res.code).isValid).toBe(true);
    });

    it('Rule 07: processes setState with callback parameter', () => {
      const code = `
import React, { Component } from 'react';
class CallbackTest extends Component {
  state = { loaded: false };
  done = () => { this.setState({ loaded: true }, () => console.log('Ready')); };
  render() { return <div>{this.state.loaded ? 'Yes' : 'No'}</div>; }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(res.code).toContain('setLoaded(true)');
    });
  });

  // =========================================================================
  // CATEGORY 2: State & Prop Access Migration (Rules 08 - 10)
  // =========================================================================
  describe('Category 2: State & Prop Access Migration', () => {
    it('Rule 08: rewrites this.state.x to scoped identifier x in JSX attributes and children', () => {
      const code = `
import React, { Component } from 'react';
class Badge extends Component {
  state = { text: 'Active', color: 'green' };
  render() {
    return <span style={{ color: this.state.color }}>{this.state.text}</span>;
  }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(res.code).toContain('color: color');
      expect(res.code).toContain('{text}');
      expect(res.code).not.toContain('this.state.color');
      expect(res.code).not.toContain('this.state.text');
    });

    it('Rule 08b: rewrites this.state in conditions and logical expressions', () => {
      const code = `
import React, { Component } from 'react';
class Guard extends Component {
  state = { isAllowed: false };
  render() {
    if (!this.state.isAllowed) return <p>Access Denied</p>;
    return <h1>Secret</h1>;
  }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(res.code).toContain('if (!isAllowed)');
      expect(res.code).not.toContain('this.state.isAllowed');
    });

    it('Rule 09: prunes redundant const { a, b } = this.state declarations from render', () => {
      const code = `
import React, { Component } from 'react';
class Destruct extends Component {
  state = { title: 'Report', count: 42 };
  render() {
    const { title, count } = this.state;
    return <div>{title}: {count}</div>;
  }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(res.code).toContain('const [title, setTitle] = useState(\'Report\');');
      expect(res.code).toContain('const [count, setCount] = useState(42);');
      expect(res.code).not.toContain('this.state');
    });

    it('Rule 10: rewrites this.props.x to props.x', () => {
      const code = `
import React, { Component } from 'react';
class Greeting extends Component {
  render() {
    return <h1>Hello, {this.props.name} ({this.props.role})</h1>;
  }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(res.code).toContain('function Greeting(props)');
      expect(res.code).toContain('props.name');
      expect(res.code).toContain('props.role');
      expect(res.code).not.toContain('this.props');
    });

    it('Rule 10b: rewrites this.props spread {...this.props} to {...props}', () => {
      const code = `
import React, { Component } from 'react';
class Wrapper extends Component {
  render() {
    return <div className="wrap" {...this.props} />;
  }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(res.code).toContain('{...props}');
      expect(res.code).not.toContain('this.props');
    });
  });

  // =========================================================================
  // CATEGORY 3: Lifecycle Hooks Mapping (Rules 11 - 18)
  // =========================================================================
  describe('Category 3: Lifecycle Hooks Mapping', () => {
    it('Rule 11: maps isolated componentDidMount to useEffect with empty dependency array', () => {
      const code = `
import React, { Component } from 'react';
class MountOnly extends Component {
  componentDidMount() {
    console.log('Mounted');
  }
  render() { return <div>Mount</div>; }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(res.code).toContain('useEffect(() => {');
      expect(res.code).toContain("console.log('Mounted');");
      expect(res.code).toContain('}, []);');
      expect(res.stats.effects).toBe(1);
    });

    it('Rule 12: maps isolated componentWillUnmount to useEffect cleanup function', () => {
      const code = `
import React, { Component } from 'react';
class UnmountOnly extends Component {
  componentWillUnmount() {
    console.log('Cleanup');
  }
  render() { return <div>Unmount</div>; }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(res.code).toContain('useEffect(() => {');
      expect(res.code).toContain("console.log('Cleanup');");
      expect(res.code).toContain('}, []);');
    });

    it('Rule 13: unifies componentDidMount and componentWillUnmount into single useEffect', () => {
      const code = `
import React, { Component } from 'react';
class Sub extends Component {
  componentDidMount() {
    window.addEventListener('resize', this.handleResize);
  }
  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
  }
  handleResize = () => {};
  render() { return <div>Resize</div>; }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(res.stats.effects).toBe(1);
      expect(res.code).toContain("window.addEventListener('resize', handleResize);");
      expect(res.code).toContain("window.removeEventListener('resize', handleResize);");
      expect(res.code).toContain('}, []);');
    });

    it('Rule 14: converts componentDidUpdate to useEffect hook', () => {
      const code = `
import React, { Component } from 'react';
class Updater extends Component {
  componentDidUpdate() {
    console.log('Updated');
  }
  render() { return <div>Update</div>; }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(res.code).toContain('useEffect(() => {');
      expect(res.code).toContain("console.log('Updated');");
    });

    it('Rule 15: preserves getDerivedStateFromProps logic in component', () => {
      const code = `
import React, { Component } from 'react';
class Derived extends Component {
  state = { fullName: '' };
  static getDerivedStateFromProps(props, state) {
    return { fullName: props.first + ' ' + props.last };
  }
  render() { return <div>{this.state.fullName}</div>; }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(res.code).toContain('fullName');
      expect(res.code).toContain("props.first + ' ' + props.last");
    });

    it('Rule 16: converts getSnapshotBeforeUpdate without syntax error', () => {
      const code = `
import React, { Component } from 'react';
class SnapshotComp extends Component {
  getSnapshotBeforeUpdate(prevProps, prevState) {
    return 100;
  }
  render() { return <div>Snapshot</div>; }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(res.code).toContain('useLayoutEffect');
      expect(res.code).toContain('useRef');
      expect(validateTransformedCode(res.code).isValid).toBe(true);
    });

    it('Rule 17: transforms shouldComponentUpdate without crashing', () => {
      const code = `
import React, { Component } from 'react';
class FastComp extends Component {
  shouldComponentUpdate(nextProps) {
    return nextProps.id !== this.props.id;
  }
  render() { return <div>{this.props.id}</div>; }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(res.code).toContain('React.memo');
      expect(res.code).toContain('prevProps.id === nextProps.id');
      expect(validateTransformedCode(res.code).isValid).toBe(true);
    });

    it('Rule 18: catches componentDidCatch or handles error boundary diagnostics', () => {
      const code = `
import React, { Component } from 'react';
class ErrorBoundary extends Component {
  state = { hasError: false };
  componentDidCatch(err, info) {
    console.error(err, info);
  }
  render() {
    if (this.state.hasError) return <h1>Error</h1>;
    return this.props.children;
  }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(validateTransformedCode(res.code).isValid).toBe(true);
    });
  });

  // =========================================================================
  // CATEGORY 4: Instance Variables & Refs (Rules 19 - 25)
  // =========================================================================
  describe('Category 4: Instance Variables & Refs', () => {
    it('Rule 19: transforms class property React.createRef() to useRef(null)', () => {
      const code = `
import React, { Component } from 'react';
class InputBox extends Component {
  inputRef = React.createRef();
  render() { return <input ref={this.inputRef} />; }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(res.code).toContain('const inputRef = useRef(null);');
      expect(res.code).toContain('ref={inputRef}');
      expect(res.code).toContain('useRef');
    });

    it('Rule 20: transforms constructor this.myRef = React.createRef() to useRef', () => {
      const code = `
import React, { Component } from 'react';
class Box extends Component {
  constructor(props) {
    super(props);
    this.boxRef = React.createRef();
  }
  render() { return <div ref={this.boxRef}>Box</div>; }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(res.code).toContain('const boxRef = useRef(null);');
      expect(res.code).toContain('ref={boxRef}');
    });

    it('Rule 21: transforms multiple refs in a single component', () => {
      const code = `
import React, { Component } from 'react';
class DualRef extends Component {
  topRef = React.createRef();
  bottomRef = React.createRef();
  render() {
    return (
      <div>
        <div ref={this.topRef} />
        <div ref={this.bottomRef} />
      </div>
    );
  }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(res.code).toContain('const topRef = useRef(null);');
      expect(res.code).toContain('const bottomRef = useRef(null);');
      expect(res.code).toContain('ref={topRef}');
      expect(res.code).toContain('ref={bottomRef}');
    });

    it('Rule 22: rewrites this.ref reads to scoped identifier in methods', () => {
      const code = `
import React, { Component } from 'react';
class FocusButton extends Component {
  buttonRef = React.createRef();
  focus = () => {
    if (this.buttonRef.current) this.buttonRef.current.focus();
  };
  render() { return <button ref={this.buttonRef} onClick={this.focus}>Click</button>; }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(res.code).toContain('buttonRef.current.focus()');
      expect(res.code).not.toContain('this.buttonRef');
    });

    it('Rule 23: transforms TypeScript generic createRef<HTMLInputElement>()', () => {
      const code = `
import React, { Component } from 'react';
class TypedRefComp extends Component {
  myInput = React.createRef<HTMLInputElement>();
  render() { return <input ref={this.myInput} />; }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(res.code).toContain('const myInput = useRef(null);');
      expect(res.code).toContain('ref={myInput}');
    });
  });

  // =========================================================================
  // CATEGORY 5: Method Binding & Methods (Rules 26 - 29)
  // =========================================================================
  describe('Category 5: Method Binding & Methods', () => {
    it('Rule 26: prunes redundant this.handleClick = this.handleClick.bind(this)', () => {
      const code = `
import React, { Component } from 'react';
class BoundButton extends Component {
  constructor(props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);
    this.handleOther = this.handleOther.bind(this);
  }
  handleClick() { console.log('clicked'); }
  handleOther() { console.log('other'); }
  render() { return <button onClick={this.handleClick}>Press</button>; }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(res.code).not.toContain('.bind(this)');
      expect(res.code).not.toContain('this.handleClick');
      expect(res.code).toContain('onClick={handleClick}');
    });

    it('Rule 27: transforms arrow function class properties to const arrow functions', () => {
      const code = `
import React, { Component } from 'react';
class Arrows extends Component {
  onSave = (e) => { e.preventDefault(); };
  render() { return <form onSubmit={this.onSave} />; }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(res.code).toContain('const onSave = e => {');
      expect(res.code).toContain('onSubmit={onSave}');
    });

    it('Rule 27b: preserves async arrow function class properties', () => {
      const code = `
import React, { Component } from 'react';
class AsyncArrow extends Component {
  loadData = async () => {
    await fetch('/api');
  };
  render() { return <button onClick={this.loadData}>Load</button>; }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(res.code).toContain('const loadData = async () => {');
      expect(res.code).toContain('onClick={loadData}');
    });

    it('Rule 28: transforms regular class methods to function declarations', () => {
      const code = `
import React, { Component } from 'react';
class StandardMethod extends Component {
  computeSum(a, b) {
    return a + b;
  }
  render() { return <div>{this.computeSum(1, 2)}</div>; }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(res.code).toContain('function computeSum(a, b)');
      expect(res.code).toContain('computeSum(1, 2)');
    });

    it('Rule 28b: preserves async regular class methods', () => {
      const code = `
import React, { Component } from 'react';
class AsyncMethod extends Component {
  async doAsync() {
    return true;
  }
  render() { return <div>Async</div>; }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(res.code).toContain('async function doAsync()');
    });

    it('Rule 29: rewrites method calls inside other methods from this.m() to m()', () => {
      const code = `
import React, { Component } from 'react';
class Chained extends Component {
  step1() { return 1; }
  step2() { return this.step1() + 1; }
  render() { return <div>{this.step2()}</div>; }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(res.code).toContain('step1() + 1');
      expect(res.code).not.toContain('this.step1()');
    });
  });

  // =========================================================================
  // CATEGORY 6: Context API (Rules 30 - 32)
  // =========================================================================
  describe('Category 6: Context API', () => {
    it('Rule 30: processes static contextType correctly', () => {
      const code = `
import React, { Component } from 'react';
import { ThemeContext } from './theme';
class ThemedView extends Component {
  static contextType = ThemeContext;
  render() { return <div className={this.context.theme}>Theme</div>; }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(res.code).toContain('const context = useContext(ThemeContext);');
      expect(res.code).toContain('useContext');
      expect(validateTransformedCode(res.code).isValid).toBe(true);
    });

    it('Rule 31: preserves context in render tree', () => {
      const code = `
import React, { Component } from 'react';
import { AuthContext } from './auth';
class ConsumerComp extends Component {
  static contextType = AuthContext;
  render() {
    const user = this.context.user;
    return <section>{this.context.isAuthenticated ? user.name : 'Guest'}</section>;
  }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(res.code).toContain('const user = context.user;');
      expect(res.code).toContain('context.isAuthenticated');
      expect(res.code).not.toContain('this.context');
    });
  });

  // =========================================================================
  // CATEGORY 7: Component Signature & Optimization (Rules 33 - 35)
  // =========================================================================
  describe('Category 7: Component Signature & Optimization', () => {
    it('Rule 33: converts class extending React.Component to function declaration', () => {
      const code = `
import React from 'react';
class CardView extends React.Component {
  render() { return <div>Card</div>; }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(res.code).toContain('function CardView(props)');
      expect(res.code).not.toContain('class CardView');
    });

    it('Rule 33b: preserves export default class Component', () => {
      const code = `
import React, { Component } from 'react';
export default class PageView extends Component {
  render() { return <main>Page</main>; }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(res.code).toContain('function PageView(props)');
      expect(res.code).toContain('export default');
    });

    it('Rule 34: converts React.PureComponent with valid functional component output', () => {
      const code = `
import React from 'react';
class PureWidget extends React.PureComponent {
  state = { count: 0 };
  render() { return <div>{this.state.count}</div>; }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(res.code).toContain('function PureWidget(props)');
      expect(res.code).toContain('const [count, setCount] = useState(0);');
    });

    it('Rule 35: handles forceUpdate invocation gracefully without syntax corruption', () => {
      const code = `
import React, { Component } from 'react';
class ReRenderer extends Component {
  refresh = () => { this.forceUpdate(); };
  render() { return <button onClick={this.refresh}>Refresh</button>; }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(validateTransformedCode(res.code).isValid).toBe(true);
    });
  });

  // =========================================================================
  // CATEGORY 8: TypeScript & Generics (Rules 36 - 38)
  // =========================================================================
  describe('Category 8: TypeScript & Generics', () => {
    it('Rule 36: extracts Component<Props> generic and annotates props param', () => {
      const code = `
import React, { Component } from 'react';
interface ButtonProps {
  label: string;
  onClick: () => void;
}
class CustomButton extends Component<ButtonProps> {
  render() {
    return <button onClick={this.props.onClick}>{this.props.label}</button>;
  }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(res.code).toContain('function CustomButton(props: ButtonProps)');
      expect(res.code).toContain('props.label');
      expect(res.code).toContain('props.onClick');
    });

    it('Rule 37: extracts Component<Props, State> generics while retaining Props typing', () => {
      const code = `
import React, { Component } from 'react';
interface PanelProps {
  header: string;
}
interface PanelState {
  collapsed: boolean;
}
class CollapsiblePanel extends Component<PanelProps, PanelState> {
  state = { collapsed: true };
  render() {
    return <div>{this.props.header}: {this.state.collapsed ? 'Closed' : 'Open'}</div>;
  }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(res.code).toContain('function CollapsiblePanel(props: PanelProps)');
      expect(res.code).toContain('const [collapsed, setCollapsed] = useState(true);');
      expect(res.code).toContain('{props.header}');
    });

    it('Rule 38: preserves interface declarations and module-level types verbatim', () => {
      const code = `
import React, { Component } from 'react';
export type Variant = 'primary' | 'secondary';
export interface TagProps {
  text: string;
  variant?: Variant;
}
class Tag extends Component<TagProps> {
  render() { return <span className={this.props.variant}>{this.props.text}</span>; }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(res.code).toContain("export type Variant = 'primary' | 'secondary';");
      expect(res.code).toContain('export interface TagProps');
      expect(res.code).toContain('function Tag(props: TagProps)');
    });
  });

  // =========================================================================
  // CATEGORY 9: Statics, defaultProps & Imports (Rules 39 - 40)
  // =========================================================================
  describe('Category 9: Statics, defaultProps & Imports', () => {
    it('Rule 39: preserves defaultProps assignments without breaking AST', () => {
      const code = `
import React, { Component } from 'react';
class Dialog extends Component {
  static defaultProps = {
    title: 'Default Dialog',
  };
  render() { return <div>{this.props.title}</div>; }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(res.code).toContain("title = 'Default Dialog'");
      expect(validateTransformedCode(res.code).isValid).toBe(true);
    });

    it('Rule 40: injects missing useState, useEffect, useRef imports from react', () => {
      const code = `
import React, { Component } from 'react';
class FullHooks extends Component {
  myRef = React.createRef();
  state = { num: 1 };
  componentDidMount() { console.log('mounted'); }
  render() { return <div ref={this.myRef}>{this.state.num}</div>; }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(res.code).toContain('useState');
      expect(res.code).toContain('useEffect');
      expect(res.code).toContain('useRef');
      expect(res.code).not.toContain('Component');
    });

    it('Rule 40b: adds react import at top if no react import was present initially', () => {
      const code = `
class Standalone extends React.Component {
  state = { active: false };
  render() { return <div>{this.state.active ? 'Yes' : 'No'}</div>; }
}
`;
      const res = modernizeReactCode(code);
      expect(res.success).toBe(true);
      expect(res.code).toContain("from 'react'");
      expect(res.code).toContain('useState');
    });
  });
});
