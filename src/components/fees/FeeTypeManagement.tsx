import React, { useState, useEffect } from 'react';
import { X, Plus, Pencil, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useSchoolFees } from '../../hooks/useSchoolFees';

interface FeeType {
  id: string;
  name: string;
  description?: string;
  frequency: 'monthly' | 'quarterly' | 'annual';
  category: 'school' | 'bus';
  is_monthly: boolean;
  created_at: string;
  updated_at: string;
}

interface FeeTypeManagementProps {
  onClose: () => void;
}

const FeeTypeManagement: React.FC<FeeTypeManagementProps> = ({ onClose }) => {
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [filteredFeeTypes, setFilteredFeeTypes] = useState<FeeType[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingFeeType, setEditingFeeType] = useState<FeeType | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'school' | 'bus'>('all');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    frequency: 'monthly' as const,
    category: 'school' as const,
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
  }, []);

  // Apply category filter
  useEffect(() => {
    if (categoryFilter === 'all') {
      setFilteredFeeTypes(feeTypes);
    } else {
      setFilteredFeeTypes(feeTypes.filter(ft => ft.category === categoryFilter));
    }
  }, [feeTypes, categoryFilter]);

  const loadFeeTypes = async () => {
    try {
      setLoading(true);
      const data = await fetchFeeTypes();
      setFeeTypes(data);
      setFilteredFeeTypes(data);
    } catch (error) {
      toast.error('Failed to load fee types');
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
      resetForm();
    } catch (error) {
      // Error handling is done in the hook
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
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      frequency: 'monthly',
      category: 'school',
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
          {/* Add New Fee Type Button and Filter */}
          <div className="flex justify-between mb-6">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Filter by Category:</label>
              <select
                className="input text-sm"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as any)}
              >
                <option value="all">All Categories</option>
                <option value="school">School</option>
                <option value="bus">Bus</option>
              </select>
            </div>
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
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Frequency</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Monthly</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFeeTypes.map((feeType) => (
                    <tr key={feeType.id} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium">{feeType.name}</div>
                          {feeType.description && (
                            <div className="text-sm text-muted-foreground">{feeType.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          feeType.category === 'school' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {feeType.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 capitalize">{feeType.frequency}</td>
                      <td className="px-4 py-3">
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
                  ))}
                </tbody>
              </table>

              {filteredFeeTypes.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {categoryFilter === 'all' 
                    ? "No fee types found. Click \"Add Fee Type\" to create one."
                    : `No fee types found for category: ${categoryFilter}`}
                </div>
              )}
            </div>
          )}

          {/* Fee Type Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
              <div className="bg-card rounded-lg shadow-lg max-w-2xl w-full">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Name *</label>
                      <input
                        type="text"
                        className="input"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Category *</label>
                      <select
                        className="input"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                        required
                      >
                        <option value="school">School</option>
                        <option value="bus">Bus</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Frequency *</label>
                      <select
                        className="input"
                        value={formData.frequency}
                        onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
                        required
                      >
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="annual">Annual</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Description</label>
                    <textarea
                      className="input"
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_monthly}
                        onChange={(e) => setFormData({ ...formData, is_monthly: e.target.checked })}
                        className="h-4 w-4 rounded border-input"
                      />
                      <span className="text-sm font-medium">Monthly Recurring Fee</span>
                    </label>
                  </div>

                  <div className="flex justify-end gap-3 pt-6 border-t">
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

export default FeeTypeManagement;