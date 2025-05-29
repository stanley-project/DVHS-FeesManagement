// src/hooks/useVillages.tsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase'; // Ensure this path is correct
import { useAuth } from '../contexts/AuthContext';

export interface Village {
  id: string;
  name: string;
  distance_from_school: number;
  is_active: boolean;
  bus_number: string;
}

export interface VillageWithStats extends Village {
  total_students: number;
  bus_students: number;
  current_bus_fee?: number;
}

// Types for data manipulation functions (can be refined)
export type NewVillageData = Omit<Village, 'id'>;
export type VillageUpdateData = Partial<Omit<Village, 'id'>>;


export function useVillages() {
  const [villages, setVillages] = useState<VillageWithStats[]>([]);
  const [loading, setLoading] = useState(true); // Start true as fetch is usually initial
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  const fetchVillagesInternal = useCallback(async () => {
    // This function assumes isAuthenticated is true when called by useEffect or refreshVillages
    console.log("useVillages: Fetching villages data...");
    try {
      setLoading(true);
      setError(null);

      const { data: villagesData, error: villagesError } = await supabase
        .from('villages')
        .select('*');

      if (villagesError) {
        throw new Error(`Error fetching villages: ${villagesError.message}`);
      }
      
      if (!villagesData || villagesData.length === 0) {
        setVillages([]);
        // setLoading(false); // Handled in finally block
        console.log("useVillages: No villages found.");
        return;
      }

      console.log(`useVillages: Found ${villagesData.length} villages. Fetching stats...`);
      const villagesWithCounts = await Promise.all(
        villagesData.map(async (village) => {
          // Get total students count
          const { count: totalStudents, error: totalError } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('village_id', village.id);

          if (totalError) {
            console.error(`useVillages: Error fetching total students for village ${village.id}:`, totalError);
            throw new Error(`Error fetching total students for ${village.name}: ${totalError.message}`);
          }

          // Get bus students count
          const { count: busStudents, error: busError } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('village_id', village.id)
            .eq('has_school_bus', true);

          if (busError) {
            console.error(`useVillages: Error fetching bus students for village ${village.id}:`, busError);
            throw new Error(`Error fetching bus students for ${village.name}: ${busError.message}`);
          }

          // Get current bus fee
          const { data: busFeeData, error: busFeesError } = await supabase
            .from('bus_fee_structure')
            .select('amount')
            .eq('village_id', village.id)
            .eq('is_active', true)
            .maybeSingle(); // Use maybeSingle to handle 0 or 1 row

          if (busFeesError) {
            console.error(`useVillages: Error fetching bus fees for village ${village.id}:`, busFeesError);
            throw new Error(`Error fetching bus fees for ${village.name}: ${busFeesError.message}`);
          }

          return {
            ...village,
            total_students: totalStudents || 0,
            bus_students: busStudents || 0,
            current_bus_fee: busFeeData?.amount // Access amount safely
          };
        })
      );

      setVillages(villagesWithCounts);
      console.log("useVillages: Successfully fetched villages with stats.");
    } catch (err: any) {
      console.error('useVillages: Error in fetchVillagesInternal:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setVillages([]);
    } finally {
      setLoading(false);
    }
  }, [supabase]); // supabase client is stable. setLoading, setError, setVillages are stable.

  useEffect(() => {
    if (isAuthenticated) {
      fetchVillagesInternal();
    } else {
      // If user becomes unauthenticated (e.g. logout), clear data
      console.log("useVillages: User not authenticated. Clearing village data.");
      setVillages([]);
      setLoading(false); // No active loading operation
      setError(null);
    }
  }, [isAuthenticated, fetchVillagesInternal]);

  // Exposed refresh function
  const refreshVillages = useCallback(() => {
    if (isAuthenticated) {
      console.log("useVillages: Refreshing villages...");
      fetchVillagesInternal();
    } else {
      console.warn("useVillages: Not authenticated, skipping refresh. Clearing data.");
      setVillages([]);
      setLoading(false);
      setError(null);
    }
  }, [isAuthenticated, fetchVillagesInternal]);

  // STUB: Add Village Function
  const addVillage = useCallback(async (villageData: NewVillageData): Promise<VillageWithStats | null> => {
    console.warn('addVillage function is not implemented yet.', villageData);
    if (!isAuthenticated) {
      setError('User not authenticated to add village.');
      return null;
    }
    // TODO: Implement actual Supabase insert and then refresh or update local state
    // For now, set an error or do nothing
    setError('Add village functionality is not yet implemented.');
    // Example: await supabase.from('villages').insert([villageData]); refreshVillages();
    return null;
  }, [isAuthenticated, supabase, refreshVillages]); // refreshVillages is a dependency

  // STUB: Update Village Function
  const updateVillage = useCallback(async (villageId: string, updates: VillageUpdateData): Promise<VillageWithStats | null> => {
    console.warn('updateVillage function is not implemented yet.', villageId, updates);
    if (!isAuthenticated) {
      setError('User not authenticated to update village.');
      return null;
    }
    // TODO: Implement actual Supabase update and then refresh or update local state
    setError('Update village functionality is not yet implemented.');
    // Example: await supabase.from('villages').update(updates).eq('id', villageId); refreshVillages();
    return null;
  }, [isAuthenticated, supabase, refreshVillages]);

  // STUB: Update Bus Fee Function
  const updateBusFee = useCallback(async (villageId: string, newFee: number): Promise<boolean> => {
    console.warn('updateBusFee function is not implemented yet.', villageId, newFee);
    if (!isAuthenticated) {
      setError('User not authenticated to update bus fee.');
      return false;
    }
    // TODO: Implement actual Supabase update (likely to bus_fee_structure table) and refresh
    setError('Update bus fee functionality is not yet implemented.');
    // Example: Complex logic to update/insert into bus_fee_structure, then refreshVillages();
    return false;
  }, [isAuthenticated, supabase, refreshVillages]);

  return {
    villages,
    loading,
    error,
    addVillage,
    updateVillage,
    updateBusFee,
    refreshVillages
  };
}