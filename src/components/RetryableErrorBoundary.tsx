import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, Wifi, Database, ShieldOff } from 'lucide-react';
import { isNetworkOrResourceError, isDatabaseError, isAuthError } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface RetryableErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onRetry?: () => void;
}

const RetryableErrorBoundary: React.FC<RetryableErrorBoundaryProps> = ({ 
  children, 
  fallback,
  onRetry 
}) => {
  const [error, setError] = useState<Error | null>(null);
  const [errorInfo, setErrorInfo] = useState<React.ErrorInfo | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [retryTimer, setRetryTimer] = useState(0);
  const { handleError } = useAuth();

  // Reset error state when children change
  useEffect(() => {
    setError(null);
    setErrorInfo(null);
  }, [children]);

  // Auto-retry with exponential backoff
  useEffect(() => {
    if (!error) return;

    // Only auto-retry for network or database errors
    if (!isNetworkOrResourceError(error) && !isDatabaseError(error)) return;
    
    // Maximum of 5 retries
    if (retryCount >= 5) return;
    
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    const delay = Math.min(1000 * Math.pow(2, retryCount), 16000);
    
    // Set up countdown timer
    let remainingTime = Math.floor(delay / 1000);
    setRetryTimer(remainingTime);
    
    const countdownInterval = setInterval(() => {
      remainingTime -= 1;
      setRetryTimer(remainingTime);
    }, 1000);
    
    const timeoutId = setTimeout(() => {
      clearInterval(countdownInterval);
      handleRetry();
    }, delay);
    
    return () => {
      clearTimeout(timeoutId);
      clearInterval(countdownInterval);
    };
  }, [error, retryCount]);

  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error('Error caught by RetryableErrorBoundary:', error, errorInfo);
    setError(error);
    setErrorInfo(errorInfo);
    
    // Handle auth errors through AuthContext
    if (isAuthError(error)) {
      handleError(error);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setError(null);
    setErrorInfo(null);
    
    if (onRetry) {
      onRetry();
    }
  };

  if (error) {
    // Determine error type for appropriate UI
    const isNetwork = isNetworkOrResourceError(error);
    const isDatabase = isDatabaseError(error);
    const isAuth = isAuthError(error);
    
    // If custom fallback is provided, use it
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <div className="p-6 bg-error/10 border border-error/30 rounded-lg">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-error/20 rounded-full">
            {isNetwork ? (
              <Wifi className="h-5 w-5 text-error" />
            ) : isDatabase ? (
              <Database className="h-5 w-5 text-error" />
            ) : isAuth ? (
              <ShieldOff className="h-5 w-5 text-error" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-error" />
            )}
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-1">
              {isNetwork 
                ? 'Network Connection Error' 
                : isDatabase
                ? 'Database Connection Error'
                : isAuth
                ? 'Authentication Error'
                : 'Something went wrong'}
            </h3>
            <p className="text-sm text-error/80 mb-4">
              {isNetwork
                ? 'Please check your internet connection and try again.'
                : isDatabase
                ? 'Database is temporarily unavailable. Please try again shortly.'
                : isAuth
                ? 'Your session may have expired. Please try logging in again.'
                : error.message || 'An unexpected error occurred'}
            </p>
            
            <div className="flex gap-3">
              {(isNetwork || isDatabase) && retryCount < 5 && (
                <button
                  onClick={handleRetry}
                  className="btn btn-outline btn-sm text-error border-error hover:bg-error/10 flex items-center gap-2"
                  disabled={retryTimer > 0}
                >
                  <RefreshCw className={`h-4 w-4 ${retryTimer > 0 ? 'animate-spin' : ''}`} />
                  {retryTimer > 0 
                    ? `Retrying in ${retryTimer}s...` 
                    : `Retry (${retryCount}/5)`}
                </button>
              )}
              
              {isAuth && (
                <a 
                  href="/login" 
                  className="btn btn-error btn-sm text-white"
                >
                  Go to login
                </a>
              )}
            </div>
          </div>
        </div>
        
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-3 bg-error/5 rounded text-xs font-mono overflow-auto max-h-32">
            {error.stack}
          </div>
        )}
      </div>
    );
  }

  return <>{children}</>;
};

export default RetryableErrorBoundary;