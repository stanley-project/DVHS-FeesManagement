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

      // Get current academic year first
      const { data: currentYear, error: yearError } = await supabase
        .from('academic_years')
        .select('id')
        .eq('is_current', true)
        .single();

      if (yearError) throw yearError;

      const { data, error: fetchError } = await supabase
        .from('classes')
        .select(`
          *,
          teacher:teacher_id(id, name)
        `)
        .eq('academic_year_id', currentYear.id)
        .order('name');

      if (fetchError) throw fetchError;

      setClasses(data || []);
    } catch (err) {
      console.error('Error fetching classes:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch classes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  return {
    classes,
    loading,
    error,
    refreshClasses: fetchClasses
  };
}