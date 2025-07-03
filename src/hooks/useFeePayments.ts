import { useState, useEffect, useCallback } from 'react';
import { supabase, handleApiError, isAuthError } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FeePayment } from '../types/fees';
import { toast } from 'react-hot-toast';

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
  const { handleError } = useAuth();

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
          manual_payment_allocation(*),
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

      if (fetchError) {
        if (isAuthError(fetchError)) {
          handleError(fetchError);
          return;
        }
        throw fetchError;
      }

      // Process payments to include allocation data
      const processedPayments = data?.map(payment => {
        // Get allocation data from manual_payment_allocation or payment_allocation or metadata
        const busAmount = payment.manual_payment_allocation?.[0]?.bus_fee_amount || 
                         payment.payment_allocation?.[0]?.bus_fee_amount || 
                         payment.metadata?.bus_fee_amount || 0;
                         
        const schoolAmount = payment.manual_payment_allocation?.[0]?.school_fee_amount || 
                            payment.payment_allocation?.[0]?.school_fee_amount || 
                            payment.metadata?.school_fee_amount || 0;
        
        return {
          ...payment,
          allocation: {
            bus_fee_amount: busAmount,
            school_fee_amount: schoolAmount
          }
        };
      }) || [];

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
          // Get allocation data from manual_payment_allocation or payment_allocation or metadata
          const busAmount = payment.manual_payment_allocation?.[0]?.bus_fee_amount || 
                           payment.payment_allocation?.[0]?.bus_fee_amount || 
                           payment.metadata?.bus_fee_amount || 0;
                           
          const schoolAmount = payment.manual_payment_allocation?.[0]?.school_fee_amount || 
                              payment.payment_allocation?.[0]?.school_fee_amount || 
                              payment.metadata?.school_fee_amount || 0;
          
          busFeesAmount += parseFloat(busAmount);
          schoolFeesAmount += parseFloat(schoolAmount);
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
      handleApiError(err, fetchPayments);
    } finally {
      setLoading(false);
    }
  }, [
    options.studentId,
    options.startDate,
    options.endDate,
    options.paymentMethod,
    options.page,
    options.limit,
    handleError
  ]);

  const createPayment = async (paymentData: any) => {
    try {
      // Use the manual fee payment function
      const { data, error } = await supabase.rpc(
        'insert_manual_fee_payment',
        {
          p_student_id: paymentData.student_id,
          p_amount_paid: parseFloat(paymentData.amount_paid),
          p_payment_date: paymentData.payment_date,
          p_payment_method: paymentData.payment_method,
          p_receipt_number: paymentData.receipt_number,
          p_notes: paymentData.notes,
          p_created_by: paymentData.created_by,
          p_academic_year_id: paymentData.academic_year_id,
          p_bus_fee_amount: parseFloat(paymentData.bus_fee_amount) || 0,
          p_school_fee_amount: parseFloat(paymentData.school_fee_amount) || 0
        }
      );

      if (error) {
        if (isAuthError(error)) {
          handleError(error);
          return null;
        }
        throw error;
      }

      // Fetch the created payment
      const { data: payment, error: fetchError } = await supabase
        .from('fee_payments')
        .select(`
          *,
          manual_payment_allocation(*)
        `)
        .eq('id', data.payment_id)
        .single();

      if (fetchError) {
        if (isAuthError(fetchError)) {
          handleError(fetchError);
          return null;
        }
        throw fetchError;
      }

      // Update local state
      setPayments(prev => [payment, ...prev]);
      setTotalCount(prev => prev + 1);

      // Update summary
      setSummary(prev => ({
        ...prev,
        totalAmount: prev.totalAmount + parseFloat(payment.amount_paid),
        cashAmount: payment.payment_method === 'cash' 
          ? prev.cashAmount + parseFloat(payment.amount_paid) 
          : prev.cashAmount,
        onlineAmount: payment.payment_method === 'online' 
          ? prev.onlineAmount + parseFloat(payment.amount_paid) 
          : prev.onlineAmount,
        busFeesAmount: prev.busFeesAmount + parseFloat(payment.manual_payment_allocation?.[0]?.bus_fee_amount || 0),
        schoolFeesAmount: prev.schoolFeesAmount + parseFloat(payment.manual_payment_allocation?.[0]?.school_fee_amount || 0)
      }));

      return payment;
    } catch (err) {
      console.error('Error creating payment:', err);
      handleApiError(err);
      throw err instanceof Error ? err : new Error('Failed to create payment');
    }
  };

  const updatePayment = async (paymentId: string, updateData: any) => {
    try {
      // Use the manual fee payment update function
      const { data, error } = await supabase.rpc(
        'update_manual_fee_payment',
        {
          p_payment_id: paymentId,
          p_amount_paid: parseFloat(updateData.amount_paid),
          p_payment_date: updateData.payment_date,
          p_payment_method: updateData.payment_method,
          p_notes: updateData.notes,
          p_bus_fee_amount: parseFloat(updateData.bus_fee_amount) || 0,
          p_school_fee_amount: parseFloat(updateData.school_fee_amount) || 0
        }
      );

      if (error) {
        if (isAuthError(error)) {
          handleError(error);
          return false;
        }
        throw error;
      }

      // Refresh payments to get updated data
      await fetchPayments();

      return true;
    } catch (err) {
      console.error('Error updating payment:', err);
      handleApiError(err);
      throw err instanceof Error ? err : new Error('Failed to update payment');
    }
  };

  const deletePayment = async (paymentId: string) => {
    try {
      const { error } = await supabase
        .from('fee_payments')
        .delete()
        .eq('id', paymentId);

      if (error) {
        if (isAuthError(error)) {
          handleError(error);
          return false;
        }
        throw error;
      }

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
      handleApiError(err);
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
          manual_payment_allocation(*),
          payment_allocation(*),
          created_by_user:created_by(name)
        `)
        .eq('id', paymentId)
        .single();

      if (error) {
        if (isAuthError(error)) {
          handleError(error);
          return null;
        }
        throw error;
      }

      // Get allocation data
      const busAmount = data.manual_payment_allocation?.[0]?.bus_fee_amount || 
                       data.payment_allocation?.[0]?.bus_fee_amount || 
                       data.metadata?.bus_fee_amount || 0;
                       
      const schoolAmount = data.manual_payment_allocation?.[0]?.school_fee_amount || 
                          data.payment_allocation?.[0]?.school_fee_amount || 
                          data.metadata?.school_fee_amount || 0;

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
        busAmount: busAmount,
        schoolAmount: schoolAmount,
        total: data.amount_paid,
        paymentMethod: data.payment_method,
        transactionId: data.transaction_id,
        collectedBy: data.created_by_user?.name || 'System'
      };

      return receipt;
    } catch (err) {
      console.error('Error fetching payment receipt:', err);
      handleApiError(err);
      throw err instanceof Error ? err : new Error('Failed to fetch payment receipt');
    }
  };

  // Function to recalculate all payment allocations (admin only)
  const recalculateAllAllocations = async () => {
    try {
      const { error } = await supabase.rpc('recalculate_all_payment_allocations');
      if (error) {
        if (isAuthError(error)) {
          handleError(error);
          return false;
        }
        throw error;
      }
      await fetchPayments();
      return true;
    } catch (err) {
      console.error('Error recalculating allocations:', err);
      handleApiError(err);
      throw err instanceof Error ? err : new Error('Failed to recalculate allocations');
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
    recalculateAllAllocations
  };
}