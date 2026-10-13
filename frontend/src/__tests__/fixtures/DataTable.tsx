import React, { Component } from 'react';

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
