import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { FeeType } from '../../types/fees';
import { supabase } from '../../lib/supabase';

interface AddFeeItemModalProps {
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  classes: { id: string; name: string }[];
  feeTypes: FeeType[];
  isSchoolFee: boolean;
  academicYearId: string;
}

const AddFeeItemModal = ({ 
  onClose, 
  onSubmit, 
  classes, 
  feeTypes, 
  isSchoolFee,
  academicYearId
}: AddFeeItemModalProps) => {
  const [formData, setFormData] = useState({
    class_id: '',
    fee_type_id: '',
    amount: '',
    due_date: new Date().toISOString().split('T')[0],
    is_recurring_monthly: isSchoolFee
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch academic year start date to set as default due date
  useEffect(() => {
    const fetchAcademicYearStartDate = async () => {
      if (!academicYearId) return;
      
      try {
        const { data, error } = await supabase
          .from('academic_years')
          .select('start_date')
          .eq('id', academicYearId)
          .single();
          
        if (error) throw error;
        
        if (data && data.start_date) {
          setFormData(prev => ({
            ...prev,
            due_date: data.start_date
          }));
        }
      } catch (err) {
        console.error('Error fetching academic year start date:', err);
      }
    };
    
    fetchAcademicYearStartDate();
  }, [academicYearId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setError(null);
      setIsSubmitting(true);
      
      if (!formData.class_id) {
        throw new Error('Please select a class');
      }
      
      if (!formData.fee_type_id) {
        throw new Error('Please select a fee type');
      }
      
      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        throw new Error('Please enter a valid amount');
      }
      
      if (!formData.due_date) {
        throw new Error('Please select a due date');
      }
      
      await onSubmit({
        ...formData,
        amount: parseFloat(formData.amount)
      });
      
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-lg max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Add Fee Item</h2>
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
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label htmlFor="class_id" className="block text-sm font-medium">Class</label>
            <select
              id="class_id"
              className="input w-full"
              value={formData.class_id}
              onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
              required
            >
              <option value="">Select Class</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="fee_type_id" className="block text-sm font-medium">Fee Type</label>
            <select
              id="fee_type_id"
              className="input w-full"
              value={formData.fee_type_id}
              onChange={(e) => setFormData({ ...formData, fee_type_id: e.target.value })}
              required
            >
              <option value="">Select Fee Type</option>
              {feeTypes.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="amount" className="block text-sm font-medium">Amount (₹)</label>
            <input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              className="input w-full"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="due_date" className="block text-sm font-medium">Due Date</label>
            <input
              id="due_date"
              type="date"
              className="input w-full"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              required
            />
          </div>
          
          <div className="flex items-center gap-2">
            <input
              id="is_recurring_monthly"
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={formData.is_recurring_monthly}
              onChange={(e) => setFormData({ ...formData, is_recurring_monthly: e.target.checked })}
            />
            <label htmlFor="is_recurring_monthly" className="text-sm font-medium">
              Monthly Recurring Fee
            </label>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t mt-4">
            <button
              type="button"
              className="btn btn-outline btn-md"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-md"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add Fee Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddFeeItemModal;