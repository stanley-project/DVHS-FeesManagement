import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { useVillages } from '../../hooks/useVillages';
import { toast } from 'react-hot-toast';

interface VillageFormProps {
  village?: any;
  onClose: () => void;
}

const VillageForm = ({ village, onClose }: VillageFormProps) => {
  const { addVillage, updateVillage } = useVillages();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formData, setFormData] = useState(village || {
    name: '',
    distance_from_school: '',
    is_active: true,
    bus_number: 'Bus1',
    current_bus_fee: '0',
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    try {
      setError(null);
      
      if (village) {
        await updateVillage(village.id, formData);
        toast.success('Village updated successfully');
      } else {
        // When creating a new village, we need to handle the bus fee separately
        const { current_bus_fee, ...villageData } = formData;
        
        // Validate required fields
        if (!villageData.name.trim()) {
          throw new Error('Village name is required');
        }
        
        if (!villageData.distance_from_school) {
          throw new Error('Distance from school is required');
        }
        
        if (!villageData.bus_number) {
          throw new Error('Bus number is required');
        }
        
        // Add the village
        const newVillage = await addVillage({
          ...villageData,
          distance_from_school: parseFloat(villageData.distance_from_school.toString())
        });
        
        // If a bus fee was specified, create the initial bus fee record
        if (current_bus_fee && parseFloat(current_bus_fee) > 0) {
          try {
            const { data, error } = await supabase
              .from('bus_fee_structure')
              .insert({
                village_id: newVillage.id,
                fee_amount: parseFloat(current_bus_fee),
                academic_year_id: (await supabase.from('academic_years').select('id').eq('is_current', true).single()).data?.id,
                effective_from_date: new Date().toISOString().split('T')[0],
                effective_to_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
                is_active: true
              });
              
            if (error) throw error;
          } catch (busError) {
            console.error('Error creating bus fee:', busError);
            // Continue even if bus fee creation fails
          }
        }
        
        toast.success('Village added successfully');
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
              <label htmlFor="busNumber" className="block text-sm font-medium">
                Bus Number *
              </label>
              <select
                id="busNumber"
                className="input"
                value={formData.bus_number}
                onChange={(e) => setFormData({ ...formData, bus_number: e.target.value })}
                required
              >
                <option value="">Select bus number</option>
                <option value="Bus1">Bus 1</option>
                <option value="Bus2">Bus 2</option>
                <option value="Bus3">Bus 3</option>
                <option value="Bus4">Bus 4</option>
                <option value="Winger">Winger</option>
              </select>
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
            
            {error && (
              <div className="md:col-span-2 mt-4 bg-error/10 border border-error/30 text-error rounded-md p-3">
                {error}
              </div>
            )}
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