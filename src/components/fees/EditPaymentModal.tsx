import { useState, useEffect } from 'react';
import { X, AlertCircle, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { FeePayment } from '../../types/fees';

interface EditPaymentModalProps {
  payment: FeePayment;
  onClose: () => void;
  onUpdate: (paymentId: string, data: any) => Promise<void>;
}

const paymentSchema = z.object({
  amount_paid: z.string().min(1, 'Amount is required').refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    { message: 'Amount must be a positive number' }
  ),
  payment_date: z.string().min(1, 'Payment date is required'),
  payment_method: z.enum(['cash', 'online']),
  notes: z.string().optional(),
  split_type: z.enum(['standard', 'proportional', 'equal']),
  payment_period: z.enum(['current', 'advance', 'past']),
  payment_months: z.number().min(1).max(12)
});

type FormData = z.infer<typeof paymentSchema>;

const EditPaymentModal = ({ payment, onClose, onUpdate }: EditPaymentModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get the current split type from metadata
  const getSplitTypeFromMetadata = (): 'standard' | 'proportional' | 'equal' => {
    if (!payment.metadata) return 'standard';
    
    if (payment.metadata.split_type) {
      return payment.metadata.split_type as 'standard' | 'proportional' | 'equal';
    }
    
    // For backward compatibility with old equal split
    if (payment.metadata.split_equally) {
      return 'equal';
    }
    
    return 'standard';
  };

  // Get payment period from metadata
  const getPaymentPeriodFromMetadata = (): 'current' | 'advance' | 'past' => {
    if (!payment.metadata || !payment.metadata.payment_period) return 'current';
    return payment.metadata.payment_period as 'current' | 'advance' | 'past';
  };

  // Get payment months from metadata
  const getPaymentMonthsFromMetadata = (): number => {
    if (!payment.metadata || !payment.metadata.payment_months) return 1;
    return parseInt(payment.metadata.payment_months.toString()) || 1;
  };

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<FormData>({
    defaultValues: {
      amount_paid: payment.amount_paid.toString(),
      payment_date: payment.payment_date,
      payment_method: payment.payment_method,
      notes: payment.notes || '',
      split_type: getSplitTypeFromMetadata(),
      payment_period: getPaymentPeriodFromMetadata(),
      payment_months: getPaymentMonthsFromMetadata()
    }
  });

  const watchAmount = watch('amount_paid');
  const watchSplitType = watch('split_type');
  const watchPaymentPeriod = watch('payment_period');

  const onFormSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Prepare the data for update
      const updateData = {
        amount_paid: parseFloat(data.amount_paid),
        payment_date: data.payment_date,
        payment_method: data.payment_method,
        notes: data.notes,
        metadata: {
          split_type: data.split_type,
          payment_period: data.payment_period,
          payment_months: data.payment_months,
          // Preserve other metadata fields
          ...(payment.metadata || {})
        }
      };

      await onUpdate(payment.id, updateData);
      toast.success('Payment updated successfully');
      onClose();
    } catch (err) {
      console.error('Error updating payment:', err);
      setError(err instanceof Error ? err.message : 'Failed to update payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate proportional split preview
  const calculateProportionalSplit = () => {
    if (!watchAmount || parseFloat(watchAmount) <= 0) {
      return { busAmount: 0, schoolAmount: 0 };
    }

    // Get allocation from payment
    const busAllocation = payment.payment_allocation?.[0]?.bus_fee_amount 
      ? parseFloat(payment.payment_allocation[0].bus_fee_amount) 
      : 0;
    
    const schoolAllocation = payment.payment_allocation?.[0]?.school_fee_amount 
      ? parseFloat(payment.payment_allocation[0].school_fee_amount) 
      : 0;
    
    const totalAllocation = busAllocation + schoolAllocation;
    
    if (totalAllocation <= 0) {
      return { busAmount: 0, schoolAmount: parseFloat(watchAmount) };
    }
    
    const busRatio = busAllocation / totalAllocation;
    const schoolRatio = schoolAllocation / totalAllocation;
    
    const paymentAmount = parseFloat(watchAmount);
    let busAmount = Math.round((paymentAmount * busRatio) * 100) / 100;
    let schoolAmount = Math.round((paymentAmount * schoolRatio) * 100) / 100;
    
    // Adjust for rounding errors
    const diff = paymentAmount - (busAmount + schoolAmount);
    if (Math.abs(diff) > 0.01) {
      schoolAmount += diff;
    }
    
    return { busAmount, schoolAmount };
  };

  // Get split preview based on selected type
  const getSplitPreview = () => {
    if (!watchAmount || parseFloat(watchAmount) <= 0) {
      return null;
    }

    const paymentAmount = parseFloat(watchAmount);
    
    if (watchSplitType === 'proportional') {
      const { busAmount, schoolAmount } = calculateProportionalSplit();
      return (
        <div className="mt-2 text-sm text-muted-foreground">
          <p>
            The payment will be split proportionally based on monthly dues:
          </p>
          <ul className="list-disc pl-5 mt-1">
            <li>Bus fees: ₹{busAmount.toFixed(2)} ({Math.round(busAmount/paymentAmount*100)}%)</li>
            <li>School fees: ₹{schoolAmount.toFixed(2)} ({Math.round(schoolAmount/paymentAmount*100)}%)</li>
          </ul>
        </div>
      );
    } else if (watchSplitType === 'equal') {
      const halfAmount = paymentAmount / 2;
      return (
        <div className="mt-2 text-sm text-muted-foreground">
          <p>
            The payment will be divided equally: 
            ₹{halfAmount.toFixed(2)} for bus fees and 
            ₹{halfAmount.toFixed(2)} for school fees.
          </p>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-lg max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Edit Payment</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full"
            disabled={isSubmitting}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)} className="p-6 space-y-4">
          {error && (
            <div className="bg-error/10 border border-error/30 text-error rounded-md p-3 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

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
                {...register('amount_paid')}
                disabled={isSubmitting}
              />
            </div>
            {errors.amount_paid && (
              <p className="text-sm text-error">{errors.amount_paid.message}</p>
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
              {...register('payment_date')}
              disabled={isSubmitting}
            />
            {errors.payment_date && (
              <p className="text-sm text-error">{errors.payment_date.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="payment_method" className="block text-sm font-medium">
              Payment Mode *
            </label>
            <select
              id="payment_method"
              className="input"
              {...register('payment_method')}
              disabled={isSubmitting}
            >
              <option value="cash">Cash</option>
              <option value="online">Online Transfer</option>
            </select>
            {errors.payment_method && (
              <p className="text-sm text-error">{errors.payment_method.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="payment_period" className="block text-sm font-medium">
              Payment Period
            </label>
            <select
              id="payment_period"
              className="input"
              {...register('payment_period')}
              disabled={isSubmitting}
            >
              <option value="current">Current Month</option>
              <option value="advance">Advance Payment</option>
              <option value="past">Past Dues</option>
            </select>
          </div>
          
          {watchPaymentPeriod !== 'current' && (
            <div className="space-y-2">
              <label htmlFor="payment_months" className="block text-sm font-medium">
                Number of Months
              </label>
              <input
                id="payment_months"
                type="number"
                className="input"
                {...register('payment_months', { 
                  valueAsNumber: true,
                  min: 1,
                  max: 12
                })}
                min="1"
                max="12"
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                {watchPaymentPeriod === 'advance' ? 'Months to pay in advance' : 'Past months to cover'}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="notes" className="block text-sm font-medium">
              Remarks
            </label>
            <textarea
              id="notes"
              rows={3}
              className="input"
              placeholder="Any additional information about this payment"
              {...register('notes')}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium mb-2">
              Payment Allocation Method
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="relative">
                <input
                  type="radio"
                  value="standard"
                  {...register('split_type')}
                  className="peer sr-only"
                  disabled={isSubmitting}
                />
                <div className="flex flex-col items-center p-4 bg-muted rounded-lg cursor-pointer border-2 border-transparent peer-checked:border-primary peer-checked:bg-primary/10">
                  <span className="font-medium">Standard</span>
                  <span className="text-xs text-muted-foreground">Bus fees first, then school fees</span>
                </div>
              </label>

              <label className="relative">
                <input
                  type="radio"
                  value="proportional"
                  {...register('split_type')}
                  className="peer sr-only"
                  disabled={isSubmitting}
                />
                <div className="flex flex-col items-center p-4 bg-muted rounded-lg cursor-pointer border-2 border-transparent peer-checked:border-primary peer-checked:bg-primary/10">
                  <span className="font-medium">Proportional</span>
                  <span className="text-xs text-muted-foreground">Based on monthly fee ratio</span>
                </div>
              </label>

              <label className="relative">
                <input
                  type="radio"
                  value="equal"
                  {...register('split_type')}
                  className="peer sr-only"
                  disabled={isSubmitting}
                />
                <div className="flex flex-col items-center p-4 bg-muted rounded-lg cursor-pointer border-2 border-transparent peer-checked:border-primary peer-checked:bg-primary/10">
                  <span className="font-medium">Equal Split</span>
                  <span className="text-xs text-muted-foreground">50% to each fee type</span>
                </div>
              </label>
            </div>
            
            {getSplitPreview()}
            
            <p className="text-xs text-warning">
              Note: Changing this option will recalculate the fee allocation.
            </p>
          </div>

          <div className="border-t pt-4 flex flex-col sm:flex-row justify-end gap-3">
            <button
              type="button"
              className="btn btn-outline btn-md"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-md"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
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
      </div>
    </div>
  );
};

export default EditPaymentModal;