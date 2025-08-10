import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, handleApiError, isAuthError } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface AcademicYear {
  id: string;
  year_name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  transition_status: 'pending' | 'in_progress' | 'completed';
}

export function useCurrentAcademicYear() {
  const { handleError } = useAuth();
  
  return useQuery<AcademicYear>({
    queryKey: ['currentAcademicYear'],
    queryFn: async () => {
      // First try to get the current academic year
      const { data: currentYear, error: currentYearError } = await supabase
        .from('academic_years')
        .select('*')
        .eq('is_current', true)
        .maybeSingle();
      
      if (currentYearError) {
        if (isAuthError(currentYearError)) {
          handleError(currentYearError);
          throw currentYearError;
        }
        
        if (isNetworkOrResourceError(currentYearError)) {
          console.warn('Network or resource error fetching current academic year:', currentYearError);
          throw new Error('Network connection issue. Please try again.');
        }
        
        console.error('Error fetching current academic year:', currentYearError);
        throw currentYearError;
      }
      
      // If we found a current year, return it
      if (currentYear) {
        console.log('Found current academic year:', currentYear);
        return currentYear;
      }
      
      // If no current year, try to get the latest year as fallback
      console.log('No current academic year found, trying to get latest year');
      const { data: latestYear, error: latestYearError } = await supabase
        .from('academic_years')
        .select('*')
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (latestYearError) {
        if (isAuthError(latestYearError)) {
          handleError(latestYearError);
          throw latestYearError;
        }
        
        if (isNetworkOrResourceError(latestYearError)) {
          console.warn('Network or resource error fetching latest academic year:', latestYearError);
          throw new Error('Network connection issue. Please try again.');
        }
        
        console.error('Error fetching latest academic year:', latestYearError);
        throw new Error('Failed to fetch academic year');
      }
      
      if (!latestYear) {
        throw new Error('No academic years found. Please create an academic year first.');
      }
      
      console.log('Using latest academic year as fallback:', latestYear);
      return latestYear;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on auth errors, but retry up to 3 times for other errors
      if (isAuthError(error)) return false;
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// Helper function to check if an error is a network or resource error
function isNetworkOrResourceError(error: any): boolean {
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
}

export function useAcademicYearRefresher() {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['currentAcademicYear'] });
    }, 1000 * 60 * 5); // Refresh every 5 minutes
    
    return () => clearInterval(interval);
  }, [queryClient]);
}