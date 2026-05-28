import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.name}]`, error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: 24,
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
        }}>
          <div style={{
            fontSize: 48,
            marginBottom: 16,
          }}>
            ⚠️
          </div>
          <h2 style={{
            fontSize: 18,
            marginBottom: 8,
            color: 'var(--accent-red)',
          }}>
            Something went wrong
          </h2>
          <p style={{
            fontSize: 14,
            color: 'var(--text-secondary)',
            marginBottom: 16,
            textAlign: 'center',
            maxWidth: 400,
          }}>
            The {this.props.name} panel encountered an error. This doesn't affect the rest of the application.
          </p>
          {this.state.error && (
            <pre style={{
              background: 'var(--bg-tertiary)',
              padding: 12,
              borderRadius: 6,
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              color: 'var(--accent-red)',
              maxWidth: '100%',
              overflow: 'auto',
              marginBottom: 16,
              maxHeight: 100,
            }}>
              {this.state.error.message}
            </pre>
          )}
          <button
            className="toolbar-btn"
            onClick={this.handleReset}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
