import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useBusFees = () => {
  const [busFees, setBusFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchBusFees = async (academicYearId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: supabaseError } = await supabase
        .from('bus_fee_structure')
        .select('*')
        .eq('academic_year_id', academicYearId);

      if (supabaseError) {
        throw supabaseError;
      }

      console.log('useBusFees: Fetched bus fees:', data); // Add this line
      setBusFees(data || []);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const saveBusFees = async (fees: any[]) => {
    setLoading(true);
    setError(null);

    try {
      // Implementation for saving bus fees
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const copyFromPreviousYear = async (academicYearId: string) => {
    setLoading(true);
    setError(null);

    try {
      // Implementation for copying from previous year
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
      
    }
  };

  return {
    busFees,
    loading,
    error,
    fetchBusFees,
    saveBusFees,
    copyFromPreviousYear,
  };
};