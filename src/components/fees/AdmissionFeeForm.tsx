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
    fees: [
      { class: 'I', amount: '' },
      { class: 'II', amount: '' },
      { class: 'III', amount: '' },
      { class: 'IV', amount: '' },
      { class: 'V', amount: '' },
      { class: 'VI', amount: '' },
      { class: 'VII', amount: '' },
      { class: 'VIII', amount: '' },
      { class: 'IX', amount: '' },
      { class: 'X', amount: '' },
      { class: 'XI', amount: '' },
      { class: 'XII', amount: '' },
    ],
    effectiveDate: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmation(true);
  };

  const handleConfirm = () => {
    onSubmit(formData);
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {formData.fees.map((fee: any, index: number) => (
              <div key={fee.class} className="space-y-2">
                <label htmlFor={`fee-${index}`} className="block text-sm font-medium">
                  Class {fee.class}
                </label>
                <div className="flex rounded-md shadow-sm">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-muted-foreground text-sm">
                    ₹
                  </span>
                  <input
                    id={`fee-${index}`}
                    type="number"
                    className="input rounded-l-none"
                    value={fee.amount}
                    onChange={(e) => {
                      const newFees = [...formData.fees];
                      newFees[index].amount = e.target.value;
                      setFormData({ ...formData, fees: newFees });
                    }}
                    min="0"
                    required
                  />
                </div>
              </div>
            ))}
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
            Save Admission Fee Structure
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
              Are you sure you want to update the admission fee structure for {academicYear}?
              This will affect all new admissions from {formData.effectiveDate}.
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

export default AdmissionFeeForm;