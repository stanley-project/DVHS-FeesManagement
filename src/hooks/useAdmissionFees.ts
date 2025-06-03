import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface AdmissionFeeSetting {
  id: string;
  academic_year_id: string;
  amount: number;
  effective_from: string;
  effective_to?: string;
  is_active: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export function useAdmissionFees() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAdmissionFee = async (academicYearId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('admission_fee_settings')
        .select('*')
        .eq('academic_year_id', academicYearId)
        .eq('is_active', true)
        .maybeSingle();

      if (fetchError) throw fetchError;
      return data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch admission fee'));
      return null;
    } finally {
      setLoading(false);
    }
  };

  const saveAdmissionFee = async (feeData: Omit<AdmissionFeeSetting, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setLoading(true);
      setError(null);

      // First, deactivate any existing active fee for this academic year
      const { error: updateError } = await supabase
        .from('admission_fee_settings')
        .update({ is_active: false })
        .eq('academic_year_id', feeData.academic_year_id)
        .eq('is_active', true);

      if (updateError) throw updateError;

      // Insert new fee setting
      const { data, error: insertError } = await supabase
        .from('admission_fee_settings')
        .insert([feeData])
        .select()
        .single();

      if (insertError) throw insertError;
      return data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to save admission fee'));
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

      // Get fee settings from previous year
      const { data: previousFee, error: feeError } = await supabase
        .from('admission_fee_settings')
        .select('*')
        .eq('academic_year_id', currentYear.previous_year_id)
        .eq('is_active', true)
        .single();

      if (feeError) throw feeError;
      if (!previousFee) {
        throw new Error('No fee settings found for previous year');
      }

      return {
        amount: previousFee.amount,
        effective_from: new Date().toISOString().split('T')[0],
        notes: 'Copied from previous year'
      };
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
    fetchAdmissionFee,
    saveAdmissionFee,
    copyFromPreviousYear
  };
}