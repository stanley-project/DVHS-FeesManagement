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

  const updatePayment = async (paymentId: string, updateData: any) => {
    try {
      // Update the payment
      const { error: updateError } = await supabase
        .from('fee_payments')
        .update(updateData)
        .eq('id', paymentId);

      if (updateError) throw updateError;

      // Recalculate the payment allocation
      const { error: recalcError } = await supabase.rpc(
        'recalculate_payment_allocation',
        { p_payment_id: paymentId }
      );

      if (recalcError) {
        console.error('Error recalculating payment allocation:', recalcError);
        // Continue even if recalculation fails
      }

      // Refresh payments to get updated data
      await fetchPayments();

      return true;
    } catch (err) {
      console.error('Error updating payment:', err);
      throw err instanceof Error ? err : new Error('Failed to update payment');
    }
  };

  const deletePayment = async (paymentId: string) => {
    try {
      const { error } = await supabase
        .from('fee_payments')
        .delete()
        .eq('id', paymentId);

      if (error) throw error;

      // Update local state
      const deletedPayment = payments.find(p => p.id === paymentId);
      if (deletedPayment) {
        setPayments(prev => prev.filter(p => p.id !== paymentId));
        setTotalCount(prev => prev - 1);

        // Update summary
        setSummary(prev => ({
          ...prev,
          totalAmount: prev.totalAmount - parseFloat(deletedPayment.amount_paid),
          cashAmount: deletedPayment.payment_method === 'cash' 
            ? prev.cashAmount - parseFloat(deletedPayment.amount_paid) 
            : prev.cashAmount,
          onlineAmount: deletedPayment.payment_method === 'online' 
            ? prev.onlineAmount - parseFloat(deletedPayment.amount_paid) 
            : prev.onlineAmount,
          busFeesAmount: prev.busFeesAmount - parseFloat(deletedPayment.allocation?.bus_fee_amount || 0),
          schoolFeesAmount: prev.schoolFeesAmount - parseFloat(deletedPayment.allocation?.school_fee_amount || 0)
        }));
      }

      return true;
    } catch (err) {
      console.error('Error deleting payment:', err);
      throw err instanceof Error ? err : new Error('Failed to delete payment');
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

      // Format receipt data with defensive checks
      const className = data.student?.class?.name || '';
      const receipt = {
        receiptNumber: data.receipt_number,
        date: new Date(data.payment_date).toLocaleDateString('en-IN'),
        student: {
          name: data.student?.student_name || '',
          admissionNumber: data.student?.admission_number || '',
          class: className.split('-')[0] || '',
          section: data.student?.section || className.split('-')[1] || '',
        },
        busAmount: data.payment_allocation?.[0]?.bus_fee_amount || 0,
        schoolAmount: data.payment_allocation?.[0]?.school_fee_amount || 0,
        total: data.amount_paid,
        paymentMethod: data.payment_method,
        transactionId: data.transaction_id,
        collectedBy: data.created_by_user?.name || 'System',
        splitType: data.metadata?.split_type || 'standard',
        paymentPeriod: data.metadata?.payment_period || 'current',
        paymentMonths: data.metadata?.payment_months || 1
      };

      return receipt;
    } catch (err) {
      console.error('Error fetching payment receipt:', err);
      throw err instanceof Error ? err : new Error('Failed to fetch payment receipt');
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
    getPaymentReceipt
  };
}