import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface FeePaymentFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  studentId?: string;
  registrationType?: 'new' | 'continuing';
}

interface FeeStatus {
  total_bus_fees: number;
  total_school_fees: number;
  total_fees: number;
  paid_bus_fees: number;
  paid_school_fees: number;
  total_paid: number;
  pending_bus_fees: number;
  pending_school_fees: number;
  total_pending: number;
}

const FeePaymentForm = ({ onSubmit, onCancel, studentId, registrationType }: FeePaymentFormProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feeStatus, setFeeStatus] = useState<FeeStatus | null>(null);
  const [formData, setFormData] = useState({
    amount_paid: '',
    payment_method: 'cash' as 'cash' | 'online',
    transaction_id: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    if (studentId) {
      fetchFeeStatus();
    }
  }, [studentId]);

  const fetchFeeStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get current academic year
      const { data: academicYear, error: yearError } = await supabase
        .from('academic_years')
        .select('id')
        .eq('is_current', true)
        .single();

      if (yearError) {
        throw new Error('Failed to fetch current academic year');
      }

      // Get student details
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('village_id, has_school_bus')
        .eq('id', studentId)
        .single();

      if (studentError) {
        throw new Error('Failed to fetch student details');
      }

      // Calculate total fees
      let totalBusFees = 0;
      let totalSchoolFees = 0;

      // Get bus fees if student uses school bus
      if (student.has_school_bus && student.village_id) {
        const { data: busFee, error: busFeeError } = await supabase
          .from('bus_fee_structure')
          .select('fee_amount')
          .eq('village_id', student.village_id)
          .eq('academic_year_id', academicYear.id)
          .eq('is_active', true)
          .maybeSingle();

        if (!busFeeError && busFee) {
          totalBusFees = parseFloat(busFee.fee_amount);
        }
      }

      // Get school fees
      const { data: schoolFees, error: schoolFeeError } = await supabase
        .from('fee_structure')
        .select(`
          amount,
          applicable_to_new_students_only
        `)
        .eq('academic_year_id', academicYear.id)
        .eq('class_id', student.class_id);

      if (!schoolFeeError && schoolFees) {
        // Filter fees based on registration type
        const applicableFees = schoolFees.filter(fee => 
          registrationType === 'new' || !fee.applicable_to_new_students_only
        );
        
        totalSchoolFees = applicableFees.reduce((sum, fee) => 
          sum + parseFloat(fee.amount), 0);
      }

      // Get paid amounts
      const { data: payments, error: paymentsError } = await supabase
        .from('fee_payments')
        .select(`
          id,
          amount_paid,
          payment_allocation (
            bus_fee_amount,
            school_fee_amount
          )
        `)
        .eq('student_id', studentId);

      if (paymentsError) {
        throw paymentsError;
      }

      let paidBusFees = 0;
      let paidSchoolFees = 0;

      if (payments && payments.length > 0) {
        payments.forEach(payment => {
          if (payment.payment_allocation && payment.payment_allocation.length > 0) {
            const allocation = payment.payment_allocation[0];
            paidBusFees += parseFloat(allocation.bus_fee_amount || 0);
            paidSchoolFees += parseFloat(allocation.school_fee_amount || 0);
          } else {
            // For older payments without allocation, assume all went to school fees
            paidSchoolFees += parseFloat(payment.amount_paid || 0);
          }
        });
      }

      // Calculate pending amounts
      const pendingBusFees = Math.max(0, totalBusFees - paidBusFees);
      const pendingSchoolFees = Math.max(0, totalSchoolFees - paidSchoolFees);

      setFeeStatus({
        total_bus_fees: totalBusFees,
        total_school_fees: totalSchoolFees,
        total_fees: totalBusFees + totalSchoolFees,
        paid_bus_fees: paidBusFees,
        paid_school_fees: paidSchoolFees,
        total_paid: paidBusFees + paidSchoolFees,
        pending_bus_fees: pendingBusFees,
        pending_school_fees: pendingSchoolFees,
        total_pending: pendingBusFees + pendingSchoolFees
      });

    } catch (error: any) {
      console.error('Error fetching fee status:', error);
      setError(error.message || 'Failed to fetch fee status');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!formData.amount_paid || parseFloat(formData.amount_paid) <= 0) {
      setError('Amount must be greater than 0');
      return false;
    }

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

    // Validate transaction ID for online payments
    if (formData.payment_method === 'online' && !formData.transaction_id.trim()) {
      setError('Transaction ID is required for online payments');
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

    try {
      // Generate receipt number
      const { data: receiptData, error: receiptError } = await supabase
        .rpc('generate_receipt_number');

      if (receiptError) throw new Error('Failed to generate receipt number');
      
      const receiptNumber = receiptData || `RC-${Date.now()}`;

      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from('fee_payments')
        .insert({
          student_id: studentId,
          amount_paid: parseFloat(formData.amount_paid),
          payment_date: formData.payment_date,
          payment_method: formData.payment_method,
          transaction_id: formData.transaction_id || null,
          receipt_number: receiptNumber,
          notes: formData.notes,
          created_by: user?.id
        })
        .select('*, payment_allocation(*)')
        .single();

      if (paymentError) throw paymentError;

      onSubmit(payment);
    } catch (error: any) {
      console.error('Error processing payment:', error);
      setError(error.message || 'Failed to process payment. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading fee information...</span>
      </div>
    );
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
          <h3 className="font-medium">Fee Summary</h3>
          
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

          {feeStatus.total_pending > 0 && (
            <div className="text-sm text-muted-foreground mt-2">
              <p>Note: Payments will be automatically allocated to bus fees first, then school fees.</p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="amount_paid" className="block text-sm font-medium">
            Amount *
          </label>
          <div className="flex rounded-md shadow-sm">
            <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-muted-foreground text-sm">
              ₹
            </span>
            <input
              id="amount_paid"
              type="number"
              className="input rounded-l-none"
              placeholder="Enter amount"
              value={formData.amount_paid}
              onChange={(e) => setFormData({ ...formData, amount_paid: e.target.value })}
              required
              min="1"
              step="0.01"
            />
          </div>
          {feeStatus && feeStatus.total_pending > 0 && (
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => setFormData({ 
                ...formData, 
                amount_paid: feeStatus.total_pending.toString() 
              })}
            >
              Pay full pending amount (₹{feeStatus.total_pending.toLocaleString('en-IN')})
            </button>
          )}
        </div>
        
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
          >
            <option value="cash">Cash</option>
            <option value="online">Online Transfer</option>
          </select>
        </div>
        
        {formData.payment_method === 'online' && (
          <div className="space-y-2">
            <label htmlFor="transaction_id" className="block text-sm font-medium">
              Transaction ID *
            </label>
            <input
              id="transaction_id"
              type="text"
              className="input"
              placeholder="Enter transaction ID"
              value={formData.transaction_id}
              onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value })}
              required={formData.payment_method === 'online'}
            />
          </div>
        )}
        
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
          />
        </div>
      </div>
      
      <div className="border-t pt-4 flex flex-col sm:flex-row justify-end gap-3">
        <button
          type="button"
          className="btn btn-outline btn-md"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary btn-md"
        >
          Collect Fee & Generate Receipt
        </button>
      </div>
    </form>
  );
};

export default FeePaymentForm;