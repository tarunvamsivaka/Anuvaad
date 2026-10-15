import React, { Component } from 'react';

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
    const formatted = `${this.state.viewYear}-${String(this.state.viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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
