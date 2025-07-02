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
  split_equally: z.boolean().optional()
});

type FormData = z.infer<typeof paymentSchema>;

const EditPaymentModal = ({ payment, onClose, onUpdate }: EditPaymentModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [splitPaymentEqually, setSplitPaymentEqually] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<FormData>({
    defaultValues: {
      amount_paid: payment.amount_paid.toString(),
      payment_date: payment.payment_date,
      payment_method: payment.payment_method,
      notes: payment.notes || '',
      split_equally: false
    }
  });

  // Check if the payment was originally split equally
  useEffect(() => {
    if (payment.metadata && payment.metadata.split_equally) {
      setSplitPaymentEqually(true);
      setValue('split_equally', true);
    }
  }, [payment, setValue]);

  const watchAmount = watch('amount_paid');

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
          ...payment.metadata,
          split_equally: data.split_equally
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
            <div className="flex items-center gap-2">
              <input
                id="split_equally"
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={splitPaymentEqually}
                onChange={(e) => {
                  setSplitPaymentEqually(e.target.checked);
                  setValue('split_equally', e.target.checked);
                }}
                disabled={isSubmitting}
              />
              <label htmlFor="split_equally" className="text-sm font-medium">
                Split payment equally between bus and school fees
              </label>
            </div>
            {splitPaymentEqually && watchAmount && (
              <div className="mt-2 text-sm text-muted-foreground">
                <p>
                  The payment will be divided equally: 
                  ₹{(parseFloat(watchAmount) / 2).toFixed(2)} for bus fees and 
                  ₹{(parseFloat(watchAmount) / 2).toFixed(2)} for school fees.
                </p>
              </div>
            )}
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