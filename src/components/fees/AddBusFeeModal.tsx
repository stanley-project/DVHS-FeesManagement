import { useState, useEffect } from 'react';
import { X, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Village } from '../../types/village';

interface AddBusFeeModalProps {
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  academicYearId: string;
  editingFee?: any;
}

const AddBusFeeModal = ({ 
  onClose, 
  onSubmit, 
  academicYearId,
  editingFee
}: AddBusFeeModalProps) => {
  const [villages, setVillages] = useState<Village[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    village_id: '',
    fee_amount: '',
    effective_from_date: new Date().toISOString().split('T')[0],
    effective_to_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    is_active: true
  });

  useEffect(() => {
    fetchVillages();
    
    // If editing, set form data
    if (editingFee) {
      setFormData({
        village_id: editingFee.village_id,
        fee_amount: editingFee.fee_amount.toString(),
        effective_from_date: editingFee.effective_from_date,
        effective_to_date: editingFee.effective_to_date,
        is_active: editingFee.is_active
      });
    }
  }, [editingFee]);

  const fetchVillages = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('villages')
        .select('*')
        .eq('is_active', true)
        .order('distance_from_school', { ascending: true });
      
      if (error) throw error;
      
      setVillages(data || []);
    } catch (err) {
      console.error('Error fetching villages:', err);
      setError('Failed to load villages');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      setError(null);
      
      if (!formData.village_id) {
        throw new Error('Please select a village');
      }
      
      if (!formData.fee_amount || parseFloat(formData.fee_amount) <= 0) {
        throw new Error('Please enter a valid fee amount');
      }
      
      if (!formData.effective_from_date) {
        throw new Error('Please select an effective from date');
      }
      
      if (!formData.effective_to_date) {
        throw new Error('Please select an effective to date');
      }
      
      // Check if dates are valid
      const fromDate = new Date(formData.effective_from_date);
      const toDate = new Date(formData.effective_to_date);
      
      if (fromDate >= toDate) {
        throw new Error('Effective to date must be after effective from date');
      }
      
      const submissionData = {
        ...formData,
        fee_amount: parseFloat(formData.fee_amount),
        academic_year_id: academicYearId,
        id: editingFee?.id
      };
      
      await onSubmit(submissionData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-lg max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">{editingFee ? 'Edit Bus Fee' : 'Add Bus Fee'}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-error/10 border border-error/30 text-error rounded-md p-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            </div>
          )}
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading villages...</span>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label htmlFor="village_id" className="block text-sm font-medium">Village *</label>
                <select
                  id="village_id"
                  className="input w-full"
                  value={formData.village_id}
                  onChange={(e) => setFormData({ ...formData, village_id: e.target.value })}
                  required
                  disabled={!!editingFee}
                >
                  <option value="">Select Village</option>
                  {villages.map(village => (
                    <option key={village.id} value={village.id}>
                      {village.name} ({village.distance_from_school} km) - {village.bus_number}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="fee_amount" className="block text-sm font-medium">Monthly Fee Amount (₹) *</label>
                <div className="flex rounded-md shadow-sm">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-muted-foreground text-sm">
                    ₹
                  </span>
                  <input
                    id="fee_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    className="input rounded-l-none w-full"
                    value={formData.fee_amount}
                    onChange={(e) => setFormData({ ...formData, fee_amount: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="effective_from_date" className="block text-sm font-medium">Effective From *</label>
                  <input
                    id="effective_from_date"
                    type="date"
                    className="input w-full"
                    value={formData.effective_from_date}
                    onChange={(e) => setFormData({ ...formData, effective_from_date: e.target.value })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="effective_to_date" className="block text-sm font-medium">Effective To *</label>
                  <input
                    id="effective_to_date"
                    type="date"
                    className="input w-full"
                    value={formData.effective_to_date}
                    onChange={(e) => setFormData({ ...formData, effective_to_date: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  id="is_active"
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
                <label htmlFor="is_active" className="text-sm font-medium">
                  Active
                </label>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                <button
                  type="button"
                  className="btn btn-outline btn-md"
                  onClick={onClose}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-md"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {editingFee ? 'Updating...' : 'Adding...'}
                    </>
                  ) : (
                    editingFee ? 'Update Bus Fee' : 'Add Bus Fee'
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default AddBusFeeModal;