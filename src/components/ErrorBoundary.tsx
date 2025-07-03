import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { 
    hasError: false 
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-error/10 border border-error/30 rounded-lg text-error">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="h-6 w-6 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold mb-1">Something went wrong</h3>
              <p className="text-sm opacity-80">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
            </div>
          </div>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="btn btn-outline btn-sm text-error border-error hover:bg-error/10"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;