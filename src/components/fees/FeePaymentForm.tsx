import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Loader2, AlertTriangle, Info } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { FeeStatus, PaymentData } from '../../types/fee';
import { FeePaymentFormSkeleton } from '../Skeletons';

interface FeePaymentFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  studentId?: string;
  registrationType?: 'new' | 'continuing';
  academicYearId?: string;
}

const FeePaymentForm = ({ onSubmit, onCancel, studentId, registrationType, academicYearId }: FeePaymentFormProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<PaymentData>({
    student_id: studentId || '',
    amount_paid: 0,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    notes: '',
    receipt_number: `RC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    bus_fee_amount: 0,
    school_fee_amount: 0,
  });

  // Reset form when student changes
  useEffect(() => {
    if (studentId) {
      setFormData({
        student_id: studentId,
        amount_paid: 0,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'cash',
        notes: '',
        receipt_number: `RC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        bus_fee_amount: 0,
        school_fee_amount: 0,
      });
    }
  }, [studentId]);

  // Fetch fee status
  const { data: feeStatus, isLoading: loadingFeeStatus } = useQuery<FeeStatus>({
    queryKey: ['feeStatus', studentId, academicYearId],
    queryFn: async () => {
      if (!studentId || !academicYearId) {
        throw new Error('Student ID or Academic Year ID is missing');
      }
      
      const { data, error } = await supabase.rpc(
        'get_student_fee_status',
        { 
          p_student_id: studentId,
          p_academic_year_id: academicYearId
        }
      );

      if (error) throw error;
      console.log('Fee status data:', data);
      return data;
    },
    enabled: !!studentId && !!academicYearId,
    onSuccess: (data) => {
      // Check if student has bus service
      const hasBusFees = data && data.total_bus_fees > 0;
      
      // Pre-fill form with pending amounts
      if (hasBusFees) {
        // If student has bus service, set both bus and school fees
        setFormData(prev => ({
          ...prev,
          student_id: studentId || '',
          bus_fee_amount: data.pending_bus_fees,
          school_fee_amount: data.pending_school_fees,
          amount_paid: data.total_pending
        }));
      } else {
        // If no bus service, allocate everything to school fees
        setFormData(prev => ({
          ...prev,
          student_id: studentId || '',
          bus_fee_amount: 0, // Explicitly set to 0
          school_fee_amount: data.pending_school_fees,
          amount_paid: data.pending_school_fees // Total is just the school fees
        }));
      }
    },
    onError: (err) => {
      console.error('Error fetching fee status:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch fee status');
    }
  });

  // Payment mutation
  const paymentMutation = useMutation({
    mutationFn: async (paymentData: PaymentData) => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Generate receipt number
      const receiptNumber = `RC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Use the manual fee payment function
      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        'insert_manual_fee_payment',
        {
          p_student_id: paymentData.student_id,
          p_amount_paid: Number(paymentData.amount_paid),
          p_payment_date: paymentData.payment_date,
          p_payment_method: paymentData.payment_method,
          p_receipt_number: receiptNumber,
          p_notes: paymentData.notes,
          p_created_by: user.id,
          p_academic_year_id: academicYearId,
          p_bus_fee_amount: Number(paymentData.bus_fee_amount || 0),
          p_school_fee_amount: Number(paymentData.school_fee_amount || 0)
        }
      );

      if (rpcError) {
        console.error('RPC error:', rpcError);
        throw rpcError;
      }

      // Fetch the created payment with its allocation
      const { data: payment, error: fetchError } = await supabase
        .from('fee_payments')
        .select(`
          *,
          manual_payment_allocation (*)
        `)
        .eq('id', rpcResult.payment_id)
        .single();

      if (fetchError) {
        console.error('Error fetching created payment:', fetchError);
        throw new Error('Payment created but failed to retrieve details');
      }

      return payment;
    },
    onSuccess: (data) => {
      onSubmit(data);
      
      // Reset form
      setFormData({
        student_id: studentId || '',
        amount_paid: 0,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'cash',
        notes: '',
        receipt_number: `RC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        bus_fee_amount: 0,
        school_fee_amount: 0,
      });
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['feeStatus', studentId, academicYearId] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['payments', studentId] });
    },
    onError: (err) => {
      console.error('Error processing payment:', err);
      setError(err instanceof Error ? err.message : 'Failed to process payment. Please try again.');
    }
  });

  // Update total amount when individual fee amounts change
  useEffect(() => {
    const busAmount = Number(formData.bus_fee_amount ?? 0);
    const schoolAmount = Number(formData.school_fee_amount ?? 0);
    setFormData(prev => ({
      ...prev,
      amount_paid: busAmount + schoolAmount
    }));
  }, [formData.bus_fee_amount, formData.school_fee_amount]);

  const handleFeeAmountChange = (field: 'bus_fee_amount' | 'school_fee_amount', value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleTotalAmountChange = (value: string) => {
    const totalAmount = Number(value) || 0;
    
    // Check if student has bus service
    const hasBusFees = feeStatus && feeStatus.total_bus_fees > 0;
    
    setFormData(prev => {
      if (hasBusFees) {
        // If student has bus service, distribute between bus and school fees
        // Get current fee amounts
        const busAmount = Number(prev.bus_fee_amount ?? 0);
        const schoolAmount = Number(prev.school_fee_amount ?? 0);
        const currentTotal = busAmount + schoolAmount;
        
        // If current total is zero, distribute evenly
        if (currentTotal === 0) {
          return {
            ...prev,
            amount_paid: totalAmount,
            bus_fee_amount: (totalAmount / 2),
            school_fee_amount: (totalAmount / 2)
          };
        }
        
        // Otherwise, distribute proportionally
        const busRatio = busAmount / currentTotal;
        const newBusAmount = Math.round((totalAmount * busRatio) * 100) / 100;
        
        return {
          ...prev,
          amount_paid: totalAmount,
          bus_fee_amount: newBusAmount,
          school_fee_amount: (totalAmount - newBusAmount)
        };
      } else {
        // If no bus service, allocate everything to school fees
        return {
          ...prev,
          amount_paid: totalAmount,
          bus_fee_amount: 0, // Explicitly set to 0
          school_fee_amount: totalAmount
        };
      }
    });
  };

  const validateForm = () => {
    if (!formData.payment_date) {
      setError('Payment date is required');
      return false;
    }

    // Check if payment date is not in the future
    const paymentDate = new Date(formData.payment_date);
    if (paymentDate > new Date()) {
      setError('Payment date cannot be in the future');
      return false;
    }

    if (!academicYearId) {
      setError('Academic year information is missing');
      return false;
    }

    const busAmount = Number(formData.bus_fee_amount ?? 0);
    const schoolAmount = Number(formData.school_fee_amount ?? 0);
    const totalAmount = Number(formData.amount_paid ?? 0);

    if (busAmount < 0 || schoolAmount < 0) {
      setError('Fee amounts cannot be negative');
      return false;
    }

    if (busAmount + schoolAmount === 0) {
      setError('Total payment amount must be greater than 0');
      return false;
    }

    // Check if the sum of individual fees matches the total
    const calculatedTotal = busAmount + schoolAmount;
    if (Math.abs(calculatedTotal - totalAmount) > 0.01) { // Allow for small rounding differences
      setError(`The sum of individual fees (${calculatedTotal.toFixed(2)}) must equal the total amount (${totalAmount.toFixed(2)})`);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    if (!user) {
      setError('User not authenticated');
      return;
    }

    await paymentMutation.mutate({
      ...formData,
      student_id: studentId || '',
      created_by: user.id,
      academic_year_id: academicYearId
    });
  };

  if (loadingFeeStatus) {
    return <FeePaymentFormSkeleton />;
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {error && (
        <div className="bg-error/10 border border-error/30 text-error rounded-md p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {feeStatus && (
        <div className="bg-muted p-4 rounded-md space-y-4">
          <h3 className="font-medium mb-2">Fee Summary</h3>
          
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total Fees</p>
              <p className="font-medium">₹{feeStatus.total_fees.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Paid Amount</p>
              <p className="font-medium text-success">₹{feeStatus.total_paid.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Pending Amount</p>
              <p className="font-medium text-warning">₹{feeStatus.total_pending.toLocaleString('en-IN')}</p>
            </div>
          </div>

          {feeStatus.total_bus_fees > 0 && (
            <div className="pt-2 border-t">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Bus Fees</p>
                  <p className="font-medium">₹{feeStatus.total_bus_fees.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-muted-foreground">Monthly: ₹{feeStatus.monthly_bus_fee.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Paid</p>
                  <p className="font-medium">₹{feeStatus.paid_bus_fees.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Pending</p>
                  <p className="font-medium">₹{feeStatus.pending_bus_fees.toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>
          )}

          <div className="pt-2 border-t">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">School Fees</p>
                <p className="font-medium">₹{feeStatus.total_school_fees.toLocaleString('en-IN')}</p>
                <p className="text-xs text-muted-foreground">Monthly: ₹{feeStatus.monthly_school_fee.toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Paid</p>
                <p className="font-medium">₹{feeStatus.paid_school_fees.toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Pending</p>
                <p className="font-medium">₹{feeStatus.pending_school_fees.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="payment_date" className="block text-sm font-medium">
            Payment Date *
          </label>
          <input
            id="payment_date"
            type="date"
            className="input"
            value={formData.payment_date}
            onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
            required
            disabled={paymentMutation.isPending}
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="payment_method" className="block text-sm font-medium">
            Payment Mode *
          </label>
          <select
            id="payment_method"
            className="input"
            value={formData.payment_method}
            onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as 'cash' | 'online' })}
            required
            disabled={paymentMutation.isPending}
          >
            <option value="cash">Cash</option>
            <option value="online">Online Transfer</option>
          </select>
        </div>

        {/* Fee Amount Fields */}
        <div className="space-y-2 md:col-span-2">
          <h4 className="text-md font-medium">Fee Allocation</h4>
          <p className="text-sm text-muted-foreground mb-2">
            Enter the amount to be allocated to each fee category
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Bus Fee Amount - Only show if student has bus service */}
            {feeStatus && feeStatus.total_bus_fees > 0 && (
              <div className="space-y-2">
                <label htmlFor="bus_fee_amount" className="block text-sm font-medium">
                  Bus Fee Amount
                </label>
                <div className="flex rounded-md shadow-sm">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-muted-foreground text-sm">
                    ₹
                  </span>
                  <input
                    id="bus_fee_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    className="input rounded-l-none"
                    value={formData.bus_fee_amount}
                    onChange={(e) => handleFeeAmountChange('bus_fee_amount', e.target.value)}
                    disabled={paymentMutation.isPending}
                  />
                </div>
                {feeStatus.pending_bus_fees > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Pending: ₹{feeStatus.pending_bus_fees.toLocaleString('en-IN')}</span>
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => setFormData({ 
                        ...formData, 
                        bus_fee_amount: feeStatus.pending_bus_fees
                      })}
                      disabled={paymentMutation.isPending}
                    >
                      Use pending
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* School Fee Amount */}
            <div className="space-y-2">
              <label htmlFor="school_fee_amount" className="block text-sm font-medium">
                School Fee Amount
              </label>
              <div className="flex rounded-md shadow-sm">
                <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-muted-foreground text-sm">
                  ₹
                </span>
                <input
                  id="school_fee_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  className="input rounded-l-none"
                  value={formData.school_fee_amount}
                  onChange={(e) => handleFeeAmountChange('school_fee_amount', e.target.value)}
                  disabled={paymentMutation.isPending}
                />
              </div>
              {feeStatus && feeStatus.pending_school_fees > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Pending: ₹{feeStatus.pending_school_fees.toLocaleString('en-IN')}</span>
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => setFormData({ 
                      ...formData, 
                      school_fee_amount: feeStatus.pending_school_fees
                    })}
                    disabled={paymentMutation.isPending}
                  >
                    Use pending
                  </button>
                </div>
              )}
            </div>

            {/* Total Amount */}
            <div className="space-y-2">
              <label htmlFor="total_amount" className="block text-sm font-medium">
                Total Amount *
              </label>
              <div className="flex rounded-md shadow-sm">
                <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-muted-foreground text-sm">
                  ₹
                </span>
                <input
                  id="total_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  className="input rounded-l-none"
                  value={formData.amount_paid}
                  onChange={(e) => handleTotalAmountChange(e.target.value)}
                  required
                  disabled={paymentMutation.isPending}
                />
              </div>
              {feeStatus && feeStatus.total_pending > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Total pending: ₹{feeStatus.total_pending.toLocaleString('en-IN')}</span>
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => handleTotalAmountChange(feeStatus.total_pending.toString())}
                    disabled={paymentMutation.isPending}
                  >
                    Use total pending
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="space-y-2 md:col-span-2">
          <label htmlFor="notes" className="block text-sm font-medium">
            Remarks
          </label>
          <textarea
            id="notes"
            rows={3}
            className="input"
            placeholder="Any additional information about this payment"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            disabled={paymentMutation.isPending}
          />
        </div>
      </div>

      {/* Payment Allocation Preview */}
      <div className="bg-muted/50 p-4 rounded-md border">
        <div className="flex items-center gap-2 mb-2">
          <Info className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-medium">Payment Summary</h4>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Bus Fee Amount</p>
            <p className="font-medium">₹{Number(formData.bus_fee_amount ?? 0).toLocaleString('en-IN')}</p>
            {Number(formData.amount_paid ?? 0) > 0 && (
              <p className="text-xs text-muted-foreground">
                {Math.round((Number(formData.bus_fee_amount ?? 0) / Number(formData.amount_paid ?? 0)) * 100)}% of payment
              </p>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">School Fee Amount</p>
            <p className="font-medium">₹{Number(formData.school_fee_amount ?? 0).toLocaleString('en-IN')}</p>
            {Number(formData.amount_paid ?? 0) > 0 && (
              <p className="text-xs text-muted-foreground">
                {Math.round((Number(formData.school_fee_amount ?? 0) / Number(formData.amount_paid ?? 0)) * 100)}% of payment
              </p>
            )}
          </div>
        </div>
      </div>
      
      <div className="border-t pt-4 flex flex-col sm:flex-row justify-end gap-3">
        <button
          type="button"
          className="btn btn-outline btn-md"
          onClick={onCancel}
          disabled={paymentMutation.isPending}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary btn-md"
          disabled={paymentMutation.isPending}
        >
          {paymentMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Collect Fee & Generate Receipt'
          )}
        </button>
      </div>
    </form>
  );
};

export default FeePaymentForm;