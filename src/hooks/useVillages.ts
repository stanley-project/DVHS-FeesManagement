import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { withRetry } from '../utils/fetchUtils';

interface Village {
  id: string;
  name: string;
  distance_from_school: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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

  const fetchVillages = async () => {
    try {
      setLoading(true);
      setError(null);

      // First fetch all villages
      const { data: villagesData, error: villagesError } = await supabase
        .from('villages')
        .select('*');

      if (villagesError) throw villagesError;

      // Then fetch student counts for each village
      const villagesWithCounts = await Promise.all(
        villagesData.map(async (village) => {
          // Get total students count
          const { count: totalStudents, error: totalError } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('village_id', village.id);

          if (totalError) throw totalError;

          // Get bus students count
          const { count: busStudents, error: busError } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('village_id', village.id)
            .eq('has_school_bus', true);

          if (busError) throw busError;

          // Get current bus fee - using maybeSingle() instead of single()
          const { data: busFees, error: busFeesError } = await supabase
            .from('bus_fee_structure')
            .select('fee_amount')
            .eq('village_id', village.id)
            .eq('is_active', true)
            .maybeSingle();

          if (busFeesError) throw busFeesError;

          return {
            ...village,
            total_students: totalStudents || 0,
            bus_students: busStudents || 0,
            current_bus_fee: busFees?.fee_amount || undefined
          };
        })
      );

      setVillages(villagesWithCounts);
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
      // Get the current academic year
      const { data: currentYear, error: yearError } = await supabase
        .from('academic_years')
        .select('id')
        .eq('is_current', true)
        .single();

      if (yearError) throw yearError;

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
          academic_year_id: currentYear.id,
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

const checkNetworkStatus = () => {
  return navigator.onLine;
};

const validateSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw new Error('Authentication error: ' + error.message);
  if (!session) throw new Error('No active session');
  return session;
};

export function useVillages() {
  const [villages, setVillages] = useState<VillageWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVillages = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!checkNetworkStatus()) {
        throw new Error('No network connection');
      }

      await validateSession();

      // First fetch all villages with retry
      const { data: villagesData, error: villagesError } = await withRetry(() =>
        supabase.from('villages').select('*')
      );

      if (villagesError) throw villagesError;

      // Then fetch student counts for each village with retry
      const villagesWithCounts = await Promise.all(
        villagesData.map(async (village) => {
          // Get total students count
          const { count: totalStudents, error: totalError } = await withRetry(() =>
            supabase
              .from('students')
              .select('*', { count: 'exact', head: true })
              .eq('village_id', village.id)
          );

          if (totalError) throw totalError;

          // Get bus students count
          const { count: busStudents, error: busError } = await withRetry(() =>
            supabase
              .from('students')
              .select('*', { count: 'exact', head: true })
              .eq('village_id', village.id)
              .eq('has_school_bus', true)
          );

          if (busError) throw busError;

          // Get current bus fee
          const { data: busFees, error: busFeesError } = await withRetry(() =>
            supabase
              .from('bus_fee_structure')
              .select('fee_amount')
              .eq('village_id', village.id)
              .eq('is_active', true)
              .maybeSingle()
          );

          if (busFeesError) throw busFeesError;

          return {
            ...village,
            total_students: totalStudents || 0,
            bus_students: busStudents || 0,
            current_bus_fee: busFees?.fee_amount || undefined
          };
        })
      );

      setVillages(villagesWithCounts);
    } catch (err: any) {
      console.error('Village fetch error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };