export const MODAL_FIXTURE = `import React, { Component } from 'react';

export interface ModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children?: React.ReactNode;
}

export interface ModalState {
  isRendered: boolean;
  fadeState: 'in' | 'out';
}

export class Modal extends Component<ModalProps, ModalState> {
  modalRef = React.createRef<HTMLDivElement>();

  state: ModalState = {
    isRendered: false,
    fadeState: 'out',
  };

  componentDidMount() {
    window.addEventListener('keydown', this.handleKeyDown);
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this.props.isOpen) {
      this.props.onClose();
    }
  };

  handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (this.modalRef.current && !this.modalRef.current.contains(event.target as Node)) {
      this.props.onClose();
    }
  };

  render() {
    if (!this.props.isOpen && !this.state.isRendered) {
      return null;
    }

    return (
      <div className="modal-backdrop" onClick={this.handleBackdropClick}>
        <div ref={this.modalRef} className={\`modal-dialog \${this.state.fadeState}\`}>
          <div className="modal-header">
            <h3>{this.props.title}</h3>
            <button onClick={this.props.onClose}>&times;</button>
          </div>
          <div className="modal-body">{this.props.children}</div>
        </div>
      </div>
    );
  }
}
`;

export const AUTOCOMPLETE_FIXTURE = `import React, { Component } from 'react';

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
`;

export const TABS_FIXTURE = `import React, { Component } from 'react';

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
              className={\`tab-header \${this.state.activeTabId === tab.id ? 'active' : ''}\`}
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
`;

export const DATEPICKER_FIXTURE = `import React, { Component } from 'react';

export interface DatePickerProps {
  value?: string;
  onChange: (date: string) => void;
  format?: string;
}

export interface DatePickerState {
  isOpen: boolean;
  viewYear: number;
  viewMonth: number;
  selectedDate: string;
}

export class DatePicker extends Component<DatePickerProps, DatePickerState> {
  containerRef = React.createRef<HTMLDivElement>();

  state: DatePickerState = {
    isOpen: false,
    viewYear: 2026,
    viewMonth: 10,
    selectedDate: '2026-10-12',
  };

  componentDidMount() {
    document.addEventListener('mousedown', this.handleOutsideClick);
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.handleOutsideClick);
  }

  handleOutsideClick = (event: MouseEvent) => {
    if (this.containerRef.current && !this.containerRef.current.contains(event.target as Node)) {
      this.setState({ isOpen: false });
    }
  };

  toggleCalendar = () => {
    this.setState({ isOpen: !this.state.isOpen });
  };

  prevMonth = () => {
    this.setState({
      viewMonth: this.state.viewMonth === 1 ? 12 : this.state.viewMonth - 1,
      viewYear: this.state.viewMonth === 1 ? this.state.viewYear - 1 : this.state.viewYear,
    });
  };

  nextMonth = () => {
    this.setState({
      viewMonth: this.state.viewMonth === 12 ? 1 : this.state.viewMonth + 1,
      viewYear: this.state.viewMonth === 12 ? this.state.viewYear + 1 : this.state.viewYear,
    });
  };

  selectDate = (day: number) => {
    const formatted = \`\${this.state.viewYear}-\${String(this.state.viewMonth).padStart(2, '0')}-\${String(day).padStart(2, '0')}\`;
    this.setState({
      selectedDate: formatted,
      isOpen: false,
    });
    this.props.onChange(formatted);
  };

  render() {
    return (
      <div ref={this.containerRef} className="datepicker-root">
        <input
          type="text"
          readOnly
          value={this.state.selectedDate}
          onClick={this.toggleCalendar}
        />
        {this.state.isOpen && (
          <div className="datepicker-popover">
            <div className="datepicker-header">
              <button onClick={this.prevMonth}>&lt;</button>
              <span>{this.state.viewYear} - {this.state.viewMonth}</span>
              <button onClick={this.nextMonth}>&gt;</button>
            </div>
            <div className="datepicker-days">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((d) => (
                <button key={d} onClick={() => this.selectDate(d)}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
}
`;

export const DATATABLE_FIXTURE = `import React, { Component } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
}

export interface DataTableProps<T = any> {
  data: T[];
  columns: Column<T>[];
  pageSize?: number;
  onRowClick?: (row: T) => void;
}

export interface DataTableState {
  pageIndex: number;
  sortKey: string;
  sortAsc: boolean;
  filterText: string;
}

export class DataTable extends Component<DataTableProps, DataTableState> {
  constructor(props: DataTableProps) {
    super(props);
    this.state = {
      pageIndex: 0,
      sortKey: '',
      sortAsc: true,
      filterText: '',
    };
  }

  handleSort = (key: string) => {
    this.setState({
      sortKey: key,
      sortAsc: this.state.sortKey === key ? !this.state.sortAsc : true,
    });
  };

  handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({
      filterText: event.target.value,
      pageIndex: 0,
    });
  };

  handleNextPage = () => {
    this.setState({
      pageIndex: this.state.pageIndex + 1,
    });
  };

  handlePrevPage = () => {
    this.setState({
      pageIndex: Math.max(0, this.state.pageIndex - 1),
    });
  };

  render() {
    return (
      <div className="datatable-root">
        <div className="datatable-toolbar">
          <input
            type="text"
            placeholder="Search rows..."
            value={this.state.filterText}
            onChange={this.handleFilterChange}
          />
        </div>
        <table className="datatable-table">
          <thead>
            <tr>
              {this.props.columns.map((col) => (
                <th key={col.key} onClick={() => this.handleSort(col.key)}>
                  {col.header}
                  {this.state.sortKey === col.key && (this.state.sortAsc ? ' ▲' : ' ▼')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {this.props.data.map((row: any, idx: number) => (
              <tr key={idx} onClick={() => this.props.onRowClick && this.props.onRowClick(row)}>
                {this.props.columns.map((col) => (
                  <td key={col.key}>
                    {col.render ? col.render(row) : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="datatable-pagination">
          <button onClick={this.handlePrevPage} disabled={this.state.pageIndex === 0}>
            Previous
          </button>
          <span>Page {this.state.pageIndex + 1}</span>
          <button onClick={this.handleNextPage}>Next</button>
        </div>
      </div>
    );
  }
}
`;
