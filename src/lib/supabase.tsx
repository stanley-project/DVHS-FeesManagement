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
  
  return (
    errorMessage.includes('net::ERR_') ||
    errorMessage.includes('NetworkError') ||
    errorMessage.includes('network error') ||
    errorMessage.includes('Failed to fetch') ||
    errorMessage.includes('Network request failed') ||
    errorMessage.includes('ERR_INSUFFICIENT_RESOURCES') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('AbortError') ||
    errorMessage.includes('Database connection failed') ||
    errorMessage.includes('database connection')
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

export const handleApiError = (error: any, retryFn?: () => void) => {
  console.error('API Error:', error);
  
  if (isAuthError(error)) {
    toast.error('Your session has expired. Please log in again.');
    // Auth errors should be handled by the AuthContext
    return;
  }
  
  if (isDatabaseError(error)) {
    toast.error(
      <div className="flex flex-col">
        <span>Database temporarily unavailable. Please try again shortly.</span>
        {retryFn && (
          <button 
            onClick={retryFn}
            className="mt-2 text-sm underline self-end"
          >
            Retry
          </button>
        )}
      </div>
    );
    return;
  }
  
  if (isNetworkOrResourceError(error)) {
    toast.error(
      <div className="flex flex-col">
        <span>Network connection issue. Please check your internet connection.</span>
        {retryFn && (
          <button 
            onClick={retryFn}
            className="mt-2 text-sm underline self-end"
          >
            Retry
          </button>
        )}
      </div>
    );
    return;
  }
  
  // Default error message
  toast.error('An unexpected error occurred. Please try again.');
};