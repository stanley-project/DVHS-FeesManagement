import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Village } from '../types/village';

export function useVillages() {
  const [villages, setVillages] = useState<Village[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchVillages = async () => {
    try {
      setLoading(true);
      const { data, error: supabaseError } = await supabase
        .from('villages')
        .select('*');

      if (supabaseError) {
        throw supabaseError;
      }

      setVillages(data || []);
    } catch (err) {
      console.error('Error fetching villages:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch villages'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVillages();
  }, []);

  return {
    villages,
    loading,
    error,
    addVillage,
    updateVillage,
    deleteVillage
  };
}