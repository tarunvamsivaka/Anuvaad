import React, { Component } from 'react';

export class Autocomplete extends Component {
  state = {
    query: '',
    results: [],
    isOpen: false,
    highlightedIndex: -1
  };

  componentDidMount() {
    if (this.props.initialQuery) {
      this.setState({ query: this.props.initialQuery });
    }
  }

  componentWillUnmount() {
    // Cleanup any pending debounce timers
  }

  handleInputChange = (event) => {
    const value = event.target.value;
    const items = this.props.items || [];
    const filtered = items.filter(item => 
      item.toLowerCase().includes(value.toLowerCase())
    );
    this.setState({
      query: value,
      results: filtered,
      isOpen: value.length > 0,
      highlightedIndex: -1
    });
  };

  handleSelectItem = (item) => {
    this.setState({ query: item, isOpen: false });
    if (this.props.onSelect) {
      this.props.onSelect(item);
    }
  };

  handleKeyDown = (event) => {
    const { isOpen, results, highlightedIndex } = this.state;
    if (!isOpen || results.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.setState({
        highlightedIndex: (highlightedIndex + 1) % results.length
      });
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.setState({
        highlightedIndex: (highlightedIndex - 1 + results.length) % results.length
      });
    } else if (event.key === 'Enter' && highlightedIndex >= 0) {
      event.preventDefault();
      this.handleSelectItem(results[highlightedIndex]);
    }
  };

  render() {
    const { placeholder = 'Search...' } = this.props;
    const { query, results, isOpen, highlightedIndex } = this.state;

    return (
      <div className="autocomplete-container" onKeyDown={this.handleKeyDown}>
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={this.handleInputChange}
          className="autocomplete-input"
        />
        {isOpen && results.length > 0 && (
          <ul className="autocomplete-menu">
            {results.map((item, index) => (
              <li
                key={item}
                className={index === highlightedIndex ? 'highlighted' : ''}
                onClick={() => this.handleSelectItem(item)}
              >
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
}

export default Autocomplete;
