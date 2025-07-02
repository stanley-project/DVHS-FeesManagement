import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Loader2, AlertTriangle, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface FeePaymentFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  studentId?: string;
  registrationType?: 'new' | 'continuing';
  academicYearId?: string;
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

const FeePaymentForm = ({ onSubmit, onCancel, studentId, registrationType, academicYearId }: FeePaymentFormProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feeStatus, setFeeStatus] = useState<FeeStatus | null>(null);
  const [currentAcademicYearId, setCurrentAcademicYearId] = useState<string | null>(academicYearId || null);
  const [formData, setFormData] = useState({
    amount_paid: '',
    payment_method: 'cash' as 'cash' | 'online',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
    split_type: 'standard' as 'standard' | 'proportional' | 'equal',
    payment_period: 'current' as 'current' | 'advance' | 'past',
    payment_months: 1
  });
  const [allocationPreview, setAllocationPreview] = useState<{
    bus_allocation: number;
    school_allocation: number;
  } | null>(null);

  useEffect(() => {
    if (studentId) {
      fetchFeeStatus();
    }
  }, [studentId]);

  useEffect(() => {
    if (academicYearId) {
      setCurrentAcademicYearId(academicYearId);
    }
  }, [academicYearId]);

  useEffect(() => {
    // Calculate allocation preview when amount or split type changes
    if (feeStatus && formData.amount_paid) {
      calculateAllocationPreview();
    }
  }, [formData.amount_paid, formData.split_type, feeStatus]);

  const fetchFeeStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get current academic year if not provided
      if (!currentAcademicYearId) {
        const { data: currentAcademicYear, error: yearError } = await supabase
          .from('academic_years')
          .select('id, start_date')
          .eq('is_current', true)
          .maybeSingle();

        if (yearError) {
          throw new Error('Failed to fetch current academic year');
        }

        if (!currentAcademicYear) {
          // Try to get the latest academic year
          const { data: latestYear, error: latestError } = await supabase
            .from('academic_years')
            .select('id, year_name')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (latestError || !latestYear) {
            throw new Error('No academic year found');
          }
          
          setCurrentAcademicYearId(latestYear.id);
        } else {
          // Set the current academic year ID
          setCurrentAcademicYearId(currentAcademicYear.id);
        }
      }

      // Get student details with class information
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select(`
          village_id, has_school_bus, class_id, bus_start_date
        `)
        .eq('id', studentId)
        .single();

      if (studentError) throw studentError;

      console.log('DEBUG - Student details:', student);

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
        .eq('id', currentAcademicYearId)
        .single();
        
      const academicYearStartDate = academicYearData ? new Date(academicYearData.start_date) : new Date();
      
      // Calculate months passed for school fees (from academic year start)
      const monthsPassedSchool = calculateMonthsBetween(academicYearStartDate, currentDate);
      
      console.log('DEBUG - Months passed since academic year start:', monthsPassedSchool);
      console.log('DEBUG - Academic year start date:', academicYearStartDate.toISOString());
      console.log('DEBUG - Current date:', currentDate.toISOString());

      // Get bus fees if student uses school bus
      if (student.has_school_bus && student.village_id) {
        const { data: busFee, error: busFeeError } = await supabase
          .from('bus_fee_structure')
          .select('fee_amount')
          .eq('village_id', student.village_id)
          .eq('academic_year_id', currentAcademicYearId)
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
          
          console.log('DEBUG - Bus start date:', busStartDate.toISOString());
          console.log('DEBUG - Months passed for bus fees:', monthsPassedBus);
          console.log('DEBUG - Monthly bus fee:', monthlyBusFee, 'Total bus fees:', totalBusFees);
        }
      }

      // Get school fees - Use student.class_id directly
      if (student.class_id) {
        const { data: schoolFees, error: schoolFeeError } = await supabase
          .from('fee_structure')
          .select(`
            id,
            amount,
            is_recurring_monthly,
            fee_type:fee_type_id(name, category, is_monthly)
          `)
          .eq('academic_year_id', currentAcademicYearId)
          .eq('class_id', student.class_id);

        if (!schoolFeeError && schoolFees) {
          console.log('DEBUG - Fetched school fees for student class:', schoolFees);
          
          // Calculate total school fees and monthly school fees
          schoolFees.forEach(fee => {
            const feeAmount = parseFloat(fee.amount);
            
            // Only include fees with category 'school' in the school fees calculation
            if (fee.fee_type?.category === 'school') {
              if (fee.is_recurring_monthly) {
                // Monthly fee
                monthlySchoolFee += feeAmount;
                const monthlyTotal = feeAmount * monthsPassedSchool;
                console.log(`DEBUG - Monthly fee (${fee.fee_type?.name}):`, feeAmount, 'x', monthsPassedSchool, '=', monthlyTotal);
                totalSchoolFees += monthlyTotal;
              } else {
                // One-time fee
                console.log(`DEBUG - One-time fee (${fee.fee_type?.name}):`, feeAmount);
                totalSchoolFees += feeAmount;
                // For monthly calculation, distribute one-time fees across the academic year
                monthlySchoolFee += feeAmount / monthsPassedSchool;
              }
            }
          });
        }
      }

      console.log('DEBUG - Total fees calculation:', {
        totalBusFees,
        totalSchoolFees,
        totalFees: totalBusFees + totalSchoolFees,
        monthlyBusFee,
        monthlySchoolFee
      });

      // Get paid amounts
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
        .eq('student_id', studentId);

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

      console.log('DEBUG - Payment calculation:', {
        paidBusFees,
        paidSchoolFees,
        pendingBusFees,
        pendingSchoolFees,
        totalPending
      });

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

    if (!currentAcademicYearId) {
      setError('Academic year information is missing');
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

    try {
      setSubmitting(true);

      // Generate receipt number
      const receiptNumber = `RC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      console.log('DEBUG - Payment data being submitted:', {
        student_id: studentId,
        amount_paid: parseFloat(formData.amount_paid),
        payment_date: formData.payment_date,
        payment_method: formData.payment_method,
        receipt_number: receiptNumber,
        notes: formData.notes,
        created_by: user.id,
        academic_year_id: currentAcademicYearId,
        split_type: formData.split_type,
        payment_period: formData.payment_period,
        payment_months: formData.payment_months
      });

      // Try to use the RPC function to create payment with split options
      try {
        const { data: rpcResult, error: rpcError } = await supabase.rpc(
          'insert_fee_payment_v4',
          {
            p_student_id: studentId,
            p_amount_paid: parseFloat(formData.amount_paid),
            p_payment_date: formData.payment_date,
            p_payment_method: formData.payment_method,
            p_receipt_number: receiptNumber,
            p_notes: formData.notes,
            p_created_by: user.id,
            p_academic_year_id: currentAcademicYearId,
            p_split_type: formData.split_type,
            p_payment_period: formData.payment_period,
            p_payment_months: formData.payment_months
          }
        );

        if (rpcError) {
          console.error('RPC error:', rpcError);
          throw new Error(rpcError.message);
        }

        // Fetch the created payment with its allocation
        const { data: payment, error: fetchError } = await supabase
          .from('fee_payments')
          .select(`
            *,
            payment_allocation (*)
          `)
          .eq('id', rpcResult.payment_id)
          .single();

        if (fetchError) {
          console.error('Error fetching created payment:', fetchError);
          throw new Error('Payment created but failed to retrieve details');
        }

        onSubmit(payment);
        return;
      } catch (rpcError) {
        console.error('RPC approach failed:', rpcError);
        // Fall back to direct insert if RPC fails
      }

      // Direct insert as fallback - with metadata for split options
      const { data: directPayment, error: directError } = await supabase
        .from('fee_payments')
        .insert({
          student_id: studentId,
          amount_paid: parseFloat(formData.amount_paid),
          payment_date: formData.payment_date,
          payment_method: formData.payment_method,
          receipt_number: receiptNumber,
          notes: formData.notes,
          created_by: user.id,
          academic_year_id: currentAcademicYearId,
          metadata: {
            split_type: formData.split_type,
            payment_period: formData.payment_period,
            payment_months: formData.payment_months
          }
        })
        .select(`
          id,
          student_id,
          amount_paid,
          payment_date,
          payment_method,
          receipt_number,
          notes,
          created_by,
          academic_year_id,
          metadata,
          created_at,
          updated_at
        `)
        .single();

      if (directError) {
        console.error('Direct payment creation error:', directError);
        throw new Error('Failed to process payment: ' + directError.message);
      }

      // Fetch the payment allocation separately
      const { data: allocations, error: allocError } = await supabase
        .from('payment_allocation')
        .select('*')
        .eq('payment_id', directPayment.id);

      if (allocError) {
        console.error('Error fetching allocations:', allocError);
      }

      // Combine the payment with its allocations
      const completePayment = {
        ...directPayment,
        payment_allocation: allocations || []
      };

      onSubmit(completePayment);

    } catch (error: any) {
      console.error('Error processing payment:', error);
      setError(error.message || 'Failed to process payment. Please try again.');
    } finally {
      setSubmitting(false);
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

          {feeStatus.total_pending > 0 && (
            <div className="text-sm text-muted-foreground mt-2">
              <p>Note: Payment allocation will be based on the selected split method below.</p>
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
              disabled={submitting}
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
              disabled={submitting}
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
      
      <div className="border-t pt-4 flex flex-col sm:flex-row justify-end gap-3">
        <button
          type="button"
          className="btn btn-outline btn-md"
          onClick={onCancel}
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