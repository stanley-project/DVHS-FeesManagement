import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';

// Create a client with error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error) => {
        // Don't retry on auth errors, but retry up to 3 times for other errors
        const errorMessage = error?.message || '';
        if (
          errorMessage.includes('401') ||
          errorMessage.includes('403') ||
          errorMessage.includes('invalid token') ||
          errorMessage.includes('session invalid') ||
          errorMessage.includes('not authenticated')
        ) {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: attemptIndex => Math.min(1000 * Math.pow(2, attemptIndex), 30000), // Exponential backoff
      refetchOnWindowFocus: false,
      onError: (error) => {
        console.error('Query error:', error);
      }
    },
    mutations: {
      retry: (failureCount, error) => {
        // Don't retry on auth errors, but retry once for network errors
        const errorMessage = error?.message || '';
        if (
          errorMessage.includes('401') ||
          errorMessage.includes('403') ||
          errorMessage.includes('invalid token') ||
          errorMessage.includes('session invalid') ||
          errorMessage.includes('not authenticated')
        ) {
          return false;
        }
        
        // Only retry network errors
        if (
          errorMessage.includes('net::ERR_') ||
          errorMessage.includes('NetworkError') ||
          errorMessage.includes('network error') ||
          errorMessage.includes('Failed to fetch')
        ) {
          return failureCount < 1;
        }
        
        return false;
      },
      onError: (error) => {
        console.error('Mutation error:', error);
      }
    }
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </Router>
  </React.StrictMode>
);