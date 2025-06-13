import { useState, useEffect } from 'react';
import { X, Plus, Pencil, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useMiscellaneousCharges } from '../../hooks/useMiscellaneousCharges';
import { ChargeCategory } from '../../types/fees';

interface ChargeCategoriesProps {
  onClose: () => void;
}

const ChargeCategories = ({ onClose }: ChargeCategoriesProps) => {
  const { chargeCategories, loading, error, createChargeCategory, refreshChargeCategories } = useMiscellaneousCharges();
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ChargeCategory | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    default_amount: '',
    is_active: true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!formData.name.trim()) {
        toast.error('Category name is required');
        return;
      }

      const categoryData = {
        name: formData.name,
        description: formData.description,
        default_amount: formData.default_amount ? parseFloat(formData.default_amount) : null,
        is_active: formData.is_active
      };

      if (editingCategory) {
        // Update existing category
        await supabase
          .from('charge_categories')
          .update(categoryData)
          .eq('id', editingCategory.id);
        
        toast.success('Category updated successfully');
      } else {
        // Create new category
        await createChargeCategory(categoryData);
      }
      
      resetForm();
      refreshChargeCategories();
    } catch (err) {
      console.error('Error saving category:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save category');
    }
  };

  const handleEdit = (category: ChargeCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      default_amount: category.default_amount?.toString() || '',
      is_active: category.is_active
    });
    setShowForm(true);
  };

  const handleDelete = async (category: ChargeCategory) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      // Check if category is in use
      const { count, error: countError } = await supabase
        .from('miscellaneous_charges')
        .select('*', { count: 'exact', head: true })
        .eq('charge_category_id', category.id);

      if (countError) throw countError;

      if (count && count > 0) {
        toast.error(`Cannot delete category that is in use by ${count} charges`);
        return;
      }

      const { error } = await supabase
        .from('charge_categories')
        .delete()
        .eq('id', category.id);

      if (error) throw error;

      toast.success('Category deleted successfully');
      refreshChargeCategories();
    } catch (err) {
      console.error('Error deleting category:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete category');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      default_amount: '',
      is_active: true
    });
    setEditingCategory(null);
    setShowForm(false);
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Manage Charge Categories</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Add New Category Button */}
          <div className="flex justify-end mb-6">
            <button
              className="btn btn-primary btn-md"
              onClick={() => setShowForm(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </button>
          </div>

          {/* Category Form */}
          {showForm && (
            <div className="bg-muted p-4 rounded-md mb-6">
              <h3 className="text-lg font-medium mb-4">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
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
                    <label className="block text-sm font-medium">Default Amount (₹)</label>
                    <div className="flex rounded-md shadow-sm">
                      <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-muted-foreground text-sm">
                        ₹
                      </span>
                      <input
                        type="number"
                        className="input rounded-l-none"
                        step="0.01"
                        min="0"
                        value={formData.default_amount}
                        onChange={(e) => setFormData({ ...formData, default_amount: e.target.value })}
                      />
                    </div>
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
                
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={resetForm}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                  >
                    {editingCategory ? 'Update Category' : 'Add Category'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Categories List */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="bg-error/10 border border-error/30 text-error rounded-md p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                <p className="font-medium">Error Loading Categories</p>
              </div>
              <p className="mt-1">{error.message}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Default Amount</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {chargeCategories.map((category) => (
                    <tr key={category.id} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium">{category.name}</td>
                      <td className="px-4 py-3">{category.description || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        {category.default_amount ? `₹${category.default_amount}` : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          category.is_active ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                        }`}>
                          {category.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(category)}
                            className="p-1 hover:bg-muted rounded-md"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(category)}
                            className="p-1 hover:bg-muted rounded-md text-error"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {chargeCategories.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No categories found. Click "Add Category" to create one.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChargeCategories;