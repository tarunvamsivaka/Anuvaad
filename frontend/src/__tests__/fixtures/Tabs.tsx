import React, { Component } from 'react';

export interface TabItem {
  id: string;
  title: string;
  content: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  defaultTabId?: string;
  onChange?: (tabId: string) => void;
}

export interface TabsState {
  activeTabId: string;
  renderedPanels: string[];
}

export class Tabs extends Component<TabsProps, TabsState> {
  constructor(props: TabsProps) {
    super(props);
    const initialId = props.defaultTabId || (props.tabs[0] ? props.tabs[0].id : '');
    this.state = {
      activeTabId: initialId,
      renderedPanels: [initialId],
    };
  }

  handleTabClick = (tabId: string) => {
    this.setState({
      activeTabId: tabId,
    });
    if (this.props.onChange) {
      this.props.onChange(tabId);
    }
  };

  render() {
    return (
      <div className="tabs-container">
        <div className="tab-headers" role="tablist">
          {this.props.tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={this.state.activeTabId === tab.id}
              className={`tab-header ${this.state.activeTabId === tab.id ? 'active' : ''}`}
              onClick={() => this.handleTabClick(tab.id)}
            >
              {tab.title}
            </button>
          ))}
        </div>
        <div className="tab-panels">
          {this.props.tabs.map((tab) => (
            <div
              key={tab.id}
              role="tabpanel"
              hidden={this.state.activeTabId !== tab.id}
              className="tab-panel"
            >
              {this.state.activeTabId === tab.id ? tab.content : null}
            </div>
          ))}
        </div>
      </div>
    );
  }
}
