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
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash' as 'cash' | 'online',
    notes: '',
    bus_fee_amount: '0',
    school_fee_amount: '0',
    total_amount: '0'
  });

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

  // Update total amount when individual fee amounts change
  useEffect(() => {
    const busAmount = parseFloat(formData.bus_fee_amount) || 0;
    const schoolAmount = parseFloat(formData.school_fee_amount) || 0;
    setFormData(prev => ({
      ...prev,
      total_amount: (busAmount + schoolAmount).toString()
    }));
  }, [formData.bus_fee_amount, formData.school_fee_amount]);

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

      // Get student fee status
      const { data, error } = await supabase.rpc(
        'get_student_fee_status',
        { 
          p_student_id: studentId,
          p_academic_year_id: currentAcademicYearId
        }
      );

      if (error) throw error;

      setFeeStatus(data);
      
      // Pre-fill form with pending amounts
      setFormData(prev => ({
        ...prev,
        bus_fee_amount: data.pending_bus_fees.toString(),
        school_fee_amount: data.pending_school_fees.toString(),
        total_amount: data.total_pending.toString()
      }));
      
    } catch (err: any) {
      console.error('Error fetching fee status:', err);
      setError(err.message || 'Failed to fetch fee status');
    } finally {
      setLoading(false);
    }
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

    if (!currentAcademicYearId) {
      setError('Academic year information is missing');
      return false;
    }

    const busAmount = parseFloat(formData.bus_fee_amount) || 0;
    const schoolAmount = parseFloat(formData.school_fee_amount) || 0;
    const totalAmount = parseFloat(formData.total_amount) || 0;

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

    try {
      setSubmitting(true);

      // Generate receipt number
      const receiptNumber = `RC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      console.log('DEBUG - Payment data being submitted:', {
        student_id: studentId,
        amount_paid: parseFloat(formData.total_amount),
        payment_date: formData.payment_date,
        payment_method: formData.payment_method,
        receipt_number: receiptNumber,
        notes: formData.notes,
        created_by: user.id,
        academic_year_id: currentAcademicYearId,
        bus_fee_amount: parseFloat(formData.bus_fee_amount) || 0,
        school_fee_amount: parseFloat(formData.school_fee_amount) || 0
      });

      // Use the manual fee payment function
      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        'insert_manual_fee_payment',
        {
          p_student_id: studentId,
          p_amount_paid: parseFloat(formData.total_amount),
          p_payment_date: formData.payment_date,
          p_payment_method: formData.payment_method,
          p_receipt_number: receiptNumber,
          p_notes: formData.notes,
          p_created_by: user.id,
          p_academic_year_id: currentAcademicYearId,
          p_bus_fee_amount: parseFloat(formData.bus_fee_amount) || 0,
          p_school_fee_amount: parseFloat(formData.school_fee_amount) || 0
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
          manual_payment_allocation (*)
        `)
        .eq('id', rpcResult.payment_id)
        .single();

      if (fetchError) {
        console.error('Error fetching created payment:', fetchError);
        throw new Error('Payment created but failed to retrieve details');
      }

      onSubmit(payment);
    } catch (err) {
      console.error('Error processing payment:', err);
      setError(err instanceof Error ? err.message : 'Failed to process payment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFeeAmountChange = (field: 'bus_fee_amount' | 'school_fee_amount', value: string) => {
    const numValue = parseFloat(value) || 0;
    
    setFormData(prev => {
      const updatedData = { ...prev, [field]: value };
      
      // Update the other field if total_amount is manually set
      const otherField = field === 'bus_fee_amount' ? 'school_fee_amount' : 'bus_fee_amount';
      const otherValue = parseFloat(prev[otherField]) || 0;
      const totalAmount = parseFloat(prev.total_amount) || 0;
      
      // Only auto-adjust if the user has manually set a total
      if (prev.total_amount !== '0' && prev.total_amount !== (prev.bus_fee_amount + prev.school_fee_amount).toString()) {
        const newOtherValue = Math.max(0, totalAmount - numValue);
        updatedData[otherField] = newOtherValue.toString();
      }
      
      return updatedData;
    });
  };

  const handleTotalAmountChange = (value: string) => {
    const totalAmount = parseFloat(value) || 0;
    
    setFormData(prev => {
      // Get current fee amounts
      const busAmount = parseFloat(prev.bus_fee_amount) || 0;
      const schoolAmount = parseFloat(prev.school_fee_amount) || 0;
      const currentTotal = busAmount + schoolAmount;
      
      // If current total is zero, distribute evenly
      if (currentTotal === 0) {
        return {
          ...prev,
          total_amount: value,
          bus_fee_amount: (totalAmount / 2).toString(),
          school_fee_amount: (totalAmount / 2).toString()
        };
      }
      
      // Otherwise, distribute proportionally
      const busRatio = busAmount / currentTotal;
      const newBusAmount = Math.round((totalAmount * busRatio) * 100) / 100;
      
      return {
        ...prev,
        total_amount: value,
        bus_fee_amount: newBusAmount.toString(),
        school_fee_amount: (totalAmount - newBusAmount).toString()
      };
    });
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

        {/* Fee Amount Fields */}
        <div className="space-y-2 md:col-span-2">
          <h4 className="text-md font-medium">Fee Allocation</h4>
          <p className="text-sm text-muted-foreground mb-2">
            Enter the amount to be allocated to each fee category
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Bus Fee Amount */}
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
                    disabled={submitting}
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
                        bus_fee_amount: feeStatus.pending_bus_fees.toString() 
                      })}
                      disabled={submitting}
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
                  disabled={submitting}
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
                      school_fee_amount: feeStatus.pending_school_fees.toString() 
                    })}
                    disabled={submitting}
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
                  value={formData.total_amount}
                  onChange={(e) => handleTotalAmountChange(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>
              {feeStatus && feeStatus.total_pending > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Total pending: ₹{feeStatus.total_pending.toLocaleString('en-IN')}</span>
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => handleTotalAmountChange(feeStatus.total_pending.toString())}
                    disabled={submitting}
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
            disabled={submitting}
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
            <p className="font-medium">₹{parseFloat(formData.bus_fee_amount || '0').toLocaleString('en-IN')}</p>
            {parseFloat(formData.total_amount) > 0 && (
              <p className="text-xs text-muted-foreground">
                {Math.round((parseFloat(formData.bus_fee_amount || '0') / parseFloat(formData.total_amount)) * 100)}% of payment
              </p>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">School Fee Amount</p>
            <p className="font-medium">₹{parseFloat(formData.school_fee_amount || '0').toLocaleString('en-IN')}</p>
            {parseFloat(formData.total_amount) > 0 && (
              <p className="text-xs text-muted-foreground">
                {Math.round((parseFloat(formData.school_fee_amount || '0') / parseFloat(formData.total_amount)) * 100)}% of payment
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