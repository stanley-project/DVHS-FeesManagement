import { useState, useEffect } from 'react';
import { X, Loader2, AlertTriangle, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface EditPaymentModalProps {
  payment: any;
  onClose: () => void;
  onUpdate: () => void;
}

const EditPaymentModal = ({ payment, onClose, onUpdate }: EditPaymentModalProps) => {
  const [formData, setFormData] = useState({
    amount_paid: '',
    payment_date: '',
    payment_method: '' as 'cash' | 'online',
    notes: '',
    bus_fee_amount: '',
    school_fee_amount: ''
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feeStatus, setFeeStatus] = useState<any | null>(null);

  useEffect(() => {
    if (payment) {
      // Get allocation data from payment
      const busAmount = payment.manual_payment_allocation?.[0]?.bus_fee_amount || 
                       payment.payment_allocation?.[0]?.bus_fee_amount || 
                       payment.metadata?.bus_fee_amount || '0';
                       
      const schoolAmount = payment.manual_payment_allocation?.[0]?.school_fee_amount || 
                          payment.payment_allocation?.[0]?.school_fee_amount || 
                          payment.metadata?.school_fee_amount || '0';
      
      // Initialize form data from payment
      setFormData({
        amount_paid: payment.amount_paid.toString(),
        payment_date: payment.payment_date,
        payment_method: payment.payment_method,
        notes: payment.notes || '',
        bus_fee_amount: busAmount.toString(),
        school_fee_amount: schoolAmount.toString()
      });
      
      // Fetch fee status for the student
      fetchFeeStatus(payment.student_id, payment.academic_year_id, payment.id);
    }
  }, [payment]);

  const fetchFeeStatus = async (studentId: string, academicYearId: string, paymentId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Get student fee status
      const { data, error } = await supabase.rpc(
        'get_student_fee_status',
        { 
          p_student_id: studentId,
          p_academic_year_id: academicYearId
        }
      );

      if (error) throw error;
      
      setFeeStatus(data);
    } catch (error: any) {
      console.error('Error fetching fee status:', error);
      setError(error.message || 'Failed to fetch fee status');
    } finally {
      setLoading(false);
    }
  };

  // Update total amount when individual fee amounts change
  useEffect(() => {
    const busAmount = parseFloat(formData.bus_fee_amount) || 0;
    const schoolAmount = parseFloat(formData.school_fee_amount) || 0;
    setFormData(prev => ({
      ...prev,
      amount_paid: (busAmount + schoolAmount).toString()
    }));
  }, [formData.bus_fee_amount, formData.school_fee_amount]);

  const handleFeeAmountChange = (field: 'bus_fee_amount' | 'school_fee_amount', value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const busAmount = parseFloat(formData.bus_fee_amount) || 0;
    const schoolAmount = parseFloat(formData.school_fee_amount) || 0;
    const totalAmount = parseFloat(formData.amount_paid) || 0;

    // Validate amounts
    if (busAmount < 0 || schoolAmount < 0) {
      setError('Fee amounts cannot be negative');
      return;
    }

    if (busAmount + schoolAmount === 0) {
      setError('Total payment amount must be greater than 0');
      return;
    }

    // Check if the sum of individual fees matches the total
    const calculatedTotal = busAmount + schoolAmount;
    if (Math.abs(calculatedTotal - totalAmount) > 0.01) { // Allow for small rounding differences
      setError(`The sum of individual fees (${calculatedTotal.toFixed(2)}) must equal the total amount (${totalAmount.toFixed(2)})`);
      return;
    }

    if (!formData.payment_date) {
      setError('Payment date is required');
      return;
    }

    try {
      setSubmitting(true);

      // Update the payment using the manual update function
      const { data, error: updateError } = await supabase.rpc(
        'update_manual_fee_payment',
        {
          p_payment_id: payment.id,
          p_amount_paid: parseFloat(formData.amount_paid),
          p_payment_date: formData.payment_date,
          p_payment_method: formData.payment_method,
          p_notes: formData.notes,
          p_bus_fee_amount: parseFloat(formData.bus_fee_amount) || 0,
          p_school_fee_amount: parseFloat(formData.school_fee_amount) || 0
        }
      );

      if (updateError) {
        throw updateError;
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
                </div>

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

              {/* Payment Summary */}
              <div className="bg-muted/50 p-4 rounded-md border">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-medium">Payment Summary</h4>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Bus Fee Amount</p>
                    <p className="font-medium">₹{parseFloat(formData.bus_fee_amount || '0').toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">School Fee Amount</p>
                    <p className="font-medium">₹{parseFloat(formData.school_fee_amount || '0').toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="font-medium">₹{parseFloat(formData.amount_paid || '0').toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </div>

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