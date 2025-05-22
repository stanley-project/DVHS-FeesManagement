import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { useVillageContext } from '../../contexts/VillageContext';

interface VillageFormProps {
  village?: any;
  onClose: () => void;
}

const VillageForm = ({ village, onClose }: VillageFormProps) => {
  const { addVillage, updateVillage } = useVillageContext();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formData, setFormData] = useState(village || {
    name: '',
    distance_from_school: '',
    is_active: true,
    description: '',
    current_bus_fee: '',
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    try {
      if (village) {
        await updateVillage(village.id, formData);
      } else {
        // When creating a new village, we need to handle the bus fee separately
        const { current_bus_fee, ...villageData } = formData;
        const newVillage = await addVillage(villageData);
        
        // If a bus fee was specified, create the initial bus fee record
        if (current_bus_fee) {
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/bus_fee_structure`, {
            method: 'POST',
            headers: {
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              village_id: newVillage.id,
              fee_amount: parseFloat(current_bus_fee),
              effective_from_date: new Date().toISOString(),
              effective_to_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
              is_active: true,
            }),
          });
        }
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setShowConfirmation(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-lg max-w-2xl w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {village ? 'Edit Village' : 'Add New Village'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-error/10 border border-error/30 text-error rounded-md p-3">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium">
                Village Name *
              </label>
              <input
                id="name"
                type="text"
                className="input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="distance" className="block text-sm font-medium">
                Distance from School (km) *
              </label>
              <input
                id="distance"
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={formData.distance_from_school}
                onChange={(e) => setFormData({ ...formData, distance_from_school: parseFloat(e.target.value) })}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="busFee" className="block text-sm font-medium">
                Current Bus Fee (₹/month)
              </label>
              <div className="flex rounded-md shadow-sm">
                <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-muted-foreground text-sm">
                  ₹
                </span>
                <input
                  id="busFee"
                  type="number"
                  step="0.01"
                  min="0"
                  className="input rounded-l-none"
                  value={formData.current_bus_fee}
                  onChange={(e) => setFormData({ ...formData, current_bus_fee: e.target.value })}
                  placeholder="Enter monthly bus fee"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Leave empty if bus service is not available for this village
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                className="input"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description about the village..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 rounded border-input"
                />
                <span className="text-sm font-medium">Active</span>
              </label>
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
              {village ? 'Update Village' : 'Add Village'}
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
              <h3 className="text-lg font-semibold">Confirm Submission</h3>
            </div>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to {village ? 'update' : 'add'} this village?
              {!formData.is_active && ' This village will be marked as inactive.'}
              {formData.current_bus_fee && (
                <>
                  <br />
                  The monthly bus fee will be set to ₹{formData.current_bus_fee}.
                </>
              )}
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

export default VillageForm;