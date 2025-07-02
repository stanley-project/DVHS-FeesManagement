import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { FeePayment } from '../types/fees';

interface UseFeePaymentsOptions {
  studentId?: string;
  startDate?: string;
  endDate?: string;
  paymentMethod?: 'cash' | 'online' | 'all';
  page?: number;
  limit?: number;
}

export function useFeePayments(options: UseFeePaymentsOptions = {}) {
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState({
    totalAmount: 0,
    cashAmount: 0,
    onlineAmount: 0,
    busFeesAmount: 0,
    schoolFeesAmount: 0
  });

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('fee_payments')
        .select(`
          *,
          student:student_id(
            id,
            student_name,
            admission_number,
            class:class_id(name)
          ),
          payment_allocation(*)
        `, { count: 'exact' });

      // Apply filters
      if (options.studentId) {
        query = query.eq('student_id', options.studentId);
      }

      if (options.startDate) {
        query = query.gte('payment_date', options.startDate);
      }

      if (options.endDate) {
        query = query.lte('payment_date', options.endDate);
      }

      if (options.paymentMethod && options.paymentMethod !== 'all') {
        query = query.eq('payment_method', options.paymentMethod);
      }

      // Apply pagination
      if (options.page && options.limit) {
        const from = (options.page - 1) * options.limit;
        const to = from + options.limit - 1;
        query = query.range(from, to);
      }

      // Order by payment date (most recent first)
      query = query.order('payment_date', { ascending: false });

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      // Process payments
      const processedPayments = data?.map(payment => ({
        ...payment,
        allocation: payment.payment_allocation?.[0] || null
      })) || [];

      setPayments(processedPayments);
      setTotalCount(count || 0);

      // Calculate summary
      if (data) {
        const totalAmount = data.reduce((sum, payment) => sum + parseFloat(payment.amount_paid), 0);
        const cashAmount = data
          .filter(payment => payment.payment_method === 'cash')
          .reduce((sum, payment) => sum + parseFloat(payment.amount_paid), 0);
        const onlineAmount = data
          .filter(payment => payment.payment_method === 'online')
          .reduce((sum, payment) => sum + parseFloat(payment.amount_paid), 0);
        
        let busFeesAmount = 0;
        let schoolFeesAmount = 0;
        
        data.forEach(payment => {
          if (payment.payment_allocation && payment.payment_allocation.length > 0) {
            const allocation = payment.payment_allocation[0];
            busFeesAmount += parseFloat(allocation.bus_fee_amount || 0);
            schoolFeesAmount += parseFloat(allocation.school_fee_amount || 0);
          }
        });

        setSummary({
          totalAmount,
          cashAmount,
          onlineAmount,
          busFeesAmount,
          schoolFeesAmount
        });
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch payments'));
    } finally {
      setLoading(false);
    }
  }, [
    options.studentId,
    options.startDate,
    options.endDate,
    options.paymentMethod,
    options.page,
    options.limit
  ]);

  const createPayment = async (paymentData: Omit<FeePayment, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('fee_payments')
        .insert([paymentData])
        .select(`
          *,
          payment_allocation(*)
        `)
        .single();

      if (error) throw error;

      // Process payment to include allocation
      const processedPayment = {
        ...data,
        allocation: data.payment_allocation?.[0] || null
      };

      // Update local state
      setPayments(prev => [processedPayment, ...prev]);
      setTotalCount(prev => prev + 1);

      // Update summary
      setSummary(prev => ({
        ...prev,
        totalAmount: prev.totalAmount + parseFloat(data.amount_paid),
        cashAmount: data.payment_method === 'cash' 
          ? prev.cashAmount + parseFloat(data.amount_paid) 
          : prev.cashAmount,
        onlineAmount: data.payment_method === 'online' 
          ? prev.onlineAmount + parseFloat(data.amount_paid) 
          : prev.onlineAmount,
        busFeesAmount: prev.busFeesAmount + parseFloat(data.payment_allocation?.[0]?.bus_fee_amount || 0),
        schoolFeesAmount: prev.schoolFeesAmount + parseFloat(data.payment_allocation?.[0]?.school_fee_amount || 0)
      }));

      return processedPayment;
    } catch (err) {
      console.error('Error creating payment:', err);
      throw err instanceof Error ? err : new Error('Failed to create payment');
    }
  };

  const updatePayment = async (paymentId: string, paymentData: Partial<FeePayment>) => {
    try {
      setLoading(true);
      
      // Get the original payment to calculate summary adjustments
      const { data: originalPayment, error: fetchError } = await supabase
        .from('fee_payments')
        .select(`
          amount_paid,
          payment_method,
          payment_allocation(bus_fee_amount, school_fee_amount)
        `)
        .eq('id', paymentId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Update the payment
      const { data, error } = await supabase
        .from('fee_payments')
        .update({
          amount_paid: paymentData.amount_paid,
          payment_date: paymentData.payment_date,
          payment_method: paymentData.payment_method,
          notes: paymentData.notes,
          metadata: paymentData.metadata || {},
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId)
        .select(`
          *,
          student:student_id(
            id,
            student_name,
            admission_number,
            class:class_id(name)
          ),
          payment_allocation(*)
        `)
        .single();

      if (error) throw error;

      // Process payment to include allocation
      const processedPayment = {
        ...data,
        allocation: data.payment_allocation?.[0] || null
      };

      // Update local state
      setPayments(prev => prev.map(payment => 
        payment.id === paymentId ? processedPayment : payment
      ));

      // Recalculate allocation if amount changed
      if (paymentData.amount_paid && paymentData.amount_paid !== originalPayment.amount_paid) {
        await recalculatePaymentAllocation(paymentId);
      }

      // Refresh payments to get updated allocations
      await fetchPayments();

      return processedPayment;
    } catch (err) {
      console.error('Error updating payment:', err);
      throw err instanceof Error ? err : new Error('Failed to update payment');
    } finally {
      setLoading(false);
    }
  };

  const deletePayment = async (paymentId: string) => {
    try {
      setLoading(true);
      
      // Get the payment details before deleting for summary adjustment
      const { data: paymentToDelete, error: fetchError } = await supabase
        .from('fee_payments')
        .select(`
          amount_paid,
          payment_method,
          payment_allocation(bus_fee_amount, school_fee_amount)
        `)
        .eq('id', paymentId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Delete the payment
      const { error } = await supabase
        .from('fee_payments')
        .delete()
        .eq('id', paymentId);

      if (error) throw error;

      // Update local state
      setPayments(prev => prev.filter(payment => payment.id !== paymentId));
      setTotalCount(prev => prev - 1);

      // Update summary
      if (paymentToDelete) {
        const paymentAmount = parseFloat(paymentToDelete.amount_paid);
        const busAmount = paymentToDelete.payment_allocation?.[0]?.bus_fee_amount 
          ? parseFloat(paymentToDelete.payment_allocation[0].bus_fee_amount) 
          : 0;
        const schoolAmount = paymentToDelete.payment_allocation?.[0]?.school_fee_amount 
          ? parseFloat(paymentToDelete.payment_allocation[0].school_fee_amount) 
          : 0;
          
        setSummary(prev => ({
          ...prev,
          totalAmount: prev.totalAmount - paymentAmount,
          cashAmount: paymentToDelete.payment_method === 'cash' 
            ? prev.cashAmount - paymentAmount 
            : prev.cashAmount,
          onlineAmount: paymentToDelete.payment_method === 'online' 
            ? prev.onlineAmount - paymentAmount 
            : prev.onlineAmount,
          busFeesAmount: prev.busFeesAmount - busAmount,
          schoolFeesAmount: prev.schoolFeesAmount - schoolAmount
        }));
      }
      
      return true;
    } catch (err) {
      console.error('Error deleting payment:', err);
      throw err instanceof Error ? err : new Error('Failed to delete payment');
    } finally {
      setLoading(false);
    }
  };

  const getPaymentReceipt = async (paymentId: string) => {
    try {
      const { data, error } = await supabase
        .from('fee_payments')
        .select(`
          *,
          student:student_id(
            id,
            student_name,
            admission_number,
            class:class_id(name),
            section
          ),
          payment_allocation(*),
          created_by_user:created_by(name)
        `)
        .eq('id', paymentId)
        .single();

      if (error) throw error;

      // Format receipt data
      const receipt = {
        receiptNumber: data.receipt_number,
        date: new Date(data.payment_date).toLocaleDateString('en-IN'),
        student: {
          name: data.student.student_name,
          admissionNumber: data.student.admission_number,
          class: data.student.class?.name?.split('-')[0] || '',
          section: data.student.section || data.student.class?.name?.split('-')[1] || '',
        },
        busAmount: data.payment_allocation?.[0]?.bus_fee_amount || 0,
        schoolAmount: data.payment_allocation?.[0]?.school_fee_amount || 0,
        total: data.amount_paid,
        paymentMethod: data.payment_method,
        transactionId: data.transaction_id,
        collectedBy: data.created_by_user?.name || 'System'
      };

      return receipt;
    } catch (err) {
      console.error('Error fetching payment receipt:', err);
      throw err instanceof Error ? err : new Error('Failed to fetch payment receipt');
    }
  };

  const recalculatePaymentAllocation = async (paymentId: string) => {
    try {
      setLoading(true);
      
      // Call the RPC function to recalculate a specific payment allocation
      const { error } = await supabase.rpc('recalculate_payment_allocation', {
        p_payment_id: paymentId
      });
      
      if (error) throw error;
      
      // Refresh payments after recalculation
      await fetchPayments();
      
      return { success: true };
    } catch (err) {
      console.error('Error recalculating payment allocation:', err);
      throw err instanceof Error ? err : new Error('Failed to recalculate payment allocation');
    } finally {
      setLoading(false);
    }
  };

  // Function to recalculate all payment allocations
  const recalculateAllAllocations = async () => {
    try {
      setLoading(true);
      
      // Call the RPC function to recalculate all allocations
      const { error } = await supabase.rpc('recalculate_all_payment_allocations');
      
      if (error) throw error;
      
      // Refresh payments after recalculation
      await fetchPayments();
      
      return { success: true };
    } catch (err) {
      console.error('Error recalculating allocations:', err);
      throw err instanceof Error ? err : new Error('Failed to recalculate allocations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  return {
    payments,
    loading,
    error,
    totalCount,
    summary,
    fetchPayments,
    createPayment,
    updatePayment,
    deletePayment,
    getPaymentReceipt,
    recalculatePaymentAllocation,
    recalculateAllAllocations
  };
}