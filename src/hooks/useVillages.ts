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

// Removed the standalone validateSession function. Its logic will be integrated
// by ensuring data fetching functions are only called when a session is available.

export function useVillages() {
  const [villages, setVillages] = useState<VillageWithStats[]>([]);
  const [loading, setLoading] = useState(true); // Start as loading
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null); // To store the Supabase session

  // fetchVillages function, now takes the current session as an argument
  // This ensures it has access to the session if needed, though Supabase client
  // handles it internally once `supabase.auth.setSession` is called.
  const fetchVillages = async () => {
    // Basic check, though the useEffect will guard this call more effectively
    if (!session) {
      setError("No active session. Please log in.");
      setLoading(false);
      setVillages([]); // Clear any stale data
      return;
    }

    try {
      setLoading(true); // Set loading true before fetch starts
      setError(null);

      if (!checkNetworkStatus()) {
        throw new Error('No network connection');
      }

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
      setVillages([]); // Clear villages on error
    } finally {
      setLoading(false); // Always set loading to false when done
    }
  };

  // Effect to set up Supabase authentication listener and get initial session
  useEffect(() => {
    // Function to get and set initial session
    const getInitialSession = async () => {
      const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("Error getting initial session:", sessionError);
        setError("Error getting session: " + sessionError.message);
        setLoading(false); // Stop loading if there's an error getting session
        return;
      }
      setSession(initialSession);
      // The actual data fetching will be triggered by the next useEffect based on `session` state
    };

    getInitialSession(); // Call immediately to get initial session

    // Listen for authentication state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession); // Update session state on auth changes
      }
    );

    // Clean up the subscription when the component unmounts
    return () => {
      subscription.unsubscribe();
    };
  }, []); // Run once on mount to set up the listener and initial session check

  // Effect to fetch villages when the session state changes
  useEffect(() => {
    if (session) {
      // If a session exists, trigger fetching the village data
      fetchVillages();
    } else {
      // If no session, clear data and set appropriate states
      setVillages([]);
      setError("Please log in to view village data.");
      setLoading(false); // Important: stop loading when no session
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
          fee_amount: amount,
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
      // Allow refreshing only if a session is active
      if (session) {
        fetchVillages();
      } else {
        setError("No active session. Cannot refresh.");
      }
    }
  };
}