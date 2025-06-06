import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Village {
  id: number;
  name: string;
  status: 'active' | 'inactive';
  distance: number;
  bus_fee_structure_id: number | null;
  created_at: string;
  updated_at: string;
}

interface VillageContextType {
  villages: Village[];
  loading: boolean;
  error: Error | null;
  addVillage: (village: Omit<Village, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateVillage: (id: number, village: Partial<Village>) => Promise<void>;
  deleteVillage: (id: number) => Promise<void>;
  refreshVillages: () => Promise<void>;
}

const VillageContext = createContext<VillageContextType | undefined>(undefined);

export function VillageProvider({ children }: { children: React.ReactNode }) {
  const [villages, setVillages] = useState<Village[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchVillages = async () => {
    try {
      setLoading(true);
      const { data, error: supabaseError } = await supabase
        .from('villages')
        .select('*')
        .order('name');

      if (supabaseError) {
        throw supabaseError;
      }

      setVillages(data || []);
      setError(null);
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

  const addVillage = async (village: Omit<Village, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error: supabaseError } = await supabase
        .from('villages')
        .insert([village])
        .select()
        .single();

      if (supabaseError) {
        throw supabaseError;
      }

      setVillages(prevVillages => [...prevVillages, data]);
      return data;
    } catch (err) {
      console.error('Error adding village:', err);
      throw err instanceof Error ? err : new Error('Failed to add village');
    }
  };

  const updateVillage = async (id: number, villageUpdate: Partial<Village>) => {
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

  const deleteVillage = async (id: number) => {
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

  const value = {
    villages,
    loading,
    error,
    addVillage,
    updateVillage,
    deleteVillage,
    refreshVillages: fetchVillages
  };

  return (
    <VillageContext.Provider value={value}>
      {children}
    </VillageContext.Provider>
  );
}

export function useVillages() {
  const context = useContext(VillageContext);
  if (context === undefined) {
    throw new Error('useVillages must be used within a VillageProvider');
  }
  return context;
}