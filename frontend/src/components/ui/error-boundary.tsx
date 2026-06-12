"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { ErrorCard } from "@/components/ui/error-card";

interface Props {
  children: ReactNode;
  fallback?: (props: { error: Error; reset: () => void }) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * FRONT-03: React error boundary for dashboard routes.
 * Catches runtime errors in child components and shows a recovery UI.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to Sentry if available in production
    if (typeof window !== "undefined" && (window as typeof window & { Sentry?: { captureException: (e: Error) => void } }).Sentry) {
      (window as typeof window & { Sentry?: { captureException: (e: Error) => void } }).Sentry?.captureException(error);
    }
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    const { children, fallback } = this.props;

    if (error) {
      if (fallback) {
        return fallback({ error, reset: this.reset });
      }
      return (
        <ErrorCard
          title="Something went wrong"
          description={error.message || "An unexpected error occurred."}
          onRetry={this.reset}
        />
      );
    }

    return children;
  }
}
