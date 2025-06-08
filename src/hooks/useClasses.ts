import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Class {
  id: string;
  name: string;
  teacher_id?: string;
  academic_year_id: string;
  created_at: string;
  updated_at: string;
  teacher?: {
    id: string;
    name: string;
  };
}

export function useClasses() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('useClasses: Starting fetchClasses...');

      // Get current academic year first
      const { data: currentYear, error: yearError } = await supabase
        .from('academic_years')
        .select('id')
        .eq('is_current', true)
        .single();

      console.log('useClasses: currentYear data:', currentYear);
      console.log('useClasses: yearError:', yearError);

      if (yearError) {
        console.error('useClasses: Academic year error:', yearError);
        throw yearError;
      }

      if (!currentYear || !currentYear.id) {
        console.error('useClasses: No current academic year found');
        throw new Error('No current academic year found');
      }

      console.log('useClasses: Fetching classes for academic year:', currentYear.id);

      const { data, error: fetchError } = await supabase
        .from('classes')
        .select(`
          *,
          teacher:teacher_id(id, name)
        `)
        .eq('academic_year_id', currentYear.id)
        .order('name');

      console.log('useClasses: Classes query result:', { data, fetchError });
      console.log('useClasses: Number of classes found:', data?.length || 0);

      if (fetchError) {
        console.error('useClasses: Classes fetch error:', fetchError);
        throw fetchError;
      }

      console.log('useClasses: Setting classes state with:', data);
      setClasses(data || []);
    } catch (err) {
      console.error('useClasses: Error in fetchClasses:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch classes');
    } finally {
      console.log('useClasses: Setting loading to false');
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('useClasses: useEffect triggered, calling fetchClasses');
    fetchClasses();
  }, []);

  console.log('useClasses: Current state - classes:', classes.length, 'loading:', loading, 'error:', error);

  return {
    classes,
    loading,
    error,
    refreshClasses: fetchClasses
  };
}