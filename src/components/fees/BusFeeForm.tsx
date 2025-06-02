import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { useVillages } from '../../hooks/useVillages';
import { supabase } from '../../lib/supabase';

interface BusFeeFormProps {
  academicYear: string;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  onCopyFromPrevious: () => Promise<any>;
  loading?: boolean;
  error?: string;
}

interface BusFee {
  village_id: string;
  fee_amount: number;
  effective_from_date: string;
  effective_to_date: string;
  is_active: boolean;
}

interface FormData {
  fees: BusFee[];
}

const BusFeeForm = ({
  academicYear,
  onSubmit,
  onCancel,
  loading: submitting,
  error: submitError
}: BusFeeFormProps) => {
  const { villages, loading: villagesLoading, error: villagesError } = useVillages();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [currentFees, setCurrentFees] = useState<Record<string, number>>({});
  const [formData, setFormData] = useState<FormData>({
    fees: []
  });

  // Fetch current bus fees when villages are loaded
  useEffect(() => {
    const fetchCurrentFees = async () => {
      try {
        const { data: feeData, error: feeError } = await supabase
          .from('bus_fee_structure')
          .select('village_id, fee_amount')
          .eq('is_active', true);

        if (feeError) throw feeError;

        const feeMap: Record<string, number> = {};
        feeData?.forEach(fee => {
          feeMap[fee.village_id] = fee.fee_amount;
        });

        setCurrentFees(feeMap);
        
        // Initialize form data with current fees
        setFormData({
          fees: villages.map(village => ({
            village_id: village.id,
            fee_amount: feeMap[village.id] || 0,
            effective_from_date: new Date().toISOString().split('T')[0],
            effective_to_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
            is_active: true
          }))
        });
      } catch (err) {
        console.error('Error fetching current fees:', err);
      }
    };

    if (villages.length > 0) {
      fetchCurrentFees();
    }
  }, [villages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmation(true);
  };

  const handleConfirm = () => {
    onSubmit(formData);
    setShowConfirmation(false);
  };

  if (villagesLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading villages...</div>
      </div>
    );
  }

  if (villagesError) {
    return (
      <div className="bg-error/10 border border-error/30 text-error rounded-md p-4">
        Failed to load villages: {villagesError.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Bus Fee Structure</h3>
            <p className="text-sm text-muted-foreground">Academic Year: {academicYear}</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Fee Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Village</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Distance (km)</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Current Monthly Fee</th>
                </tr>
              </thead>
              <tbody>
                {villages.map((village) => {
                  const fee = formData.fees.find(f => f.village_id === village.id);
                  return (
                    <tr key={village.id} className="border-b">
                      <td className="px-4 py-3 font-medium">{village.name}</td>
                      <td className="px-4 py-3 text-right">{village.distance_from_school}</td>
                      <td className="px-4 py-3">
                        <div className="flex rounded-md shadow-sm justify-end">
                          <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-muted-foreground text-sm">
                            ₹
                          </span>
                          <input
                            type="number"
                            className="input rounded-l-none w-32"
                            value={fee?.fee_amount || ''}
                            onChange={(e) => {
                              const newFees = [...formData.fees];
                              const index = newFees.findIndex(f => f.village_id === village.id);
                              if (index >= 0) {
                                newFees[index].fee_amount = Number(e.target.value);
                              }
                              setFormData({ ...formData, fees: newFees });
                            }}
                            min="0"
                            required
                            disabled={submitting}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {submitError && (
            <div className="bg-error/10 border border-error/30 text-error rounded-md p-3">
              {submitError}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t">
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
            {submitting ? 'Saving...' : 'Save Bus Fee Structure'}
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
              This will affect all bus fee calculations from {formData.fees[0]?.effective_from_date}.
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
