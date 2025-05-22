import { useState } from 'react';
import { AlertCircle } from 'lucide-react';

interface BusFeeFormProps {
  academicYear: string;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  onCopyFromPrevious: () => void;
  initialData?: any;
}

const BusFeeForm = ({ academicYear, onSubmit, onCancel, onCopyFromPrevious, initialData }: BusFeeFormProps) => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formData, setFormData] = useState(initialData || {
    academicYear,
    fees: [],
    effectiveDate: new Date().toISOString().split('T')[0],
    distanceMultiplier: 10, // ₹10 per km
  });

  // Mock villages data
  const villages = [
    { id: '1', name: 'Ramapuram', distance: 5.2 },
    { id: '2', name: 'Kondapur', distance: 3.8 },
    { id: '3', name: 'Gachibowli', distance: 7.5 },
  ];

  const calculateSuggestedFee = (distance: number) => {
    return Math.round(distance * formData.distanceMultiplier) * 100;
  };

  const handleBulkUpdate = () => {
    const newFees = formData.fees.map((fee: any) => ({
      ...fee,
      amount: calculateSuggestedFee(villages.find(v => v.id === fee.villageId)?.distance || 0),
    }));
    setFormData({ ...formData, fees: newFees });
  };

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
            <h3 className="text-lg font-medium">Bus Fee Structure</h3>
            <p className="text-sm text-muted-foreground">Academic Year: {academicYear}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={onCopyFromPrevious}
            >
              Copy from Previous Year
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleBulkUpdate}
            >
              Update Based on Distance
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Distance Multiplier */}
          <div className="bg-muted p-4 rounded-md">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Distance-based Fee Calculator</h4>
                <p className="text-sm text-muted-foreground">Set rate per kilometer for bulk updates</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">₹</span>
                <input
                  type="number"
                  className="input w-24"
                  value={formData.distanceMultiplier}
                  onChange={(e) => setFormData({ ...formData, distanceMultiplier: Number(e.target.value) })}
                  min="1"
                />
                <span className="text-sm">per km</span>
              </div>
            </div>
          </div>

          {/* Fee Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Village</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Distance (km)</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Suggested Fee</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Monthly Fee</th>
                </tr>
              </thead>
              <tbody>
                {villages.map((village) => (
                  <tr key={village.id} className="border-b">
                    <td className="px-4 py-3 font-medium">{village.name}</td>
                    <td className="px-4 py-3 text-right">{village.distance}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      ₹{calculateSuggestedFee(village.distance).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex rounded-md shadow-sm justify-end">
                        <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-muted-foreground text-sm">
                          ₹
                        </span>
                        <input
                          type="number"
                          className="input rounded-l-none w-32"
                          value={formData.fees.find((f: any) => f.villageId === village.id)?.amount || ''}
                          onChange={(e) => {
                            const newFees = [...formData.fees];
                            const index = newFees.findIndex((f: any) => f.villageId === village.id);
                            if (index >= 0) {
                              newFees[index].amount = e.target.value;
                            } else {
                              newFees.push({ villageId: village.id, amount: e.target.value });
                            }
                            setFormData({ ...formData, fees: newFees });
                          }}
                          min="0"
                          required
                        />
                      </div>
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
            Save Bus Fee Structure
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
              Are you sure you want to update the bus fee structure for {academicYear}?
              This will affect all bus fee calculations from {formData.effectiveDate}.
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