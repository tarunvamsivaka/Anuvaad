import React, { Component } from 'react';

export interface AutocompleteItem {
  id: string;
  label: string;
}

export interface AutocompleteProps {
  items: AutocompleteItem[];
  placeholder?: string;
  onSelect: (item: AutocompleteItem) => void;
}

export interface AutocompleteState {
  query: string;
  isOpen: boolean;
  highlightedIndex: number;
}

export class Autocomplete extends Component<AutocompleteProps, AutocompleteState> {
  inputRef = React.createRef<HTMLInputElement>();

  state: AutocompleteState = {
    query: '',
    isOpen: false,
    highlightedIndex: -1,
  };

  componentDidMount() {
    console.log('Autocomplete mounted');
  }

  componentWillUnmount() {
    console.log('Autocomplete unmounting');
  }

  handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    this.setState({
      query: value,
      isOpen: value.length > 0,
      highlightedIndex: -1,
    });
  };

  handleSelect = (item: AutocompleteItem) => {
    this.setState({
      query: item.label,
      isOpen: false,
    });
    this.props.onSelect(item);
  };

  clearQuery = () => {
    this.setState({
      query: '',
      isOpen: false,
    });
    if (this.inputRef.current) {
      this.inputRef.current.focus();
    }
  };

  render() {
    return (
      <div className="autocomplete-container">
        <input
          ref={this.inputRef}
          type="text"
          value={this.state.query}
          placeholder={this.props.placeholder}
          onChange={this.handleInputChange}
        />
        {this.state.isOpen && (
          <ul className="autocomplete-dropdown">
            {this.props.items
              .filter((item) =>
                item.label.toLowerCase().includes(this.state.query.toLowerCase())
              )
              .map((item, index) => (
                <li
                  key={item.id}
                  className={index === this.state.highlightedIndex ? 'highlighted' : ''}
                  onClick={() => this.handleSelect(item)}
                >
                  {item.label}
                </li>
              ))}
          </ul>
        )}
      </div>
    );
  }
}
