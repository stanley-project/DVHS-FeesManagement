import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Village {
  id: string;
  name: string;
  distance_from_school: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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

  const fetchVillages = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch villages with student counts
      const { data, error: fetchError } = await supabase
        .from('villages')
        .select(`
          *,
          students:students(count),
          bus_students:students(count)
        `)
        .eq('bus_students.has_school_bus', true);

      if (fetchError) throw fetchError;

      // Fetch current bus fees
      const { data: busFees, error: busFeesError } = await supabase
        .from('bus_fee_structure')
        .select('*')
        .eq('is_active', true);

      if (busFeesError) throw busFeesError;

      // Combine the data
      const villagesWithStats = data.map(village => ({
        ...village,
        total_students: village.students?.[0]?.count || 0,
        bus_students: village.bus_students?.[0]?.count || 0,
        current_bus_fee: busFees.find(fee => fee.village_id === village.id)?.fee_amount
      }));

      setVillages(villagesWithStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const addVillage = async (villageData: Omit<Village, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('villages')
        .insert([villageData])
        .select()
        .single();

      if (error) throw error;
      await fetchVillages();
      return data;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to add village');
    }
  };

  const updateVillage = async (id: string, updates: Partial<Village>) => {
    try {
      const { data, error } = await supabase
        .from('villages')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      await fetchVillages();
      return data;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update village');
    }
  };

  const updateBusFee = async (villageId: string, amount: number) => {
    try {
      // Deactivate current fee structure
      await supabase
        .from('bus_fee_structure')
        .update({ is_active: false })
        .eq('village_id', villageId)
        .eq('is_active', true);

      // Add new fee structure
      const { data, error } = await supabase
        .from('bus_fee_structure')
        .insert([{
          village_id: villageId,
          fee_amount: amount,
          effective_from_date: new Date().toISOString(),
          effective_to_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;
      await fetchVillages();
      return data;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update bus fee');
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
    updateBusFee,
    refreshVillages: fetchVillages
  };
}