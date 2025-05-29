import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Village } from '../types/village';

interface UseVillagesReturn {
  villages: Village[];
  loading: boolean;
  error: Error | null;
  addVillage: (village: Omit<Village, 'id' | 'created_at' | 'updated_at'>) => Promise<Village>;
  updateVillage: (id: string, village: Partial<Village>) => Promise<Village>;
  deleteVillage: (id: string) => Promise<void>;
  refreshVillages: () => Promise<void>;
}

export function useVillages(): UseVillagesReturn {
  const [villages, setVillages] = useState<Village[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchVillages = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from('villages')
        .select('*')
        .order('name');

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

  const addVillage = async (village: Omit<Village, 'id' | 'created_at' | 'updated_at'>): Promise<Village> => {
    try {
      const { data, error: supabaseError } = await supabase
        .from('villages')
        .insert([village])
        .select()
        .single();

      if (supabaseError) {
        throw supabaseError;
      }

      if (!data) {
        throw new Error('No data returned from insert operation');
      }

      setVillages(prevVillages => [...prevVillages, data]);
      return data;
    } catch (err) {
      console.error('Error adding village:', err);
      throw err instanceof Error ? err : new Error('Failed to add village');
    }
  };

  const updateVillage = async (id: string, villageUpdate: Partial<Village>): Promise<Village> => {
    try {
      const { data, error: supabaseError } = await supabase
        .from('villages')
        .update(villageUpdate)
        .eq('id', id)
        .select()
        .single();

      if (supabaseError) {
        throw supabaseError;
      }

      if (!data) {
        throw new Error('No data returned from update operation');
      }

      setVillages(prevVillages =>
        prevVillages.map(village =>
          village.id === id ? { ...village, ...data } : village
        )
      );
      
      return data;
    } catch (err) {
      console.error('Error updating village:', err);
      throw err instanceof Error ? err : new Error('Failed to update village');
    }
  };

  const deleteVillage = async (id: string): Promise<void> => {
    try {
      const { error: supabaseError } = await supabase
        .from('villages')
        .delete()
        .eq('id', id);

      if (supabaseError) {
        throw supabaseError;
      }

      setVillages(prevVillages =>
        prevVillages.filter(village => village.id !== id)
      );
    } catch (err) {
      console.error('Error deleting village:', err);
      throw err instanceof Error ? err : new Error('Failed to delete village');
    }
  };

  return {
    villages,
    loading,
    error,
    addVillage,
    updateVillage,
    deleteVillage,
    refreshVillages: fetchVillages
  };
}