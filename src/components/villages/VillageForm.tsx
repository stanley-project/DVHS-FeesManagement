import { useState } from 'react';
import { AlertCircle } from 'lucide-react';

interface VillageFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  initialData?: any;
}

const VillageForm = ({ onSubmit, onCancel, initialData }: VillageFormProps) => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formData, setFormData] = useState(initialData || {
    name: '',
    distance_from_school: '',
    is_active: true,
    description: '',
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
        <div className="space-y-4">
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
            <div className="flex rounded-md shadow-sm">
              <input
                id="distance"
                type="number"
                step="0.01"
                min="0"
                className="input rounded-r-none"
                value={formData.distance_from_school}
                onChange={(e) => setFormData({ ...formData, distance_from_school: e.target.value })}
                required
              />
              <span className="inline-flex items-center rounded-r-md border border-l-0 border-input bg-muted px-3 text-muted-foreground text-sm">
                km
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              className="input"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description about this village"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="status"
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            />
            <label htmlFor="status" className="text-sm font-medium">
              Active
            </label>
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
            {initialData ? 'Update Village' : 'Create Village'}
          </button>
        </div>
      </form>

      {showConfirmation && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-6 w-6 text-warning" />
              <h3 className="text-lg font-semibold">Confirm Submission</h3>
            </div>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to {initialData ? 'update' : 'create'} this village?
              {!formData.is_active && ' This village will be marked as inactive.'}
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