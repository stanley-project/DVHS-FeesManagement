import { useState } from 'react';
import { X, AlertCircle, Loader2 } from 'lucide-react';
import { MiscellaneousCharge } from '../../types/fees';
import { useMiscellaneousCharges } from '../../hooks/useMiscellaneousCharges';

interface MiscellaneousChargePaymentProps {
  charge: MiscellaneousCharge;
  onClose: () => void;
  onSuccess: () => void;
}

const MiscellaneousChargePayment = ({
  charge,
  onClose,
  onSuccess
}: MiscellaneousChargePaymentProps) => {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash');
  const [transactionId, setTransactionId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { processChargePayment } = useMiscellaneousCharges();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (paymentMethod === 'online' && !transactionId.trim()) {
      setError('Transaction ID is required for online payments');
      return;
    }
    
    try {
      setIsProcessing(true);
      await processChargePayment(charge, paymentMethod, transactionId);
      onSuccess();
    } catch (err) {
      // Error is handled in the hook
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-lg max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Process Payment</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full"
            disabled={isProcessing}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-error/10 border border-error/30 text-error rounded-md p-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-lg font-medium">Charge Details</h3>
            <div className="bg-muted p-4 rounded-md space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Student:</span>
                <span className="font-medium">{charge.student?.student_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Description:</span>
                <span className="font-medium">{charge.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium">₹{charge.amount}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Payment Information</h3>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Payment Method
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="relative">
                  <input
                    type="radio"
                    name="paymentMethod"
                    className="peer sr-only"
                    checked={paymentMethod === 'cash'}
                    onChange={() => setPaymentMethod('cash')}
                  />
                  <div className="flex flex-col items-center p-4 bg-muted rounded-lg cursor-pointer border-2 border-transparent peer-checked:border-primary peer-checked:bg-primary/10">
                    <span className="font-medium">Cash</span>
                  </div>
                </label>

                <label className="relative">
                  <input
                    type="radio"
                    name="paymentMethod"
                    className="peer sr-only"
                    checked={paymentMethod === 'online'}
                    onChange={() => setPaymentMethod('online')}
                  />
                  <div className="flex flex-col items-center p-4 bg-muted rounded-lg cursor-pointer border-2 border-transparent peer-checked:border-primary peer-checked:bg-primary/10">
                    <span className="font-medium">Online</span>
                  </div>
                </label>
              </div>
            </div>

            {paymentMethod === 'online' && (
              <div className="space-y-2">
                <label htmlFor="transactionId" className="block text-sm font-medium">
                  Transaction ID
                </label>
                <input
                  id="transactionId"
                  type="text"
                  className="input"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="Enter transaction ID"
                  required
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
            <button
              type="button"
              className="btn btn-outline btn-md"
              onClick={onClose}
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-md"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Process Payment'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MiscellaneousChargePayment;