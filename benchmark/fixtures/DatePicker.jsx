import React, { Component } from 'react';

export class DatePicker extends Component {
  constructor(props) {
    super(props);
    const today = new Date();
    this.state = {
      selectedDate: props.value || null,
      currentMonth: today.getMonth(),
      currentYear: today.getFullYear(),
      isCalendarOpen: false
    };
  }

  componentDidMount() {
    if (this.props.autoFocus) {
      this.toggleCalendar();
    }
  }

  toggleCalendar = () => {
    this.setState(prevState => ({
      isCalendarOpen: !prevState.isCalendarOpen
    }));
  };

  handleDateSelect = (day) => {
    const newDate = new Date(this.state.currentYear, this.state.currentMonth, day);
    this.setState({ selectedDate: newDate, isCalendarOpen: false });
    if (this.props.onChange) {
      this.props.onChange(newDate);
    }
  };

  handleNextMonth = () => {
    if (this.state.currentMonth === 11) {
      this.setState({ currentMonth: 0, currentYear: this.state.currentYear + 1 });
    } else {
      this.setState(prev => ({ currentMonth: prev.currentMonth + 1 }));
    }
  };

  handlePrevMonth = () => {
    if (this.state.currentMonth === 0) {
      this.setState({ currentMonth: 11, currentYear: this.state.currentYear - 1 });
    } else {
      this.setState(prev => ({ currentMonth: prev.currentMonth - 1 }));
    }
  };

  render() {
    const { selectedDate, isCalendarOpen, currentMonth, currentYear } = this.state;
    const formattedDate = selectedDate ? selectedDate.toLocaleDateString() : '';

    return (
      <div className="datepicker-wrapper">
        <input
          type="text"
          readOnly
          value={formattedDate}
          placeholder="Select a date"
          onClick={this.toggleCalendar}
          className="datepicker-input"
        />
        {isCalendarOpen && (
          <div className="datepicker-calendar">
            <div className="calendar-header">
              <button onClick={this.handlePrevMonth}>&lt;</button>
              <span>{currentMonth + 1} / {currentYear}</span>
              <button onClick={this.handleNextMonth}>&gt;</button>
            </div>
            <div className="calendar-grid">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(day => (
                <button
                  key={day}
                  className="calendar-day"
                  onClick={() => this.handleDateSelect(day)}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default DatePicker;
