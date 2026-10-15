import React, { Component } from 'react';

export class Modal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isOpen: props.defaultOpen || false,
      hasOpenedBefore: false
    };
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  componentDidMount() {
    if (this.state.isOpen) {
      window.addEventListener('keydown', this.handleKeyDown);
    }
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  handleKeyDown(event) {
    if (event.key === 'Escape' && this.state.isOpen) {
      this.close();
    }
  }

  open = () => {
    this.setState({ isOpen: true, hasOpenedBefore: true });
    if (this.props.onOpen) {
      this.props.onOpen();
    }
  };

  close = () => {
    this.setState({ isOpen: false });
    if (this.props.onClose) {
      this.props.onClose();
    }
  };

  render() {
    const { title, children } = this.props;
    const { isOpen } = this.state;

    if (!isOpen) {
      return null;
    }

    return (
      <div className="modal-backdrop" onClick={this.close}>
        <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>{title}</h3>
            <button className="close-btn" onClick={this.close}>&times;</button>
          </div>
          <div className="modal-body">{children}</div>
        </div>
      </div>
    );
  }
}

export default Modal;
