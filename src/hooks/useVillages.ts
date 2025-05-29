import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { withRetry } from '../utils/fetchUtils';
import { Session } from '@supabase/supabase-js'; // Import Session type

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

const checkNetworkStatus = () => {
  return navigator.onLine;
};

export function useVillages() {
  const [villages, setVillages] = useState<VillageWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  const fetchVillages = async () => {
    console.log("useVillages: fetchVillages called.");
    console.log("useVillages: Current session state:", session ? "Active" : "Null");

    if (!session) {
      setError("No active session. Please log in.");
      setLoading(false);
      setVillages([]);
      console.warn("useVillages: fetchVillages aborted, no active session.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (!checkNetworkStatus()) {
        throw new Error('No network connection');
      }

      // First fetch all villages with retry
      console.log("useVillages: Fetching villages from Supabase...");
      const { data: villagesData, error: villagesError } = await withRetry(() =>
        supabase.from('villages').select('*')
      );

      console.log("useVillages: Supabase 'villages' fetch result - Data:", villagesData);
      console.log("useVillages: Supabase 'villages' fetch result - Error:", villagesError);

      if (villagesError) {
        throw new Error(`Error fetching villages: ${villagesError.message}`);
      }
      
      if (!villagesData || villagesData.length === 0) {
          console.warn("useVillages: No villages data returned from Supabase.");
          setVillages([]); // Ensure villages array is empty if no data
          setLoading(false);
          return;
      }

      // Then fetch student counts and bus fees for each village with retry
      console.log(`useVillages: Processing ${villagesData.length} villages for stats...`);
      const villagesWithCounts = await Promise.all(
        villagesData.map(async (village) => {
          // Get total students count
          const { count: totalStudents, error: totalError } = await withRetry(() =>
            supabase
              .from('students')
              .select('*', { count: 'exact', head: true })
              .eq('village_id', village.id)
          );

          if (totalError) {
            console.error(`useVillages: Error fetching total students for village ${village.name} (${village.id}):`, totalError);
            throw new Error(`Error fetching total students: ${totalError.message}`);
          }

          // Get bus students count
          const { count: busStudents, error: busError } = await withRetry(() =>
            supabase
              .from('students')
              .select('*', { count: 'exact', head: true })
              .eq('village_id', village.id)
              .eq('has_school_bus', true)
          );

          if (busError) {
            console.error(`useVillages: Error fetching bus students for village ${village.name} (${village.id}):`, busError);
            throw new Error(`Error fetching bus students: ${busError.message}`);
          }

          // Get current bus fee - FIX: Changed 'fee_amount' to 'amount' based on schema
          const { data: busFees, error: busFeesError } = await withRetry(() =>
            supabase
              .from('bus_fee_structure')
              .select('amount') // <<--- IMPORTANT FIX: Changed 'fee_amount' to 'amount'
              .eq('village_id', village.id)
              .eq('is_active', true)
              .maybeSingle()
          );

          if (busFeesError) {
            console.error(`useVillages: Error fetching bus fees for village ${village.name} (${village.id}):`, busFeesError);
            throw new Error(`Error fetching bus fees: ${busFeesError.message}`);
          }

          return {
            ...village,
            total_students: totalStudents || 0,
            bus_students: busStudents || 0,
            current_bus_fee: busFees?.amount || undefined // <<--- IMPORTANT FIX: Changed 'fee_amount' to 'amount'
          };
        })
      );

      console.log("useVillages: Final villagesWithCounts before setting state:", villagesWithCounts);
      setVillages(villagesWithCounts);

    } catch (err: any) {
      console.error('useVillages: Village fetch caught error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setVillages([]); // Clear villages on error
    } finally {
      setLoading(false); // Always set loading to false when done
      console.log("useVillages: fetchVillages finished. Loading:", false);
    }
  };

  // Effect to set up Supabase authentication listener and get initial session
  useEffect(() => {
    console.log("useVillages: Initial useEffect for auth listener and session check.");
    const getInitialSession = async () => {
      const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("useVillages: Error getting initial session:", sessionError);
        setError("Error getting session: " + sessionError.message);
        setLoading(false);
        return;
      }
      setSession(initialSession);
      console.log("useVillages: Initial session set to:", initialSession ? "Active" : "Null");
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession);
        console.log(`useVillages: Auth state changed. Event: ${_event}, Session: ${currentSession ? "Active" : "Null"}`);
      }
    );

    return () => {
      console.log("useVillages: Unsubscribing from auth state changes.");
      subscription.unsubscribe();
    };
  }, []);

  // Effect to fetch villages when the session state changes
  useEffect(() => {
    console.log("useVillages: Session dependency useEffect triggered. Session is:", session ? "Active" : "Null");
    if (session) {
      // If a session exists, trigger fetching the village data
      fetchVillages();
    } else {
      // If no session, clear data and set appropriate states
      setVillages([]);
      setError("Please log in to view village data.");
      setLoading(false);
      console.log("useVillages: No session, clearing villages and setting error/loading state.");
    }
  }, [session]); // Re-run this effect whenever the `session` state changes

  // Data modification functions - ensure a session exists before proceeding
  const addVillage = async (villageData: Omit<Village, 'id' | 'created_at' | 'updated_at'>) => {
    if (!session) throw new Error('No active session. Please log in.');
    try {
      const { data, error } = await supabase
        .from('villages')
        .insert([villageData])
        .select()
        .single();

      if (error) throw error;
      await fetchVillages(); // Refresh list after adding
      return data;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to add village');
    }
  };

  const updateVillage = async (id: string, updates: Partial<Village>) => {
    if (!session) throw new Error('No active session. Please log in.');
    try {
      const { data, error } = await supabase
        .from('villages')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      await fetchVillages(); // Refresh list after updating
      return data;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update village');
    }
  };

  const updateBusFee = async (villageId: string, amount: number) => {
    if (!session) throw new Error('No active session. Please log in.');
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
          fee_amount: amount, // This `fee_amount` refers to the parameter, not a column name. It's fine here.
          academic_year_id: currentYear.id,
          effective_from_date: new Date().toISOString(),
          effective_to_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;
      await fetchVillages(); // Refresh list after updating bus fee
      return data;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update bus fee');
    }
  };

  return {
    villages,
    loading,
    error,
    addVillage,
    updateVillage,
    updateBusFee,
    refreshVillages: () => {
      console.log("useVillages: refreshVillages called.");
      if (session) {
        fetchVillages();
      } else {
        setError("No active session. Cannot refresh.");
        console.warn("useVillages: Cannot refresh villages, no active session.");
      }
    }
  };
}
