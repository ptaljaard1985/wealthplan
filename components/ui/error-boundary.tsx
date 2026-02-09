"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{ padding: "var(--space-4)", textAlign: "center" }}>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--error-500)", marginBottom: "var(--space-2)" }}>
            Something went wrong loading this component.
          </p>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--gray-400)", fontFamily: "var(--font-mono)" }}>
            {this.state.error?.message}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
