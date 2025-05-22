import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';

interface BusFeeFormProps {
  village: any;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

const BusFeeForm = ({ village, onClose, onSubmit }: BusFeeFormProps) => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formData, setFormData] = useState({
    fee_amount: village.current_bus_fee || '',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmation(true);
  };

  const handleConfirm = () => {
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-lg max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Set Bus Fee</h2>
            <p className="text-sm text-muted-foreground">{village.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="fee" className="block text-sm font-medium">
                Monthly Bus Fee *
              </label>
              <div className="flex rounded-md shadow-sm">
                <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-muted-foreground text-sm">
                  ₹
                </span>
                <input
                  id="fee"
                  type="number"
                  className="input rounded-l-none"
                  value={formData.fee_amount}
                  onChange={(e) => setFormData({ ...formData, fee_amount: e.target.value })}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Current fee: {village.current_bus_fee ? `₹${village.current_bus_fee}` : 'Not set'}
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="notes" className="block text-sm font-medium">
                Notes
              </label>
              <textarea
                id="notes"
                className="input"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Reason for fee change..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
            <button
              type="button"
              className="btn btn-outline btn-md"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-md"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-6 w-6 text-warning" />
              <h3 className="text-lg font-semibold">Confirm Fee Change</h3>
            </div>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to set the bus fee for {village.name} to ₹{formData.fee_amount}?
              This will affect all students from this village who use the bus service.
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setShowConfirmation(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleConfirm}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusFeeForm;