import React, { Component } from 'react';

export class Tabs extends Component {
  state = {
    selectedIndex: this.props.defaultIndex || 0,
    tabCount: 0
  };

  componentDidMount() {
    const count = React.Children.count(this.props.children);
    this.setState({ tabCount: count });
  }

  componentDidUpdate(prevProps) {
    if (prevProps.selectedIndex !== this.props.selectedIndex && this.props.selectedIndex !== undefined) {
      this.setState({ selectedIndex: this.props.selectedIndex });
    }
  }

  handleSelectTab = (index) => {
    this.setState({ selectedIndex: index });
    if (this.props.onSelect) {
      this.props.onSelect(index);
    }
  };

  render() {
    const { items = [] } = this.props;
    const { selectedIndex } = this.state;

    return (
      <div className="tabs-container">
        <div className="tab-list" role="tablist">
          {items.map((tab, idx) => (
            <button
              key={tab.id || idx}
              role="tab"
              aria-selected={selectedIndex === idx}
              className={selectedIndex === idx ? 'tab-active' : 'tab'}
              onClick={() => this.handleSelectTab(idx)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="tab-panel" role="tabpanel">
          {items[selectedIndex] && items[selectedIndex].content}
        </div>
      </div>
    );
  }
}

export default Tabs;
