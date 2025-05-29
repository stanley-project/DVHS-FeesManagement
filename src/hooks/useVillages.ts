import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Village {
  id: string;
  name: string;
  distance_from_school: number;
  is_active: boolean;
  bus_number: string;
}

interface VillageWithStats extends Village {
  total_students: number;
  bus_students: number;
  current_bus_fee?: number;
}

export function useVillages() {
  const [villages, setVillages] = useState<VillageWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  const fetchVillages = async () => {
    if (!isAuthenticated) {
      console.warn("useVillages: Not authenticated, skipping fetch");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch all villages
      const { data: villagesData, error: villagesError } = await supabase
        .from('villages')
        .select('*');

      if (villagesError) {
        throw new Error(`Error fetching villages: ${villagesError.message}`);
      }
      
      if (!villagesData || villagesData.length === 0) {
        setVillages([]);
        setLoading(false);
        return;
      }

      // Process each village to get student counts and bus fees
      const villagesWithCounts = await Promise.all(
        villagesData.map(async (village) => {
          // Get total students count
          const { count: totalStudents, error: totalError } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('village_id', village.id);

          if (totalError) {
            throw new Error(`Error fetching total students: ${totalError.message}`);
          }

          // Get bus students count
          const { count: busStudents, error: busError } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('village_id', village.id)
            .eq('has_school_bus', true);

          if (busError) {
            throw new Error(`Error fetching bus students: ${busError.message}`);
          }

          // Get current bus fee
          const { data: busFees, error: busFeesError } = await supabase
            .from('bus_fee_structure')
            .select('amount')
            .eq('village_id', village.id)
            .eq('is_active', true)
            .maybeSingle();

          if (busFeesError) {
            throw new Error(`Error fetching bus fees: ${busFeesError.message}`);
          }

          return {
            ...village,
            total_students: totalStudents || 0,
            bus_students: busStudents || 0,
            current_bus_fee: busFees?.amount
          };
        })
      );

      setVillages(villagesWithCounts);

    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setVillages([]); // Clear villages on error
    } finally {
      setLoading(false);
    }
  };

  // Fetch villages when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchVillages();
    }
  }, [isAuthenticated]);

  return {
    villages,
    loading,
    error,
    addVillage,
    updateVillage,
    updateBusFee,
    refreshVillages: fetchVillages
  };
}