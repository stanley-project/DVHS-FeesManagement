import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface AcademicYear {
  id: string;
  year_name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  transition_status: 'pending' | 'in_progress' | 'completed';
}

export function useCurrentAcademicYear() {
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
        console.error('Error fetching current academic year:', currentYearError);
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
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
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