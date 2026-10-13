import React, { Component } from 'react';

export class RouterLink extends Component {
  state = {
    isActive: false
  };

  componentDidMount() {
    this.checkActive();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.to !== this.props.to || prevProps.currentPath !== this.props.currentPath) {
      this.checkActive();
    }
  }

  checkActive = () => {
    const { to, currentPath } = this.props;
    const active = currentPath === to;
    if (this.state.isActive !== active) {
      this.setState({ isActive: active });
    }
  };

  handleClick = (event) => {
    if (this.props.onClick) {
      this.props.onClick(event);
    }
    if (!event.defaultPrevented && this.props.navigate) {
      event.preventDefault();
      this.props.navigate(this.props.to);
    }
  };

  render() {
    const { to, activeClassName = 'active', className = '', children } = this.props;
    const { isActive } = this.state;
    const combinedClass = `${className} ${isActive ? activeClassName : ''}`.trim();

    return (
      <a href={to} className={combinedClass} onClick={this.handleClick}>
        {children}
      </a>
    );
  }
}

export default RouterLink;
