import { useState, useEffect } from 'react';
import { X, Loader2, AlertTriangle, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface EditPaymentModalProps {
  payment: any;
  onClose: () => void;
  onUpdate: () => void;
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
  monthly_bus_fee: number;
  monthly_school_fee: number;
}

const EditPaymentModal = ({ payment, onClose, onUpdate }: EditPaymentModalProps) => {
  const [formData, setFormData] = useState({
    amount_paid: '',
    payment_date: '',
    payment_method: '' as 'cash' | 'online',
    notes: '',
    split_type: 'standard' as 'standard' | 'proportional' | 'equal',
    payment_period: 'current' as 'current' | 'advance' | 'past',
    payment_months: 1
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feeStatus, setFeeStatus] = useState<FeeStatus | null>(null);
  const [allocationPreview, setAllocationPreview] = useState<{
    bus_allocation: number;
    school_allocation: number;
  } | null>(null);

  useEffect(() => {
    if (payment) {
      // Initialize form data from payment
      setFormData({
        amount_paid: payment.amount_paid.toString(),
        payment_date: payment.payment_date,
        payment_method: payment.payment_method,
        notes: payment.notes || '',
        split_type: payment.metadata?.split_type || 'standard',
        payment_period: payment.metadata?.payment_period || 'current',
        payment_months: payment.metadata?.payment_months || 1
      });
      
      // Fetch fee status for the student
      fetchFeeStatus(payment.student_id, payment.academic_year_id, payment.id);
    }
  }, [payment]);

  useEffect(() => {
    // Calculate allocation preview when amount or split type changes
    if (feeStatus && formData.amount_paid) {
      calculateAllocationPreview();
    }
  }, [formData.amount_paid, formData.split_type, feeStatus]);

  const fetchFeeStatus = async (studentId: string, academicYearId: string, paymentId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Get student details with class information
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select(`
          village_id, has_school_bus, class_id, bus_start_date
        `)
        .eq('id', studentId)
        .single();

      if (studentError) throw studentError;

      // Calculate total fees
      let totalBusFees = 0;
      let totalSchoolFees = 0;
      let monthlyBusFee = 0;
      let monthlySchoolFee = 0;

      // Calculate months passed since academic year start
      const currentDate = new Date();
      const { data: academicYearData } = await supabase
        .from('academic_years')
        .select('start_date')
        .eq('id', academicYearId)
        .single();
        
      const academicYearStartDate = academicYearData ? new Date(academicYearData.start_date) : new Date();
      
      // Calculate months passed for school fees (from academic year start)
      const monthsPassedSchool = calculateMonthsBetween(academicYearStartDate, currentDate);

      // Get bus fees if student uses school bus
      if (student.has_school_bus && student.village_id) {
        const { data: busFee, error: busFeeError } = await supabase
          .from('bus_fee_structure')
          .select('fee_amount')
          .eq('village_id', student.village_id)
          .eq('academic_year_id', academicYearId)
          .eq('is_active', true)
          .maybeSingle();

        if (!busFeeError && busFee) {
          // Use bus_start_date if available, otherwise use academic year start date
          const busStartDate = student.bus_start_date 
            ? new Date(student.bus_start_date) 
            : academicYearStartDate;
            
          // Calculate months passed for bus fees (from bus start date)
          const monthsPassedBus = calculateMonthsBetween(busStartDate, currentDate);
          
          // Monthly bus fee
          monthlyBusFee = parseFloat(busFee.fee_amount);
          totalBusFees = monthlyBusFee * monthsPassedBus;
        }
      }

      // Get school fees
      if (student.class_id) {
        const { data: schoolFees, error: schoolFeeError } = await supabase
          .from('fee_structure')
          .select(`
            id,
            amount,
            is_recurring_monthly,
            fee_type:fee_type_id(name, category, is_monthly)
          `)
          .eq('academic_year_id', academicYearId)
          .eq('class_id', student.class_id);

        if (!schoolFeeError && schoolFees) {
          // Calculate total school fees and monthly school fees
          schoolFees.forEach(fee => {
            const feeAmount = parseFloat(fee.amount);
            
            // Only include fees with category 'school' in the school fees calculation
            if (fee.fee_type?.category === 'school') {
              if (fee.is_recurring_monthly) {
                // Monthly fee
                monthlySchoolFee += feeAmount;
                const monthlyTotal = feeAmount * monthsPassedSchool;
                totalSchoolFees += monthlyTotal;
              } else {
                // One-time fee
                totalSchoolFees += feeAmount;
                // For monthly calculation, distribute one-time fees across the academic year
                monthlySchoolFee += feeAmount / monthsPassedSchool;
              }
            }
          });
        }
      }

      // Get paid amounts (excluding the current payment being edited)
      const { data: payments, error: paymentsError } = await supabase
        .from('fee_payments')
        .select(`
          id,
          amount_paid,
          payment_date,
          payment_allocation (
            bus_fee_amount,
            school_fee_amount
          )
        `)
        .eq('student_id', studentId)
        .neq('id', paymentId); // Exclude the current payment being edited

      if (paymentsError) throw paymentsError;

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

      // Calculate outstanding amount
      const pendingBusFees = Math.max(0, totalBusFees - paidBusFees);
      const pendingSchoolFees = Math.max(0, totalSchoolFees - paidSchoolFees);
      const totalPending = pendingBusFees + pendingSchoolFees;

      setFeeStatus({
        total_bus_fees: totalBusFees,
        total_school_fees: totalSchoolFees,
        total_fees: totalBusFees + totalSchoolFees,
        paid_bus_fees: paidBusFees,
        paid_school_fees: paidSchoolFees,
        total_paid: paidBusFees + paidSchoolFees,
        pending_bus_fees: pendingBusFees,
        pending_school_fees: pendingSchoolFees,
        total_pending: totalPending,
        monthly_bus_fee: monthlyBusFee,
        monthly_school_fee: monthlySchoolFee
      });

    } catch (error: any) {
      console.error('Error fetching fee status:', error);
      setError(error.message || 'Failed to fetch fee status');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to calculate months between two dates (inclusive of start month)
  const calculateMonthsBetween = (startDate: Date, endDate: Date): number => {
    return (
      (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      (endDate.getMonth() - startDate.getMonth()) +
      (endDate.getDate() >= startDate.getDate() ? 0 : -1) +
      1 // Add 1 to include the start month
    );
  };

  const calculateAllocationPreview = () => {
    if (!feeStatus || !formData.amount_paid) {
      setAllocationPreview(null);
      return;
    }

    const paymentAmount = parseFloat(formData.amount_paid);
    let busAllocation = 0;
    let schoolAllocation = 0;

    // Calculate based on split type
    if (formData.split_type === 'proportional') {
      // Calculate total monthly due
      const totalMonthlyDue = feeStatus.monthly_bus_fee + feeStatus.monthly_school_fee;
      
      // Calculate ratios
      const busRatio = totalMonthlyDue > 0 ? feeStatus.monthly_bus_fee / totalMonthlyDue : 0;
      const schoolRatio = totalMonthlyDue > 0 ? feeStatus.monthly_school_fee / totalMonthlyDue : 1;
      
      // Allocate proportionally
      busAllocation = Math.round((paymentAmount * busRatio) * 100) / 100;
      schoolAllocation = paymentAmount - busAllocation; // Ensure exact total
      
      // Adjust if allocations exceed pending amounts
      if (busAllocation > feeStatus.pending_bus_fees) {
        schoolAllocation += (busAllocation - feeStatus.pending_bus_fees);
        busAllocation = feeStatus.pending_bus_fees;
      }
      
      if (schoolAllocation > feeStatus.pending_school_fees) {
        busAllocation += (schoolAllocation - feeStatus.pending_school_fees);
        schoolAllocation = feeStatus.pending_school_fees;
      }
    } else if (formData.split_type === 'equal') {
      // Split equally
      busAllocation = Math.round((paymentAmount / 2) * 100) / 100;
      schoolAllocation = paymentAmount - busAllocation; // Ensure exact total
      
      // Adjust if allocations exceed pending amounts
      if (busAllocation > feeStatus.pending_bus_fees) {
        schoolAllocation += (busAllocation - feeStatus.pending_bus_fees);
        busAllocation = feeStatus.pending_bus_fees;
      }
      
      if (schoolAllocation > feeStatus.pending_school_fees) {
        busAllocation += (schoolAllocation - feeStatus.pending_school_fees);
        schoolAllocation = feeStatus.pending_school_fees;
      }
    } else {
      // Standard allocation: bus fees first, then school fees
      if (paymentAmount <= feeStatus.pending_bus_fees) {
        busAllocation = paymentAmount;
        schoolAllocation = 0;
      } else {
        busAllocation = feeStatus.pending_bus_fees;
        schoolAllocation = Math.min(paymentAmount - feeStatus.pending_bus_fees, feeStatus.pending_school_fees);
      }
    }

    setAllocationPreview({
      bus_allocation: busAllocation,
      school_allocation: schoolAllocation
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.amount_paid || parseFloat(formData.amount_paid) <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    if (!formData.payment_date) {
      setError('Payment date is required');
      return;
    }

    try {
      setSubmitting(true);

      // Prepare metadata with split options
      const metadata = {
        ...payment.metadata, // Preserve any existing metadata
        split_type: formData.split_type,
        payment_period: formData.payment_period,
        payment_months: formData.payment_months
      };

      // Update the payment
      const { error: updateError } = await supabase
        .from('fee_payments')
        .update({
          amount_paid: parseFloat(formData.amount_paid),
          payment_date: formData.payment_date,
          payment_method: formData.payment_method,
          notes: formData.notes,
          metadata: metadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id);

      if (updateError) {
        throw updateError;
      }

      // Recalculate the payment allocation
      const { error: recalcError } = await supabase.rpc(
        'recalculate_payment_allocation',
        { p_payment_id: payment.id }
      );

      if (recalcError) {
        console.error('Error recalculating payment allocation:', recalcError);
        // Continue even if recalculation fails
      }

      toast.success('Payment updated successfully');
      onUpdate();
      onClose();
    } catch (error: any) {
      console.error('Error updating payment:', error);
      setError(error.message || 'Failed to update payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-lg max-w-2xl w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Edit Payment</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-error/10 border border-error/30 text-error rounded-md p-4 flex items-start gap-3 mb-6">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading payment information...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
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
                      disabled={submitting}
                    />
                  </div>
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
                    disabled={submitting}
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
                    disabled={submitting}
                  >
                    <option value="cash">Cash</option>
                    <option value="online">Online Transfer</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="split_type" className="block text-sm font-medium">
                    Payment Allocation Method *
                  </label>
                  <select
                    id="split_type"
                    className="input"
                    value={formData.split_type}
                    onChange={(e) => setFormData({ ...formData, split_type: e.target.value as 'standard' | 'proportional' | 'equal' })}
                    required
                    disabled={submitting}
                  >
                    <option value="standard">Standard (Bus fees first, then School fees)</option>
                    <option value="proportional">Proportional (Based on monthly fee ratio)</option>
                    <option value="equal">Equal Split (50% to each fee type)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="payment_period" className="block text-sm font-medium">
                    Payment Period *
                  </label>
                  <select
                    id="payment_period"
                    className="input"
                    value={formData.payment_period}
                    onChange={(e) => setFormData({ ...formData, payment_period: e.target.value as 'current' | 'advance' | 'past' })}
                    required
                    disabled={submitting}
                  >
                    <option value="current">Current Month</option>
                    <option value="advance">Advance Payment</option>
                    <option value="past">Past Dues</option>
                  </select>
                </div>

                {formData.payment_period !== 'current' && (
                  <div className="space-y-2">
                    <label htmlFor="payment_months" className="block text-sm font-medium">
                      Number of Months *
                    </label>
                    <input
                      id="payment_months"
                      type="number"
                      className="input"
                      value={formData.payment_months}
                      onChange={(e) => setFormData({ ...formData, payment_months: parseInt(e.target.value) || 1 })}
                      min="1"
                      max="12"
                      required
                      disabled={submitting}
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
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Payment Allocation Preview */}
              {allocationPreview && formData.amount_paid && (
                <div className="bg-muted/50 p-4 rounded-md border">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-medium">Payment Allocation Preview</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Bus Fee Allocation</p>
                      <p className="font-medium">₹{allocationPreview.bus_allocation.toLocaleString('en-IN')}</p>
                      {feeStatus && feeStatus.monthly_bus_fee > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {Math.round((allocationPreview.bus_allocation / parseFloat(formData.amount_paid)) * 100)}% of payment
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">School Fee Allocation</p>
                      <p className="font-medium">₹{allocationPreview.school_allocation.toLocaleString('en-IN')}</p>
                      {feeStatus && feeStatus.monthly_school_fee > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {Math.round((allocationPreview.school_allocation / parseFloat(formData.amount_paid)) * 100)}% of payment
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  className="btn btn-outline btn-md"
                  onClick={onClose}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-md"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Payment'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditPaymentModal;