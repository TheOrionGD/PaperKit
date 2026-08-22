import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { PrimaryButton } from './Button';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '100vh', width: '100%', padding: '20px', textAlign: 'center', background: 'var(--color-background)'
        }}>
          <AlertTriangle size={64} color="var(--color-error)" style={{ marginBottom: '20px' }} />
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>Oops, something went wrong.</h1>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px' }}>
            {this.state.error?.message || "An unexpected error occurred while loading this page."}
          </p>
          <PrimaryButton onClick={() => window.location.href = '/'}>
            Return to Home
          </PrimaryButton>
        </div>
      );
    }
    return this.props.children;
  }
}
