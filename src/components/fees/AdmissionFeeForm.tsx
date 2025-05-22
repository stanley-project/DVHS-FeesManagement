import { useState } from 'react';
import { AlertCircle } from 'lucide-react';

interface AdmissionFeeFormProps {
  academicYear: string;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  onCopyFromPrevious: () => void;
  initialData?: any;
}

const AdmissionFeeForm = ({ academicYear, onSubmit, onCancel, onCopyFromPrevious, initialData }: AdmissionFeeFormProps) => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formData, setFormData] = useState(initialData || {
    academicYear,
    amount: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmation(true);
  };

  const handleConfirm = () => {
    onSubmit(formData);
    setShowConfirmation(false);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Admission Fee Structure</h3>
            <p className="text-sm text-muted-foreground">Academic Year: {academicYear}</p>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={onCopyFromPrevious}
          >
            Copy from Previous Year
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="amount" className="block text-sm font-medium">
              Admission Fee Amount *
            </label>
            <div className="flex rounded-md shadow-sm">
              <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-muted-foreground text-sm">
                ₹
              </span>
              <input
                id="amount"
                type="number"
                className="input rounded-l-none"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                min="0"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This amount will be applicable for all new admissions across all classes
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="effectiveDate" className="block text-sm font-medium">
              Effective From *
            </label>
            <input
              id="effectiveDate"
              type="date"
              className="input"
              value={formData.effectiveDate}
              onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
              required
            />
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
              placeholder="Add any notes about this fee change..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t">
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
            Save Admission Fee
          </button>
        </div>
      </form>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-6 w-6 text-warning" />
              <h3 className="text-lg font-semibold">Confirm Changes</h3>
            </div>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to set the admission fee to ₹{formData.amount} for {academicYear}?
              This will affect all new admissions from {formData.effectiveDate}.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setShowConfirmation(false)}
              >
                Cancel
              </button>
              <button
                type="button"
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

export default AdmissionFeeForm;