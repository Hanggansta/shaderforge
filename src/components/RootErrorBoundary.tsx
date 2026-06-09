import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class RootErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[RootErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
            background: '#0a0c12',
            color: '#e6e8ed',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <h1 style={{ fontSize: 22, marginBottom: 12, color: '#ff2d55' }}>
            ShaderLumen failed to start
          </h1>
          <p style={{ maxWidth: 520, textAlign: 'center', color: '#8b949e', marginBottom: 16, lineHeight: 1.5 }}>
            The app hit a startup error. After a deploy, try a hard refresh (Ctrl+Shift+R).
            If the message mentions a missing <code style={{ color: '#00f0ff' }}>.js</code> chunk,
            your browser cached an old build — reload usually fixes it.
            For local dev, ensure <code style={{ color: '#00f0ff' }}>VITE_CLERK_PUBLISHABLE_KEY</code> in{' '}
            <code>.env.local</code> is valid or unset.
          </p>
          {this.state.error && (
            <pre
              style={{
                background: '#1a1f2e',
                padding: 16,
                borderRadius: 8,
                fontSize: 12,
                maxWidth: '100%',
                overflow: 'auto',
                color: '#ff2d55',
              }}
            >
              {this.state.error.message}
            </pre>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: 20,
              padding: '10px 20px',
              background: '#00f0ff',
              border: 'none',
              borderRadius: 6,
              color: '#05070d',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}