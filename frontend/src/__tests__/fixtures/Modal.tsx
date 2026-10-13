import React, { Component } from 'react';

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
        <div ref={this.modalRef} className={`modal-dialog ${this.state.fadeState}`}>
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
