import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface AcademicYear {
  id: string;
  year_name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  transition_status: 'pending' | 'in_progress' | 'completed';
  previous_year_id?: string;
  next_year_id?: string;
  created_at?: string;
  updated_at?: string;
}

export function useAcademicYears() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAcademicYears = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: supabaseError } = await supabase
        .from('academic_years')
        .select('*')
        .order('start_date', { ascending: false });

      if (supabaseError) throw supabaseError;
      setAcademicYears(data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch academic years'));
    } finally {
      setLoading(false);
    }
  };

  const addAcademicYear = async (academicYear: Omit<AcademicYear, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // If setting as current year, first unset any existing current year
      if (academicYear.is_current) {
        const { error: updateError } = await supabase
          .from('academic_years')
          .update({ is_current: false })
          .eq('is_current', true);

        if (updateError) throw updateError;
      }

      const { data, error } = await supabase
        .from('academic_years')
        .insert([academicYear])
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('No data returned from insert');

      setAcademicYears(current => [data, ...current]);
      return data;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to add academic year');
    }
  };

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  return {
    academicYears,
    loading,
    error,
    addAcademicYear,
    refreshAcademicYears: fetchAcademicYears
  };
}