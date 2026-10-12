import { describe, it, expect } from 'vitest';
import { modernizeReactCode } from '../engine';

describe('Anuvaad Codemod Engine (React Class -> Hooks)', () => {
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
    expect(result.code).toContain("return () => {\n      console.log('Timer unmounted');\n    };");
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
});
