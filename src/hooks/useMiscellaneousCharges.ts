import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { MiscellaneousCharge, ChargeCategory } from '../types/fees';

export function useMiscellaneousCharges() {
  const [charges, setCharges] = useState<MiscellaneousCharge[]>([]);
  const [chargeCategories, setChargeCategories] = useState<ChargeCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch charge categories
  const fetchChargeCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('charge_categories')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setChargeCategories(data || []);
    } catch (err) {
      console.error('Error fetching charge categories:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch charge categories'));
    }
  }, []);

  // Fetch miscellaneous charges
  const fetchCharges = useCallback(async (filters?: {
    studentId?: string;
    academicYearId?: string;
    isPaid?: boolean;
  }) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('miscellaneous_charges')
        .select(`
          *,
          charge_category:charge_category_id(id, name, description),
          student:student_id(
            id,
            student_name,
            admission_number,
            class:class_id(name)
          )
        `)
        .order('charge_date', { ascending: false });

      if (filters?.studentId) {
        query = query.eq('student_id', filters.studentId);
      }

      if (filters?.academicYearId) {
        query = query.eq('academic_year_id', filters.academicYearId);
      }

      if (filters?.isPaid !== undefined) {
        query = query.eq('is_paid', filters.isPaid);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCharges(data || []);
    } catch (err) {
      console.error('Error fetching charges:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch charges'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new miscellaneous charge
  const createCharge = useCallback(async (charge: Omit<MiscellaneousCharge, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('miscellaneous_charges')
        .insert([charge])
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Charge created successfully');
      return data;
    } catch (err) {
      console.error('Error creating charge:', err);
      const error = err instanceof Error ? err : new Error('Failed to create charge');
      setError(error);
      toast.error(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update an existing miscellaneous charge
  const updateCharge = useCallback(async (id: string, updates: Partial<MiscellaneousCharge>) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('miscellaneous_charges')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Charge updated successfully');
      return data;
    } catch (err) {
      console.error('Error updating charge:', err);
      const error = err instanceof Error ? err : new Error('Failed to update charge');
      setError(error);
      toast.error(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete a miscellaneous charge
  const deleteCharge = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('miscellaneous_charges')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Charge deleted successfully');
    } catch (err) {
      console.error('Error deleting charge:', err);
      const error = err instanceof Error ? err : new Error('Failed to delete charge');
      setError(error);
      toast.error(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Process payment for a miscellaneous charge
  const processChargePayment = useCallback(async (
    charge: MiscellaneousCharge,
    paymentMethod: 'cash' | 'online',
    transactionId?: string
  ) => {
    try {
      setLoading(true);
      setError(null);

      // Generate receipt number
      const receiptNumber = `RC-MISC-${Date.now().toString().slice(-6)}`;

      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from('fee_payments')
        .insert({
          student_id: charge.student_id,
          fee_structure_id: null, // No fee structure for miscellaneous charges
          amount_paid: charge.amount,
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: paymentMethod,
          transaction_id: transactionId,
          receipt_number: receiptNumber,
          notes: `Payment for: ${charge.description}`,
          charge_description: charge.description,
          charge_type: 'miscellaneous',
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Update charge as paid
      const { error: updateError } = await supabase
        .from('miscellaneous_charges')
        .update({
          is_paid: true,
          payment_id: payment.id
        })
        .eq('id', charge.id);

      if (updateError) throw updateError;
      
      toast.success('Payment processed successfully');
      return payment;
    } catch (err) {
      console.error('Error processing payment:', err);
      const error = err instanceof Error ? err : new Error('Failed to process payment');
      setError(error);
      toast.error(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new charge category
  const createChargeCategory = useCallback(async (category: Omit<ChargeCategory, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('charge_categories')
        .insert([category])
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Category created successfully');
      await fetchChargeCategories();
      return data;
    } catch (err) {
      console.error('Error creating category:', err);
      const error = err instanceof Error ? err : new Error('Failed to create category');
      setError(error);
      toast.error(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [fetchChargeCategories]);

  // Initialize data
  useEffect(() => {
    fetchChargeCategories();
  }, [fetchChargeCategories]);

  return {
    charges,
    chargeCategories,
    loading,
    error,
    fetchCharges,
    createCharge,
    updateCharge,
    deleteCharge,
    processChargePayment,
    createChargeCategory,
    refreshChargeCategories: fetchChargeCategories
  };
}