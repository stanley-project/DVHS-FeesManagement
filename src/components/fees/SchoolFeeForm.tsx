import { useState } from 'react';
import { AlertCircle } from 'lucide-react';

interface SchoolFeeFormProps {
  academicYear: string;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  onCopyFromPrevious: () => void;
  initialData?: any;
}

const SchoolFeeForm = ({ academicYear, onSubmit, onCancel, onCopyFromPrevious, initialData }: SchoolFeeFormProps) => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formData, setFormData] = useState(initialData || {
    academicYear,
    fees: [
      { class: 'I', monthlyFee: '', termFee: '' },
      { class: 'II', monthlyFee: '', termFee: '' },
      { class: 'III', monthlyFee: '', termFee: '' },
      { class: 'IV', monthlyFee: '', termFee: '' },
      { class: 'V', monthlyFee: '', termFee: '' },
      { class: 'VI', monthlyFee: '', termFee: '' },
      { class: 'VII', monthlyFee: '', termFee: '' },
      { class: 'VIII', monthlyFee: '', termFee: '' },
      { class: 'IX', monthlyFee: '', termFee: '' },
      { class: 'X', monthlyFee: '', termFee: '' },
      { class: 'XI', monthlyFee: '', termFee: '' },
      { class: 'XII', monthlyFee: '', termFee: '' },
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
            <h3 className="text-lg font-medium">School Fee Structure</h3>
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Class</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Monthly Fee</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Term Fee</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Annual Fee</th>
                </tr>
              </thead>
              <tbody>
                {formData.fees.map((fee: any, index: number) => (
                  <tr key={fee.class} className="border-b">
                    <td className="px-4 py-3 font-medium">Class {fee.class}</td>
                    <td className="px-4 py-3">
                      <div className="flex rounded-md shadow-sm justify-end">
                        <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-muted-foreground text-sm">
                          ₹
                        </span>
                        <input
                          type="number"
                          className="input rounded-l-none w-32"
                          value={fee.monthlyFee}
                          onChange={(e) => {
                            const newFees = [...formData.fees];
                            newFees[index].monthlyFee = e.target.value;
                            setFormData({ ...formData, fees: newFees });
                          }}
                          min="0"
                          required
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex rounded-md shadow-sm justify-end">
                        <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-muted-foreground text-sm">
                          ₹
                        </span>
                        <input
                          type="number"
                          className="input rounded-l-none w-32"
                          value={fee.termFee}
                          onChange={(e) => {
                            const newFees = [...formData.fees];
                            newFees[index].termFee = e.target.value;
                            setFormData({ ...formData, fees: newFees });
                          }}
                          min="0"
                          required
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      ₹{((Number(fee.monthlyFee) * 12) + (Number(fee.termFee) * 3)).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
            Save School Fee Structure
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
              Are you sure you want to update the school fee structure for {academicYear}?
              This will affect all fee calculations from {formData.effectiveDate}.
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

export default SchoolFeeForm;