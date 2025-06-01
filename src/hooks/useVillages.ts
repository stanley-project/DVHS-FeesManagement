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
      setError(null); // Reset error state before fetching

    console.log('Fetching villages with auth...');
      
      const { data, error: supabaseError } = await supabase
        .from('villages')
        .select('*')
        .order('name');

    console.log('Villages response:', { data, error: supabaseError });
      
      if (supabaseError) {
        console.error('Supabase error:', supabaseError);
        throw new Error(supabaseError.message);
      }

      // Add null check for data
      if (!data) {
        throw new Error('No data received from database');
      }

      console.log('Fetched villages:', data); // Debug log
      
      setVillages(data);
      setError(null);
    } catch (err) {
      console.error('Error in fetchVillages:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch villages'));
      setVillages([]); // Reset villages on error
    } finally {
      setLoading(false);
    }
  };

  const addVillage = async (village: Omit<Village, 'id' | 'created_at' | 'updated_at'>): Promise<Village> => {
    try {
      const { data, error: supabaseError } = await supabase
        .from('villages')
        .insert([village])
        .select()
        .single();

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      if (!data) {
        throw new Error('No data returned from insert operation');
      }

      setVillages(prev => [...prev, data]);
      return data;
    } catch (err) {
      console.error('Error in addVillage:', err);
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
        throw new Error(supabaseError.message);
      }

      if (!data) {
        throw new Error('No data returned from update operation');
      }

      setVillages(prev => prev.map(v => v.id === id ? data : v));
      return data;
    } catch (err) {
      console.error('Error in updateVillage:', err);
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
        throw new Error(supabaseError.message);
      }

      setVillages(prev => prev.filter(v => v.id !== id));
    } catch (err) {
      console.error('Error in deleteVillage:', err);
      throw err instanceof Error ? err : new Error('Failed to delete village');
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
    deleteVillage,
    refreshVillages: fetchVillages
  };
}