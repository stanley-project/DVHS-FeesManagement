import { useState } from 'react';
import { supabase } from '../lib/supabase';

export interface BusFeeStructure {
  id: string;
  village_id: string;
  fee_amount: number;
  academic_year_id: string;
  effective_from_date: string;
  effective_to_date: string;
  is_active: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export function useBusFees() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchBusFees = async (academicYearId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('bus_fee_structure')
        .select(`
          *,
          village:village_id(id, name, distance_from_school)
        `)
        .eq('academic_year_id', academicYearId)
        .eq('is_active', true);

      if (fetchError) throw fetchError;
      return data || [];
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch bus fees'));
      return [];
    } finally {
      setLoading(false);
    }
  };

  const saveBusFees = async (feesData: Omit<BusFeeStructure, 'id' | 'created_at' | 'updated_at'>[]) => {
    try {
      setLoading(true);
      setError(null);

      // Deactivate existing fees for these villages
      const villageIds = feesData.map(fee => fee.village_id);
      const { error: updateError } = await supabase
        .from('bus_fee_structure')
        .update({ is_active: false })
        .in('village_id', villageIds)
        .eq('academic_year_id', feesData[0].academic_year_id)
        .eq('is_active', true);

      if (updateError) throw updateError;

      // Insert new fees
      const { data, error: insertError } = await supabase
        .from('bus_fee_structure')
        .insert(feesData)
        .select();

      if (insertError) throw insertError;
      return data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to save bus fees'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const copyFromPreviousYear = async (currentYearId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Get the previous academic year
      const { data: currentYear, error: yearError } = await supabase
        .from('academic_years')
        .select('previous_year_id')
        .eq('id', currentYearId)
        .single();

      if (yearError) throw yearError;
      if (!currentYear?.previous_year_id) {
        throw new Error('No previous academic year found');
      }

      // Get bus fees from previous year
      const { data: previousFees, error: feeError } = await supabase
        .from('bus_fee_structure')
        .select(`
          *,
          village:village_id(id, name, distance_from_school)
        `)
        .eq('academic_year_id', currentYear.previous_year_id)
        .eq('is_active', true);

      if (feeError) throw feeError;
      if (!previousFees?.length) {
        throw new Error('No bus fees found for previous year');
      }

      return previousFees.map(fee => ({
        ...fee,
        academic_year_id: currentYearId,
        effective_from_date: new Date().toISOString().split('T')[0],
        effective_to_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
      }));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to copy from previous year'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    fetchBusFees,
    saveBusFees,
    copyFromPreviousYear
  };
}
