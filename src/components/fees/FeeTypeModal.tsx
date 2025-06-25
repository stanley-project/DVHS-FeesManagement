import { useState, useEffect } from 'react';
import { X, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { FeeType } from '../../types/fees';
import { useSchoolFees } from '../../hooks/useSchoolFees';

interface FeeTypeModalProps {
  onClose: () => void;
  selectedCategory: 'school' | 'bus';
  onFeeTypesChanged: () => void;
}

const FeeTypeModal = ({ onClose, selectedCategory, onFeeTypesChanged }: FeeTypeModalProps) => {
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingFeeType, setEditingFeeType] = useState<FeeType | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    frequency: 'monthly' as const,
    category: selectedCategory,
    is_monthly: true
  });

  const { 
    fetchFeeTypes, 
    createFeeType, 
    updateFeeType, 
    deleteFeeType,
    loading: actionLoading 
  } = useSchoolFees();

  useEffect(() => {
    loadFeeTypes();
  }, [selectedCategory]);

  const loadFeeTypes = async () => {
    try {
      setLoading(true);
      const data = await fetchFeeTypes();
      setFeeTypes(data.filter(ft => ft.category === selectedCategory));
    } catch (error) {
      console.error('Failed to load fee types:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingFeeType) {
        await updateFeeType(editingFeeType.id, formData);
      } else {
        await createFeeType(formData);
      }
      
      await loadFeeTypes();
      onFeeTypesChanged();
      resetForm();
    } catch (error) {
      console.error('Error saving fee type:', error);
    }
  };

  const handleEdit = (feeType: FeeType) => {
    setEditingFeeType(feeType);
    setFormData({
      name: feeType.name,
      description: feeType.description || '',
      frequency: feeType.frequency,
      category: feeType.category,
      is_monthly: feeType.is_monthly
    });
    setShowForm(true);
  };

  const handleDelete = async (feeType: FeeType) => {
    if (!confirm(`Are you sure you want to delete "${feeType.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteFeeType(feeType.id);
      await loadFeeTypes();
      onFeeTypesChanged();
    } catch (error) {
      console.error('Error deleting fee type:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      frequency: 'monthly',
      category: selectedCategory,
      is_monthly: true
    });
    setEditingFeeType(null);
    setShowForm(false);
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Fee Type Management</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Add New Fee Type Button */}
          <div className="flex justify-end mb-6">
            <button
              className="btn btn-primary btn-md"
              onClick={() => setShowForm(true)}
              disabled={actionLoading}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Fee Type
            </button>
          </div>

          {/* Fee Types List */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Frequency</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Monthly</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {feeTypes.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                        No fee types found. Click "Add Fee Type" to create one.
                      </td>
                    </tr>
                  ) : (
                    feeTypes.map((feeType) => (
                      <tr key={feeType.id} className="border-b hover:bg-muted/50">
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium">{feeType.name}</div>
                            {feeType.description && (
                              <div className="text-sm text-muted-foreground">{feeType.description}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 capitalize">{feeType.frequency}</td>
                        <td className="px-4 py-3 text-center">
                          {feeType.is_monthly ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                              Yes
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                              No
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEdit(feeType)}
                              className="p-1 hover:bg-muted rounded-md"
                              title="Edit"
                              disabled={actionLoading}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(feeType)}
                              className="p-1 hover:bg-muted rounded-md text-error"
                              title="Delete"
                              disabled={actionLoading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Fee Type Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
              <div className="bg-card rounded-lg shadow-lg max-w-md w-full">
                <div className="flex items-center justify-between p-6 border-b">
                  <h3 className="text-lg font-semibold">
                    {editingFeeType ? 'Edit Fee Type' : 'Add New Fee Type'}
                  </h3>
                  <button
                    onClick={resetForm}
                    className="p-2 hover:bg-muted rounded-full"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Name *</label>
                    <input
                      type="text"
                      className="input w-full"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Description</label>
                    <textarea
                      className="input w-full"
                      rows={2}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Frequency *</label>
                    <select
                      className="input w-full"
                      value={formData.frequency}
                      onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
                      required
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annual">Annual</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_monthly}
                      onChange={(e) => setFormData({ ...formData, is_monthly: e.target.checked })}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span className="text-sm font-medium">Monthly Recurring Fee</span>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                    <button
                      type="button"
                      className="btn btn-outline btn-md"
                      onClick={resetForm}
                      disabled={actionLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-md"
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {editingFeeType ? 'Updating...' : 'Creating...'}
                        </>
                      ) : (
                        editingFeeType ? 'Update Fee Type' : 'Create Fee Type'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeeTypeModal;