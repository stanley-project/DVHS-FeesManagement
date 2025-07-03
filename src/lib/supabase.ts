import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';
import { toast } from 'react-hot-toast';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Error handling utilities
export const isNetworkOrResourceError = (error: any): boolean => {
  const errorMessage = error?.message || error?.toString() || '';
  const errorName = error?.name || '';
  
  return (
    // Network errors
    errorMessage.includes('Failed to fetch') ||
    errorMessage.includes('fetch') ||
    errorName === 'TypeError' && errorMessage.includes('fetch') ||
    errorMessage.includes('net::ERR_') ||
    errorMessage.includes('NetworkError') ||
    errorMessage.includes('network error') ||
    errorMessage.includes('Network request failed') ||
    errorMessage.includes('ERR_INSUFFICIENT_RESOURCES') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('AbortError') ||
    errorMessage.includes('Database connection failed') ||
    errorMessage.includes('database connection') ||
    // Connection issues
    errorMessage.includes('ERR_NETWORK') ||
    errorMessage.includes('ERR_INTERNET_DISCONNECTED') ||
    errorMessage.includes('ERR_CONNECTION_REFUSED') ||
    errorMessage.includes('ERR_CONNECTION_RESET') ||
    errorMessage.includes('ERR_CONNECTION_TIMED_OUT') ||
    // CORS and other fetch-related errors
    errorMessage.includes('CORS') ||
    errorMessage.includes('cors') ||
    errorMessage.includes('Cross-Origin') ||
    // Server unreachable
    errorMessage.includes('Server not reachable') ||
    errorMessage.includes('Unable to connect') ||
    errorMessage.includes('Connection failed')
  );
};

export const isDatabaseError = (error: any): boolean => {
  const errorMessage = error?.message || error?.toString() || '';
  
  return (
    errorMessage.includes('Database connection failed') ||
    errorMessage.includes('database connection') ||
    errorMessage.includes('database error') ||
    errorMessage.includes('DB error') ||
    errorMessage.includes('connection pool') ||
    errorMessage.includes('too many connections') ||
    errorMessage.includes('timeout')
  );
};

export const isAuthError = (error: any): boolean => {
  const errorMessage = error?.message || error?.toString() || '';
  const errorCode = error?.code;
  
  return (
    errorCode === 401 ||
    errorCode === 403 ||
    errorMessage.includes('invalid token') ||
    errorMessage.includes('session invalid') ||
    errorMessage.includes('not authenticated') ||
    errorMessage.includes('auth/') ||
    errorMessage.includes('User session invalid') ||
    errorMessage.includes('Session expired') ||
    errorMessage.includes('User not found or inactive')
  );
};

// Debounce toast errors to prevent multiple toasts for the same error
const errorToasts = new Map<string, number>();

export const handleApiError = (error: any, retryFn?: () => void) => {
  console.error('API Error:', error);
  
  const errorMessage = error?.message || error?.toString() || 'An unexpected error occurred';
  const now = Date.now();
  const lastShown = errorToasts.get(errorMessage) || 0;
  
  // Only show the same error toast once every 5 seconds
  if (now - lastShown < 5000) {
    return;
  }
  
  errorToasts.set(errorMessage, now);
  
  if (isAuthError(error)) {
    toast.error('Your session has expired. Please log in again.');
    // Auth errors should be handled by the AuthContext
    return;
  }
  
  if (isDatabaseError(error)) {
    toast.error(`Database temporarily unavailable. Please try again shortly. ${retryFn ? 'Click to retry.' : ''}`, {
      onClick: () => {
        if (retryFn) retryFn();
      }
    });
    return;
  }
  
  if (isNetworkOrResourceError(error)) {
    toast.error(`Network connection issue. Please check your internet connection. ${retryFn ? 'Click to retry.' : ''}`, {
      onClick: () => {
        if (retryFn) retryFn();
      }
    });
    return;
  }
  
  // Default error message
  toast.error('An unexpected error occurred. Please try again.');
};