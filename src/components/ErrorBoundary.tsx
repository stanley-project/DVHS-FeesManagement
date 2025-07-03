import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { isNetworkOrResourceError, isDatabaseError } from '../lib/supabase';

interface ErrorBoundaryProps {
  children: ReactNode;
  onError?: (error: Error) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorType: 'network' | 'database' | 'auth' | 'unknown';
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { 
    hasError: false,
    errorType: 'unknown'
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Categorize the error
    let errorType: 'network' | 'database' | 'auth' | 'unknown' = 'unknown';
    
    const errorMessage = error.message || error.toString();
    
    if (
      errorMessage.includes('net::ERR_') ||
      errorMessage.includes('NetworkError') ||
      errorMessage.includes('network error') ||
      errorMessage.includes('Failed to fetch') ||
      errorMessage.includes('Network request failed') ||
      errorMessage.includes('ERR_INSUFFICIENT_RESOURCES')
    ) {
      errorType = 'network';
    } else if (
      errorMessage.includes('Database connection failed') ||
      errorMessage.includes('database connection') ||
      errorMessage.includes('database error')
    ) {
      errorType = 'database';
    } else if (
      errorMessage.includes('401') ||
      errorMessage.includes('403') ||
      errorMessage.includes('invalid token') ||
      errorMessage.includes('session invalid') ||
      errorMessage.includes('not authenticated')
    ) {
      errorType = 'auth';
    }
    
    return { 
      hasError: true, 
      error,
      errorType
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    
    if (this.props.onError) {
      this.props.onError(error);
    }
    
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      const { errorType, error } = this.state;
      
      return (
        <div className="p-6 bg-error/10 border border-error/30 rounded-lg text-error">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="h-6 w-6 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold mb-1">
                {errorType === 'network' 
                  ? 'Network Connection Error' 
                  : errorType === 'database'
                  ? 'Database Connection Error'
                  : errorType === 'auth'
                  ? 'Authentication Error'
                  : 'Something went wrong'}
              </h3>
              <p className="text-sm opacity-80">
                {errorType === 'network'
                  ? 'Please check your internet connection and try again.'
                  : errorType === 'database'
                  ? 'Database is temporarily unavailable. Please try again shortly.'
                  : errorType === 'auth'
                  ? 'Your session may have expired. Please try logging in again.'
                  : error?.message || 'An unexpected error occurred'}
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={this.handleRetry}
              className="btn btn-outline btn-sm text-error border-error hover:bg-error/10 flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
            
            {errorType === 'auth' && (
              <a 
                href="/login" 
                className="btn btn-error btn-sm text-white"
              >
                Go to login
              </a>
            )}
          </div>
          
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-error/5 rounded text-xs font-mono overflow-auto max-h-32">
              {error?.stack}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;