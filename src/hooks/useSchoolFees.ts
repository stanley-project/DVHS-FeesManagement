import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface FeeType {
  id: string;
  name: string;
  description?: string;
  frequency: 'monthly' | 'quarterly' | 'annual';
  category: 'school' | 'bus' | 'admission';
  is_monthly: boolean;
  is_for_new_students_only: boolean;
}

interface FeeStructure {
  id: string;
  class_id: string;
  fee_type_id: string;
  amount: number;
  academic_year_id: string;
  due_date: string;
  applicable_to_new_students_only: boolean;
  is_recurring_monthly: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export function useSchoolFees() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchFeeTypes = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('fee_types')
        .select('*')
        .eq('category', 'school')
        .order('name');

      if (fetchError) throw fetchError;
      return data || [];
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch fee types'));
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchFeeStructure = async (academicYearId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('fee_structure')
        .select(`
          *,
          class:class_id(id, name),
          fee_type:fee_type_id(*)
        `)
        .eq('academic_year_id', academicYearId);

      if (fetchError) throw fetchError;
      return data || [];
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch fee structure'));
      return [];
    } finally {
      setLoading(false);
    }
  };

  const saveFeeStructure = async (feeData: Omit<FeeStructure, 'id' | 'created_at' | 'updated_at'>[]) => {
    try {
      setLoading(true);
      setError(null);

      // First, delete existing fee structure for this academic year
      const { error: deleteError } = await supabase
        .from('fee_structure')
        .delete()
        .eq('academic_year_id', feeData[0].academic_year_id);

      if (deleteError) throw deleteError;

      // Insert new fee structure
      const { data, error: insertError } = await supabase
        .from('fee_structure')
        .insert(feeData)
        .select();

      if (insertError) throw insertError;
      return data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to save fee structure'));
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

      // Get fee structure from previous year
      const { data: previousFees, error: feeError } = await supabase
        .from('fee_structure')
        .select(`
          *,
          class:class_id(id, name),
          fee_type:fee_type_id(*)
        `)
        .eq('academic_year_id', currentYear.previous_year_id);

      if (feeError) throw feeError;
      if (!previousFees?.length) {
        throw new Error('No fee structure found for previous year');
      }

      return previousFees.map(fee => ({
        ...fee,
        academic_year_id: currentYearId,
        due_date: new Date().toISOString().split('T')[0]
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
    fetchFeeTypes,
    fetchFeeStructure,
    saveFeeStructure,
    copyFromPreviousYear
  };
}