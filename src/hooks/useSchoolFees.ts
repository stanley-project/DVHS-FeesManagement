import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

interface FeeType {
  id: string;
  name: string;
  description?: string;
  frequency: 'monthly' | 'quarterly' | 'annual';
  category: 'school' | 'bus';
  is_monthly: boolean;
  is_for_new_students_only: boolean;
  effective_from?: string;
  effective_to?: string;
  last_updated_by?: string;
  created_at: string;
  updated_at: string;
}

interface FeeStructure {
  id?: string;
  class_id: string;
  fee_type_id: string;
  amount: number;
  academic_year_id: string;
  due_date: string;
  applicable_to_new_students_only: boolean;
  is_recurring_monthly: boolean;
  notes?: string;
  last_updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

interface FeeStructureWithDetails extends FeeStructure {
  class?: {
    id: string;
    name: string;
  };
  fee_type?: FeeType;
}

export function useSchoolFees() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch all fee types (removed category filter)
  const fetchFeeTypes = useCallback(async (): Promise<FeeType[]> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('fee_types')
        .select('*')
        .order('name');

      if (fetchError) throw fetchError;
      return data || [];
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch fee types');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch fee structure for academic year
  const fetchFeeStructure = useCallback(async (academicYearId: string): Promise<FeeStructureWithDetails[]> => {
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
        .eq('academic_year_id', academicYearId)
        .order('created_at');

      if (fetchError) throw fetchError;
      return data || [];
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch fee structure');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Save complete fee structure with audit trail
  const saveFeeStructure = useCallback(async (data: {
    academic_year_id: string;
    fee_structure: FeeStructure[];
    updated_by: string;
  }): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Start transaction by getting existing structure
      const { data: existingStructure, error: fetchError } = await supabase
        .from('fee_structure')
        .select('*')
        .eq('academic_year_id', data.academic_year_id);

      if (fetchError) throw fetchError;

      // Create audit trail for changes
      const auditPromises = [];
      
      // Track changes for existing items
      for (const newItem of data.fee_structure) {
        if (newItem.id) {
          const existing = existingStructure?.find(e => e.id === newItem.id);
          if (existing && parseFloat(existing.amount) !== newItem.amount) {
            // Record the change in history
            auditPromises.push(
              supabase.from('fee_structure_history').insert({
                fee_structure_id: newItem.id,
                previous_amount: parseFloat(existing.amount),
                new_amount: newItem.amount,
                changed_by: data.updated_by,
                reason: 'Fee structure update'
              })
            );
          }
        }
      }

      // Execute audit trail inserts
      if (auditPromises.length > 0) {
        await Promise.all(auditPromises);
      }

      // Delete existing structure for this academic year
      const { error: deleteError } = await supabase
        .from('fee_structure')
        .delete()
        .eq('academic_year_id', data.academic_year_id);

      if (deleteError) throw deleteError;

      // Insert new structure
      const structureToInsert = data.fee_structure.map(item => ({
        ...item,
        academic_year_id: data.academic_year_id,
        last_updated_by: data.updated_by,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error: insertError } = await supabase
        .from('fee_structure')
        .insert(structureToInsert);

      if (insertError) throw insertError;

      toast.success('Fee structure saved successfully');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to save fee structure');
      setError(error);
      toast.error(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Copy fee structure from previous year
  const copyFromPreviousYear = useCallback(async (currentYearId: string): Promise<FeeStructureWithDetails[]> => {
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

      // Get current year classes for mapping
      const { data: currentClasses, error: classError } = await supabase
        .from('classes')
        .select('id, name')
        .eq('academic_year_id', currentYearId);

      if (classError) throw classError;

      const classMap = new Map(currentClasses?.map(c => [c.name, c.id]) || []);

      // Map previous fees to current year structure
      const mappedFees = previousFees
        .map(fee => {
          const currentClassId = classMap.get(fee.class?.name || '');
          if (!currentClassId) return null;

          return {
            ...fee,
            id: undefined, // Remove ID for new insertion
            class_id: currentClassId,
            academic_year_id: currentYearId,
            due_date: new Date().toISOString().split('T')[0],
            notes: `Copied from previous year (${currentYear.previous_year_id})`
          };
        })
        .filter(Boolean) as FeeStructureWithDetails[];

      return mappedFees;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to copy from previous year');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create new fee type
  const createFeeType = useCallback(async (feeType: Omit<FeeType, 'id' | 'created_at' | 'updated_at'>): Promise<FeeType> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: insertError } = await supabase
        .from('fee_types')
        .insert([{
          ...feeType,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (insertError) throw insertError;
      if (!data) throw new Error('No data returned from insert');

      toast.success('Fee type created successfully');
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create fee type');
      setError(error);
      toast.error(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update fee type
  const updateFeeType = useCallback(async (id: string, updates: Partial<FeeType>): Promise<FeeType> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: updateError } = await supabase
        .from('fee_types')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      if (!data) throw new Error('No data returned from update');

      toast.success('Fee type updated successfully');
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update fee type');
      setError(error);
      toast.error(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete fee type
  const deleteFeeType = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Check if fee type is in use
      const { data: usageCheck, error: checkError } = await supabase
        .from('fee_structure')
        .select('id')
        .eq('fee_type_id', id)
        .limit(1);

      if (checkError) throw checkError;

      if (usageCheck && usageCheck.length > 0) {
        throw new Error('Cannot delete fee type that is currently in use');
      }

      const { error: deleteError } = await supabase
        .from('fee_types')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      toast.success('Fee type deleted successfully');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete fee type');
      setError(error);
      toast.error(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get fee structure history
  const getFeeStructureHistory = useCallback(async (feeStructureId?: string): Promise<any[]> => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('fee_structure_history')
        .select(`
          *,
          changed_by:changed_by(name),
          fee_structure:fee_structure_id(
            class:class_id(name),
            fee_type:fee_type_id(name)
          )
        `)
        .order('change_date', { ascending: false });

      if (feeStructureId) {
        query = query.eq('fee_structure_id', feeStructureId);
      }

      const { data, error: fetchError } = await query.limit(100);

      if (fetchError) throw fetchError;
      return data || [];
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch fee structure history');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    fetchFeeTypes,
    fetchFeeStructure,
    saveFeeStructure,
    copyFromPreviousYear,
    createFeeType,
    updateFeeType,
    deleteFeeType,
    getFeeStructureHistory
  };
}