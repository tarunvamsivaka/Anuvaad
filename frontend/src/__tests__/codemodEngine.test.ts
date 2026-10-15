import { describe, it, expect } from 'vitest';
import { modernizeReactCode } from '../engine';

describe('Anuvaad Codemod Engine (React Class -> Hooks)', () => {
  // Existing baseline tests
  it('transforms a basic class component with render', () => {
    const input = `
import React, { Component } from 'react';

export class SimpleCard extends Component {
  render() {
    return <div className="card">Hello World</div>;
  }
}
`;

    const result = modernizeReactCode(input);
    expect(result.success).toBe(true);
    expect(result.syntaxValid).toBe(true);
    expect(result.code).toContain('export function SimpleCard(props)');
    expect(result.code).toContain('return <div className="card">Hello World</div>;');
    expect(result.code).not.toContain('class SimpleCard');
    expect(result.code).not.toContain('extends Component');
  });

  it('transforms constructor this.state to useState hooks and rewrites this.state & this.setState', () => {
    const input = `
import React, { Component } from 'react';

class Counter extends Component {
  constructor(props) {
    super(props);
    this.state = {
      count: 0,
      active: true,
    };
  }

  increment = () => {
    this.setState({ count: 10 });
  };

  render() {
    return (
      <div>
        <span>{this.state.count}</span>
        <button onClick={this.increment}>Add</button>
      </div>
    );
  }
}
`;

    const result = modernizeReactCode(input);
    expect(result.success).toBe(true);
    expect(result.code).toContain('const [count, setCount] = useState(0);');
    expect(result.code).toContain('const [active, setActive] = useState(true);');
    expect(result.code).toContain('setCount(10)');
    expect(result.code).toContain('<span>{count}</span>');
    expect(result.code).toContain('onClick={increment}');
    expect(result.stats.stateVariables).toBe(2);
  });

  it('transforms property-initialized state and lifecycles to useEffect', () => {
    const input = `
import React, { Component } from 'react';

class Timer extends Component {
  state = {
    seconds: 0,
  };

  componentDidMount() {
    console.log('Timer mounted');
  }

  componentWillUnmount() {
    console.log('Timer unmounted');
  }

  render() {
    return <h1>Seconds: {this.state.seconds}</h1>;
  }
}
`;

    const result = modernizeReactCode(input);
    expect(result.success).toBe(true);
    expect(result.code).toContain('const [seconds, setSeconds] = useState(0);');
    expect(result.code).toContain('useEffect(() => {');
    expect(result.code).toContain("console.log('Timer mounted');");
    expect(result.code).toContain("console.log('Timer unmounted');");
    expect(result.code).toContain('}, []);');
    expect(result.stats.effects).toBe(1);
  });

  it('transforms this.props references to props param and preserves TypeScript types', () => {
    const input = `
import React, { Component } from 'react';

interface UserProps {
  name: string;
  age: number;
}

interface UserState {
  online: boolean;
}

class UserBadge extends Component<UserProps, UserState> {
  state = {
    online: false,
  };

  render() {
    return (
      <div>
        <h2>{this.props.name} ({this.props.age})</h2>
        <p>Status: {this.state.online ? 'Online' : 'Offline'}</p>
      </div>
    );
  }
}
`;

    const result = modernizeReactCode(input);
    expect(result.success).toBe(true);
    expect(result.code).toContain('function UserBadge(props: UserProps)');
    expect(result.code).toContain('{props.name}');
    expect(result.code).toContain('{props.age}');
    expect(result.code).toContain('{online ?');
    expect(result.code).not.toContain('this.props');
    expect(result.code).not.toContain('this.state');
  });

  it('transforms export default class component correctly', () => {
    const input = `
import React, { Component } from 'react';

export default class MainDashboard extends Component {
  render() {
    return <section>Dashboard Content</section>;
  }
}
`;
    const result = modernizeReactCode(input);
    expect(result.success).toBe(true);
    expect(result.code).toContain('function MainDashboard(props)');
    expect(result.code).toContain('return <section>Dashboard Content</section>;');
  });

  it('transforms React.PureComponent with custom handlers', () => {
    const input = `
import React from 'react';

class UserItem extends React.PureComponent {
  state = { expanded: false };

  toggle = () => {
    this.setState({ expanded: true });
  };

  render() {
    return (
      <div onClick={this.toggle}>
        {this.state.expanded ? 'Expanded' : 'Collapsed'}
      </div>
    );
  }
}
`;
    const result = modernizeReactCode(input);
    expect(result.success).toBe(true);
    expect(result.code).toContain('const [expanded, setExpanded] = useState(false);');
    expect(result.code).toContain('onClick={toggle}');
    expect(result.code).toContain('{expanded ?');
  });

  it('runs deterministically under 100ms in RAM', () => {
    const input = `
import React from 'react';

class PerfTest extends React.Component {
  state = { a: 1, b: 2, c: 3 };
  componentDidMount() {}
  handleClick = () => { this.setState({ a: 2 }); };
  render() { return <div>{this.state.a}</div>; }
}
`;
    const result = modernizeReactCode(input);
    expect(result.success).toBe(true);
    expect(result.stats.timeMs).toBeLessThan(100);
  });

  // ==========================================
  // Comprehensive 40 Deterministic Rules Tests
  // ==========================================

  describe('Category 1: State Conversion (Rules 1-7)', () => {
    it('Rule 01: Constructor state initialization with multiple fields', () => {
      const input = `
import React, { Component } from 'react';
class Counter extends Component {
  constructor(props) {
    super(props);
    this.state = { count: 0, title: 'App' };
  }
  render() { return <div>{this.state.count} - {this.state.title}</div>; }
}
`;
      const result = modernizeReactCode(input);
      expect(result.success).toBe(true);
      expect(result.code).toContain('const [count, setCount] = useState(0);');
      expect(result.code).toContain("const [title, setTitle] = useState('App');");
      expect(result.code).not.toContain('this.state');
    });

    it('Rule 02: Class property state initialization', () => {
      const input = `
import React, { Component } from 'react';
class Modal extends Component {
  state = { isOpen: false, data: null };
  render() { return <div>{this.state.isOpen ? 'Open' : 'Closed'}</div>; }
}
`;
      const result = modernizeReactCode(input);
      expect(result.success).toBe(true);
      expect(result.code).toContain('const [isOpen, setIsOpen] = useState(false);');
      expect(result.code).toContain('const [data, setData] = useState(null);');
    });

    it('Rule 03: Single-property this.setState', () => {
      const input = `
import React, { Component } from 'react';
class Step extends Component {
  state = { step: 1 };
  next = () => { this.setState({ step: 2 }); };
  render() { return <button onClick={this.next}>{this.state.step}</button>; }
}
`;
      const result = modernizeReactCode(input);
      expect(result.success).toBe(true);
      expect(result.code).toContain('setStep(2)');
    });

    it('Rule 04: Multi-property this.setState in statement & expression contexts', () => {
      const input = `
import React, { Component } from 'react';
class Form extends Component {
  state = { name: '', age: 0 };
  reset = () => {
    this.setState({ name: 'Default', age: 18 });
  };
  render() { return <div>{this.state.name}</div>; }
}
`;
      const result = modernizeReactCode(input);
      expect(result.success).toBe(true);
      expect(result.code).toMatch(/setName\(['"]Default['"]\)/);
      expect(result.code).toMatch(/setAge\(18\)/);
    });

    it('Rule 05: Functional updater this.setState(prev => ...)', () => {
      const input = `
import React, { Component } from 'react';
class Counter extends Component {
  state = { count: 0 };
  increment = () => {
    this.setState(prev => ({ count: prev.count + 1 }));
  };
  render() { return <div>{this.state.count}</div>; }
}
`;
      const result = modernizeReactCode(input);
      expect(result.success).toBe(true);
      expect(result.code).toContain('setCount(prevCount => prevCount + 1)');
    });

    it('Rule 06: Functional updater with props this.setState((prev, props) => ...)', () => {
      const input = `
import React, { Component } from 'react';
class Stepper extends Component {
  state = { total: 0 };
  step = () => {
    this.setState((prev, props) => ({ total: prev.total + props.step }));
  };
  render() { return <div>{this.state.total}</div>; }
}
`;
      const result = modernizeReactCode(input);
      expect(result.success).toBe(true);
      expect(result.code).toContain('setTotal(prevTotal => prevTotal + props.step)');
    });

    it('Rule 07: this.setState completion callback', () => {
      const input = `
import React, { Component } from 'react';
class Notifier extends Component {
  state = { ready: false };
  send = () => {
    this.setState({ ready: true }, () => console.log('Ready!'));
  };
  render() { return <div>{this.state.ready}</div>; }
}
`;
      const result = modernizeReactCode(input);
      expect(result.success).toBe(true);
      expect(result.code).toContain('setReady(true)');
      expect(result.code).toContain("console.log('Ready!')");
    });
  });

  describe('Category 2: State & Prop Access (Rules 8-10)', () => {
    it('Rule 08: Direct state member expression read (this.state.x)', () => {
      const input = `
import React, { Component } from 'react';
class View extends Component {
  state = { title: 'Home', count: 42 };
  render() { return <h1>{this.state.title}: {this.state.count}</h1>; }
}
`;
      const result = modernizeReactCode(input);
      expect(result.success).toBe(true);
      expect(result.code).toContain('{title}: {count}');
      expect(result.code).not.toContain('this.state');
    });

    it('Rule 09: Destructured state assignment elimination and alias conversion', () => {
      const input = `
import React, { Component } from 'react';
class View extends Component {
  state = { count: 1, active: true };
  render() {
    const { count, active } = this.state;
    const { count: c } = this.state;
    return <div>{count} {c} {active}</div>;
  }
}
`;
      const result = modernizeReactCode(input);
      expect(result.success).toBe(true);
      expect(result.code).not.toContain('const { count, active } = this.state');
      expect(result.code).toContain('const c = count;');
    });

    it('Rule 10: this.props migration and prop spreading', () => {
      const input = `
import React, { Component } from 'react';
class Card extends Component {
  render() {
    return (
      <div title={this.props.title} {...this.props}>
        <span>{this.props.label}</span>
      </div>
    );
  }
}
`;
      const result = modernizeReactCode(input);
      expect(result.success).toBe(true);
      expect(result.code).toContain('title={props.title}');
      expect(result.code).toContain('{...props}');
      expect(result.code).toContain('{props.label}');
      expect(result.code).not.toContain('this.props');
    });
  });

  describe('Category 3: Lifecycle Hooks (Rules 11-18)', () => {
    it('Rule 11: componentDidMount isolated hook mapping (and async handling)', () => {
      const input = `
import React, { Component } from 'react';
class AsyncFetcher extends Component {
  async componentDidMount() {
    const res = await fetch('/api');
    console.log(res);
  }
  render() { return <div>Loaded</div>; }
}
`;
      const result = modernizeReactCode(input);
      expect(result.success).toBe(true);
      expect(result.code).toContain('useEffect(() => {');
      expect(result.code).toContain("fetch('/api')");
      expect(result.code).toContain('}, []);');
    });

    it('Rule 12: componentWillUnmount isolated hook mapping', () => {
      const input = `
import React, { Component } from 'react';
class Listener extends Component {
  componentWillUnmount() {
    window.removeEventListener('scroll', this.onScroll);
  }
  render() { return <div>Listener</div>; }
}
`;
      const result = modernizeReactCode(input);
      expect(result.success).toBe(true);
      expect(result.code).toContain('useEffect(() => {');
      expect(result.code).toContain("return () => {");
      expect(result.code).toContain("removeEventListener('scroll'");
      expect(result.code).toContain('}, []);');
    });

    it('Rule 13: Mount + Unmount unification into single useEffect', () => {
      const input = `
import React, { Component } from 'react';
class Subscriber extends Component {
  componentDidMount() {
    window.addEventListener('online', this.handleOnline);
  }
  componentWillUnmount() {
    window.removeEventListener('online', this.handleOnline);
  }
  render() { return <div>Sub</div>; }
}
`;
      const result = modernizeReactCode(input);
      expect(result.success).toBe(true);
      expect(result.code).toContain("addEventListener('online'");
      expect(result.code).toContain("removeEventListener('online'");
      expect(result.stats.effects).toBe(1);
    });

    it('Rule 14: componentDidUpdate diff guard extraction to dependency array', () => {
      const input = `
import React, { Component } from 'react';
class UserWatcher extends Component {
  componentDidUpdate(prevProps) {
    if (prevProps.userId !== this.props.userId) {
      console.log('User changed', this.props.userId);
    }
  }
  render() { return <div>{this.props.userId}</div>; }
}
`;
      const result = modernizeReactCode(input);
      expect(result.success).toBe(true);
      expect(result.code).toContain('useEffect(() => {');
      expect(result.code).toContain('[props.userId]');
    });

    it('Rule 15: getDerivedStateFromProps inlining', () => {
      const input = `
import React, { Component } from 'react';
class Profile extends Component {
  state = { fullName: '' };
  static getDerivedStateFromProps(props, state) {
    return { fullName: props.first + ' ' + props.last };
  }
  render() { return <div>{this.state.fullName}</div>; }
}
`;
      const result = modernizeReactCode(input);
      expect(result.success).toBe(true);
      expect(result.code).toContain("fullName");
    });

    it('Rule 16: getSnapshotBeforeUpdate to useLayoutEffect', () => {
      const input = `
import React, { Component } from 'react';
class ScrollList extends Component {
  getSnapshotBeforeUpdate(prevProps, prevState) {
    return 100;
  }
  render() { return <div>List</div>; }
}
`;
      const result = modernizeReactCode(input);
      expect(result.success).toBe(true);
      expect(result.code).toContain('useLayoutEffect');
      expect(result.code).toContain('useRef');
    });

    it('Rule 17: shouldComponentUpdate to React.memo with comparator', () => {
      const input = `
import React, { Component } from 'react';
class PureRow extends Component {
  shouldComponentUpdate(nextProps) {
    return nextProps.id !== this.props.id;
  }
  render() { return <div>{this.props.id}</div>; }
}
`;
      const result = modernizeReactCode(input);
      expect(result.success).toBe(true);
      expect(result.code).toContain('React.memo');
      expect(result.code).toContain('prevProps.id === nextProps.id');
    });

    it('Rule 18: componentDidCatch Error Boundary diagnostic warning', () => {
      const input = `
import React, { Component } from 'react';
class ErrorBoundary extends Component {
  state = { hasError: false };
  componentDidCatch(error, info) {
    console.error(error, info);
  }
  render() { return this.state.hasError ? <h1>Error</h1> : this.props.children; }
}
`;
      const result = modernizeReactCode(input);
      expect(result.warnings.some(w => w.includes('Error Boundar') || w.includes('componentDidCatch'))).toBe(true);
    });
  });

  describe('Category 4: Instance Variables (Rules 19-22)', () => {
    it('Rule 19: Class field instance property to useRef', () => {
      const input = `
import React, { Component } from 'react';
class TimerComp extends Component {
  timerId = null;
  count = 0;
  render() { return <div>Timer</div>; }
}
`;
      const result = modernizeReactCode(input);
      expect(result.success).toBe(true);
      expect(result.code).toContain('const timerId = useRef(null);');
      expect(result.code).toContain('const count = useRef(0);');
    });

    it('Rule 20: Constructor instance property to useRef', () => {
      const input = `
import React, { Component } from 'react';
class RequestComp extends Component {
  constructor(props) {
    super(props);
    this.controller = new AbortController();
  }
  render() { return <div>Request</div>; }
}
`;
      const result = modernizeReactCode(input);
      expect(result.success).toBe(true);
      expect(result.code).toContain('const controller = useRef(new AbortController());');
    });

    it('Rule 21: Instance property read (this.timer -> timer.current)', () => {
      const input = `
import React, { Component } from 'react';
class CheckTimer extends Component {
  timer = 123;
  check = () => {
    if (this.timer > 0) console.log(this.timer);
  };
  render() { return <button onClick={this.check}>Check</button>; }
}
`;
      const result = modernizeReactCode(input);
      expect(result.success).toBe(true);
      expect(result.code).toContain('timer.current > 0');
      expect(result.code).toContain('console.log(timer.current)');
    });

    it('Rule 22: Instance property write (this.timer = val -> timer.current = val & compound)', () => {
      const input = `
import React, { Component } from 'react';
class AutoInc extends Component {
  counter = 0;
  bump = () => {
    this.counter = 10;
    this.counter += 1;
  };
  render() { return <button onClick={this.bump}>Bump</button>; }
}
`;
      const result = modernizeReactCode(input);
      expect(result.success).toBe(true);
      expect(result.code).toContain('counter.current = 10;');
      expect(result.code).toContain('counter.current += 1;');
    });
  });

  describe('Category 5: Refs (Rules 23-25)', () => {
    it('Rule 23: React.createRef class property to useRef', () => {
      const input = `
import React, { Component } from 'react';
class InputBox extends Component {
  inputRef = React.createRef();
  render() { return <input ref={this.inputRef} />; }
}
`;
      const result = modernizeReactCode(input);
      expect(result.success).toBe(true);
      expect(result.code).toContain('const inputRef = useRef(null);');
      expect(result.code).toContain('ref={inputRef}');
    });

    it('Rule 24: Constructor React.createRef to useRef', () => {
      const input = `
import React, { Component } from 'react';
class FormBox extends Component {
  constructor(props) {
    super(props);
    this.formRef = React.createRef();
  }
  render() { return <form ref={this.formRef} />; }
}
`;
      const result = modernizeReactCode(input);
      expect(result.success).toBe(true);
      expect(result.code).toContain('const formRef = useRef(null);');
      expect(result.code).toContain('ref={formRef}');
    });

    it('Rule 25: Callback ref to useRef', () => {
      const input = `
import React, { Component } from 'react';
class Box extends Component {
  render() {
    return <div ref={el => this.boxElement = el}>Box</div>;
  }
}
`;
      const result = modernizeReactCode(input);
      expect(result.success).toBe(true);
      expect(result.code).toContain('const boxElement = useRef(null);');
      expect(result.code).toContain('ref={boxElement}');
    });
  });

  describe('Category 6: Method Binding & Conversion (Rules 26-29)', () => {
    it('Rule 26: Constructor .bind(this) statement removal', () => {
      const input = `
import React, { Component } from 'react';
class ButtonBar extends Component {
  constructor(props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);
  }
  handleClick() { console.log('clicked'); }
  render() { return <button onClick={this.handleClick}>Click</button>; }
}
`;
      const result = modernizeReactCode(input);
      expect(result.success).toBe(true);
      expect(result.code).not.toContain('.bind(this)');
      expect(result.code).toContain('function handleClick()');
      expect(result.code).toContain('onClick={handleClick}');
    });

    it('Rule 27: Arrow function class property conversion to const function', () => {
      const input = `
import React, { Component } from 'react';
class Header extends Component {
  onSearch = (query) => { console.log(query); };
  render() { return <input onChange={e => this.onSearch(e.target.value)} />; }
}
`;
      const result = modernizeReactCode(input);
      expect(result.success).toBe(true);
      expect(result.code).toMatch(/const onSearch\s*=\s*(\(query\)|query)\s*=>/);
      expect(result.code).toContain('onSearch(e.target.value)');
    });

    it('Rule 28: Standard class methods conversion (async and generator preserved)', () => {
      const input = `
import React, { Component } from 'react';
class DataSync extends Component {
  async fetchData(id) { return fetch('/data/' + id); }
  *numberGenerator() { yield 1; yield 2; }
  render() { return <div>Sync</div>; }
}
`;
      const result = modernizeReactCode(input);
      expect(result.success).toBe(true);
      expect(result.code).toContain('async function fetchData(id)');
      expect(result.code).toContain('function* numberGenerator()');
    });

    it('Rule 29: Method call invocation and JSX event handler references', () => {
      const input = `
import React, { Component } from 'react';
class Actions extends Component {
  doSave() { console.log('save'); }
  execute() { this.doSave(); }
  render() { return <button onClick={this.execute}>Exec</button>; }
}
`;
      const result = modernizeReactCode(input);
      expect(result.success).toBe(true);
      expect(result.code).toContain('doSave()');
      expect(result.code).toContain('onClick={execute}');
      expect(result.code).not.toContain('this.doSave');
      expect(result.code).not.toContain('this.execute');
    });
  });

  describe('Category 7: Context API (Rules 30-32)', () => {
    it('Rule 30: static contextType converted to useContext hook', () => {
      const input = `
import React, { Component } from 'react';
import { ThemeContext } from './theme';
class ThemedButton extends Component {
  static contextType = ThemeContext;
  render() { return <button className={this.context.theme}>Click</button>; }
}
`;
      const result = modernizeReactCode(input);
      expect(result.success).toBe(true);
      expect(result.code).toContain('const context = useContext(ThemeContext);');
      expect(result.code).toContain('useContext');
    });

    it('Rule 31: Context property access (this.context.theme -> context.theme)', () => {
      const input = `
import React, { Component } from 'react';
import { AuthContext } from './auth';
class UserMenu extends Component {
  static contextType = AuthContext;
  render() {
    const user = this.context.user;
    return <div>{this.context.isAuthenticated ? user.name : 'Guest'}</div>;
  }
}
`;
      const result = modernizeReactCode(input);
      expect(result.success).toBe(true);
      expect(result.code).toContain('const user = context.user;');
      expect(result.code).toContain('context.isAuthenticated');
      expect(result.code).not.toContain('this.context');
    });

    it('Rule 32: Context Consumer JSX hoisting to useContext', () => {
      const input = `
import React, { Component } from 'react';
import { ThemeContext } from './theme';
class ThemedCard extends Component {
  render() {
    return (
      <ThemeContext.Consumer>
        {theme => <div className={theme}>Card</div>}
      </ThemeContext.Consumer>
    );
  }
}
`;
      const result = modernizeReactCode(input);
      expect(result.success).toBe(true);
      expect(result.code).toContain('const theme = useContext(ThemeContext);');
      expect(result.code).toContain('<div className={theme}>Card</div>');
      expect(result.code).not.toContain('ThemeContext.Consumer');
    });
  });

  describe('Category 8: Signature, Optimization & Wrapping (Rules 33-35)', () => {
    it('Rule 33: Component to function signature (named and default exports)', () => {
      const input = `
import React from 'react';
export class Nav extends React.Component {
  render() { return <nav>Navigation</nav>; }
}
`;
      const result = modernizeReactCode(input);
      expect(result.success).toBe(true);
      expect(result.code).toContain('export function Nav(props)');
    });

    it('Rule 34: PureComponent to React.memo wrapping', () => {
      const input = `
import React, { PureComponent } from 'react';
export class FastRow extends PureComponent {
  render() { return <tr><td>{this.props.label}</td></tr>; }
}
`;
      const result = modernizeReactCode(input);
      expect(result.success).toBe(true);
      expect(result.code).toContain('React.memo');
      expect(result.code).not.toContain('PureComponent');
    });

    it('Rule 35: this.forceUpdate() converted to useReducer increment', () => {
      const input = `
import React, { Component } from 'react';
class ForceComp extends Component {
  refresh = () => { this.forceUpdate(); };
  render() { return <button onClick={this.refresh}>Refresh</button>; }
}
`;
      const result = modernizeReactCode(input);
      expect(result.success).toBe(true);
      expect(result.code).toContain('useReducer');
      expect(result.code).toContain('forceUpdate()');
      expect(result.code).not.toContain('this.forceUpdate');
    });
  });

  describe('Category 9: TypeScript Types & Generics Extraction (Rules 36-38)', () => {
    it('Rule 36: Props generic parameter extraction Component<Props>', () => {
      const input = `
import React, { Component } from 'react';
interface CardProps { title: string; count?: number; }
class Card extends Component<CardProps> {
  render() { return <h1>{this.props.title}</h1>; }
}
`;
      const result = modernizeReactCode(input);
      expect(result.success).toBe(true);
      expect(result.code).toContain('function Card(props: CardProps)');
    });

    it('Rule 37: State generic parameter extraction Component<Props, State>', () => {
      const input = `
import React, { Component } from 'react';
interface Props { id: string; }
interface State { active: boolean; count: number; }
class Toggle extends Component<Props, State> {
  state = { active: false, count: 0 };
  render() { return <div>{this.state.count}</div>; }
}
`;
      const result = modernizeReactCode(input);
      expect(result.success).toBe(true);
      expect(result.code).toContain('function Toggle(props: Props)');
      expect(result.code).toContain('const [active, setActive] = useState(false);');
      expect(result.code).toContain('const [count, setCount] = useState(0);');
      expect(result.code).toContain('interface State');
    });

    it('Rule 38: Interface preservation & unused import cleanup', () => {
      const input = `
import React, { Component, PureComponent } from 'react';
export interface WidgetProps { name: string; }
export class Widget extends Component<WidgetProps> {
  render() { return <div>{this.props.name}</div>; }
}
`;
      const result = modernizeReactCode(input);
      expect(result.success).toBe(true);
      expect(result.code).toContain('export interface WidgetProps {');
      expect(result.code).not.toContain('Component');
      expect(result.code).not.toContain('PureComponent');
    });
  });

  describe('Category 10: Static Members, defaultProps & propTypes (Rules 39-40)', () => {
    it('Rule 39: static defaultProps to parameter defaults', () => {
      const input = `
import React, { Component } from 'react';
class Alert extends Component {
  static defaultProps = {
    type: 'info',
    timeout: 3000,
  };
  render() { return <div className={this.props.type}>{this.props.message}</div>; }
}
`;
      const result = modernizeReactCode(input);
      expect(result.success).toBe(true);
      expect(result.code).toContain("type = 'info'");
      expect(result.code).toContain('timeout = 3000');
    });

    it('Rule 40: static propTypes, displayName, and custom statics preservation', () => {
      const input = `
import React, { Component } from 'react';
import PropTypes from 'prop-types';
class Tag extends Component {
  static displayName = 'TagComponent';
  static propTypes = { text: PropTypes.string };
  static getCategory() { return 'label'; }
  render() { return <span>{this.props.text}</span>; }
}
`;
      const result = modernizeReactCode(input);
      expect(result.success).toBe(true);
      expect(result.code).toContain("Tag.displayName = 'TagComponent';");
      expect(result.code).toContain('Tag.propTypes = {');
      expect(result.code).toContain('Tag.getCategory = function ()');
    });
  });
});
