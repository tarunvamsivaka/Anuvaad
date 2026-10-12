import { describe, it, expect } from 'vitest';
import { runBenchmark } from '../../../benchmark/runner';

describe('Public Evaluation Benchmark Harness', () => {
  it('evaluates multiple React class components and produces a 100% pass scorecard', () => {
    const samples = [
      {
        file: 'components/Modal.jsx',
        code: `
import React from 'react';
class Modal extends React.Component {
  state = { isOpen: false };
  open = () => this.setState({ isOpen: true });
  close = () => this.setState({ isOpen: false });
  render() { return <div>{this.state.isOpen ? 'Open' : 'Closed'}</div>; }
}
`,
      },
      {
        file: 'components/Tabs.jsx',
        code: `
import React, { Component } from 'react';
class Tabs extends Component {
  state = { activeTab: 0 };
  componentDidMount() { console.log('Tabs ready'); }
  render() { return <div>Tab: {this.state.activeTab}</div>; }
}
`,
      },
      {
        file: 'components/Autocomplete.jsx',
        code: `
import React, { Component } from 'react';
class Autocomplete extends Component {
  state = { query: '', results: [] };
  componentWillUnmount() { console.log('Cleaned'); }
  render() { return <input value={this.state.query} />; }
}
`,
      },
    ];

    const scorecard = runBenchmark(samples);

    expect(scorecard.totalFiles).toBe(3);
    expect(scorecard.passedCount).toBe(3);
    expect(scorecard.failedCount).toBe(0);
    expect(scorecard.passRatePercentage).toBe(100);
    expect(scorecard.totalStateConverted).toBe(4);
    expect(scorecard.totalEffectsConverted).toBe(2);
    expect(scorecard.averageTimeMs).toBeLessThan(50);
  });
});
