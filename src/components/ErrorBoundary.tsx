"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] text-[var(--foreground)] px-4">
          <div className="max-w-md w-full bg-[var(--surface)] text-[var(--foreground)] rounded-lg shadow-lg p-6 text-center border border-[var(--border)]">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="tf-display text-2xl font-bold text-[var(--foreground)] mb-2">
              Etwas ist schiefgelaufen
            </h2>
            <p className="text-[var(--muted)] mb-4">
              {this.state.error?.message || 'Ein unerwarteter Fehler ist aufgetreten'}
            </p>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
                  Fehlerdetails (nur in Entwicklung sichtbar)
                </summary>
                <pre className="mt-2 p-3 bg-[var(--surface-2)] border border-[var(--border)] rounded text-xs overflow-auto">
                  {this.state.error.message}
                  {"\n\n"}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-4 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-md hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] transition"
            >
              Seite neu laden
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
