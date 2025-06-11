import { useState, useEffect, useCallback } from 'react';
import { AlertCircle, Loader2, Plus, Trash2, Copy, History } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface FeeType {
  id: string;
  name: string;
  description?: string;
  frequency: 'monthly' | 'quarterly' | 'annual';
  category: 'school' | 'bus' | 'admission';
  is_monthly: boolean;
  is_for_new_students_only: boolean;
  effective_from?: string;
  effective_to?: string;
  created_at: string;
  updated_at: string;
}

interface Class {
  id: string;
  name: string;
  academic_year_id: string;
}

interface FeeStructureItem {
  id?: string;
  class_id: string;
  fee_type_id: string;
  amount: number;
  due_date: string;
  applicable_to_new_students_only: boolean;
  is_recurring_monthly: boolean;
  notes?: string;
  class_name?: string;
  fee_type_name?: string;
  fee_type_category?: string;
  fee_type_frequency?: string;
}

interface SchoolFeeFormProps {
  academicYear: string;
  academicYearId: string;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  onCopyFromPrevious: () => void;
  loading?: boolean;
  error?: string;
}

const SchoolFeeForm = ({ 
  academicYear, 
  academicYearId,
  onSubmit, 
  onCancel, 
  onCopyFromPrevious, 
  loading: submitting,
  error: submitError 
}: SchoolFeeFormProps) => {
  const { user } = useAuth();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [feeStructure, setFeeStructure] = useState<FeeStructureItem[]>([]);
  const [existingStructure, setExistingStructure] = useState<FeeStructureItem[]>([]);
  
  // UI states
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'school' | 'admission'>('all');
  const [showHistory, setShowHistory] = useState(false);
  const [feeHistory, setFeeHistory] = useState<any[]>([]);

  // Real-time subscription
  useEffect(() => {
    const subscription = supabase
      .channel('fee_structure_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fee_structure'
        },
        () => {
          console.log('Fee structure changed, refreshing data...');
          fetchFeeStructure();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fee_types'
        },
        () => {
          console.log('Fee types changed, refreshing data...');
          fetchFeeTypes();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [academicYearId]);

  // Fetch fee types with categorization
  const fetchFeeTypes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('fee_types')
        .select('*')
        .eq('category', 'school')
        .order('name');

      if (error) throw error;
      setFeeTypes(data || []);
    } catch (err: any) {
      console.error('Error fetching fee types:', err);
      setError(err.message);
    }
  }, []);

  // Fetch classes for current academic year
  const fetchClasses = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, academic_year_id')
        .eq('academic_year_id', academicYearId)
        .order('name');

      if (error) throw error;
      setClasses(data || []);
    } catch (err: any) {
      console.error('Error fetching classes:', err);
      setError(err.message);
    }
  }, [academicYearId]);

  // Fetch existing fee structure
  const fetchFeeStructure = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('fee_structure')
        .select(`
          *,
          class:class_id(id, name),
          fee_type:fee_type_id(id, name, category, frequency, is_monthly, is_for_new_students_only)
        `)
        .eq('academic_year_id', academicYearId);

      if (error) throw error;

      const structureData = (data || []).map(item => ({
        id: item.id,
        class_id: item.class_id,
        fee_type_id: item.fee_type_id,
        amount: parseFloat(item.amount),
        due_date: item.due_date,
        applicable_to_new_students_only: item.applicable_to_new_students_only,
        is_recurring_monthly: item.is_recurring_monthly,
        notes: item.notes,
        class_name: item.class?.name,
        fee_type_name: item.fee_type?.name,
        fee_type_category: item.fee_type?.category,
        fee_type_frequency: item.fee_type?.frequency
      }));

      setExistingStructure(structureData);
      setFeeStructure(structureData);
    } catch (err: any) {
      console.error('Error fetching fee structure:', err);
      setError(err.message);
    }
  }, [academicYearId]);

  // Fetch fee structure history for audit trail
  const fetchFeeHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('fee_structure_history')
        .select(`
          *,
          changed_by:changed_by(name),
          fee_structure:fee_structure_id(
            class:class_id(name),
            fee_type:fee_type_id(name)
          )
        `)
        .order('change_date', { ascending: false })
        .limit(50);

      if (error) throw error;
      setFeeHistory(data || []);
    } catch (err: any) {
      console.error('Error fetching fee history:', err);
    }
  }, []);

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      setError(null);

      try {
        await Promise.all([
          fetchFeeTypes(),
          fetchClasses(),
          fetchFeeStructure(),
          fetchFeeHistory()
        ]);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (academicYearId) {
      initializeData();
    }
  }, [academicYearId, fetchFeeTypes, fetchClasses, fetchFeeStructure, fetchFeeHistory]);

  // Add new fee structure item
  const addFeeStructureItem = () => {
    const newItem: FeeStructureItem = {
      class_id: '',
      fee_type_id: '',
      amount: 0,
      due_date: new Date().toISOString().split('T')[0],
      applicable_to_new_students_only: false,
      is_recurring_monthly: false,
      notes: ''
    };
    setFeeStructure([...feeStructure, newItem]);
  };

  // Remove fee structure item
  const removeFeeStructureItem = (index: number) => {
    const newStructure = feeStructure.filter((_, i) => i !== index);
    setFeeStructure(newStructure);
  };

  // Update fee structure item
  const updateFeeStructureItem = (index: number, field: keyof FeeStructureItem, value: any) => {
    const newStructure = [...feeStructure];
    newStructure[index] = { ...newStructure[index], [field]: value };

    // Auto-populate fee type details
    if (field === 'fee_type_id') {
      const feeType = feeTypes.find(ft => ft.id === value);
      if (feeType) {
        newStructure[index].fee_type_name = feeType.name;
        newStructure[index].fee_type_category = feeType.category;
        newStructure[index].fee_type_frequency = feeType.frequency;
        newStructure[index].is_recurring_monthly = feeType.is_monthly;
        newStructure[index].applicable_to_new_students_only = feeType.is_for_new_students_only;
      }
    }

    // Auto-populate class name
    if (field === 'class_id') {
      const classData = classes.find(c => c.id === value);
      if (classData) {
        newStructure[index].class_name = classData.name;
      }
    }

    setFeeStructure(newStructure);
  };

  // Copy from previous year
  const handleCopyFromPrevious = async () => {
    try {
      setLoading(true);
      
      // Get previous academic year
      const { data: currentYear, error: yearError } = await supabase
        .from('academic_years')
        .select('previous_year_id')
        .eq('id', academicYearId)
        .single();

      if (yearError || !currentYear?.previous_year_id) {
        throw new Error('No previous academic year found');
      }

      // Get fee structure from previous year
      const { data: previousStructure, error: structureError } = await supabase
        .from('fee_structure')
        .select(`
          *,
          class:class_id(name),
          fee_type:fee_type_id(*)
        `)
        .eq('academic_year_id', currentYear.previous_year_id);

      if (structureError) throw structureError;

      if (!previousStructure?.length) {
        throw new Error('No fee structure found for previous year');
      }

      // Map previous structure to current classes
      const mappedStructure: FeeStructureItem[] = [];
      
      for (const item of previousStructure) {
        // Find corresponding class in current year
        const currentClass = classes.find(c => c.name === item.class?.name);
        
        if (currentClass) {
          mappedStructure.push({
            class_id: currentClass.id,
            fee_type_id: item.fee_type_id,
            amount: parseFloat(item.amount),
            due_date: new Date().toISOString().split('T')[0],
            applicable_to_new_students_only: item.applicable_to_new_students_only,
            is_recurring_monthly: item.is_recurring_monthly,
            notes: `Copied from ${currentYear.previous_year_id}`,
            class_name: currentClass.name,
            fee_type_name: item.fee_type?.name,
            fee_type_category: item.fee_type?.category,
            fee_type_frequency: item.fee_type?.frequency
          });
        }
      }

      setFeeStructure(mappedStructure);
      toast.success(`Copied ${mappedStructure.length} fee structures from previous year`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Validate form data
  const validateForm = () => {
    if (feeStructure.length === 0) {
      setError('At least one fee structure item is required');
      return false;
    }

    for (let i = 0; i < feeStructure.length; i++) {
      const item = feeStructure[i];
      
      if (!item.class_id) {
        setError(`Class is required for item ${i + 1}`);
        return false;
      }
      
      if (!item.fee_type_id) {
        setError(`Fee type is required for item ${i + 1}`);
        return false;
      }
      
      if (!item.amount || item.amount <= 0) {
        setError(`Valid amount is required for item ${i + 1}`);
        return false;
      }
      
      if (!item.due_date) {
        setError(`Due date is required for item ${i + 1}`);
        return false;
      }
    }

    // Check for duplicates
    const combinations = new Set();
    for (const item of feeStructure) {
      const key = `${item.class_id}-${item.fee_type_id}`;
      if (combinations.has(key)) {
        setError('Duplicate class-fee type combination found');
        return false;
      }
      combinations.add(key);
    }

    return true;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setShowConfirmation(true);
  };

  // Confirm and submit
  const handleConfirm = async () => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Prepare data for submission
      const submissionData = {
        academic_year_id: academicYearId,
        fee_structure: feeStructure.map(item => ({
          ...item,
          academic_year_id: academicYearId,
          last_updated_by: user.id
        })),
        updated_by: user.id
      };

      await onSubmit(submissionData);
      setShowConfirmation(false);
    } catch (err: any) {
      setError(err.message);
      setShowConfirmation(false);
    }
  };

  // Filter fee types by category
  const filteredFeeTypes = selectedCategory === 'all' 
    ? feeTypes 
    : feeTypes.filter(ft => ft.category === selectedCategory);

  // Group fee structure by category
  const groupedStructure = feeStructure.reduce((acc, item) => {
    const category = item.fee_type_category || 'school';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, FeeStructureItem[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading fee structure...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b">
          <div>
            <h3 className="text-xl font-semibold">School Fee Structure</h3>
            <p className="text-sm text-muted-foreground">Academic Year: {academicYear}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className="h-4 w-4 mr-2" />
              History
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleCopyFromPrevious}
              disabled={loading}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy from Previous Year
            </button>
          </div>
        </div>

        {/* Error Display */}
        {(error || submitError) && (
          <div className="bg-error/10 border border-error/30 text-error rounded-md p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>{error || submitError}</span>
            </div>
          </div>
        )}

        {/* Category Filter */}
        <div className="flex gap-2">
          <label className="text-sm font-medium">Filter by Category:</label>
          <select
            className="input text-sm"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as any)}
          >
            <option value="all">All Categories</option>
            <option value="school">School Fees</option>
            <option value="admission">Admission Fees</option>
          </select>
        </div>

        {/* Fee Structure Items */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-medium">Fee Structure Items</h4>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={addFeeStructureItem}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Fee Item
            </button>
          </div>

          {feeStructure.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No fee structure items. Click "Add Fee Item" to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedStructure).map(([category, items]) => (
                <div key={category} className="space-y-2">
                  <h5 className="text-md font-medium capitalize text-primary">
                    {category} Fees ({items.length})
                  </h5>
                  <div className="space-y-2">
                    {items.map((item, globalIndex) => {
                      const actualIndex = feeStructure.findIndex(fs => fs === item);
                      return (
                        <div key={actualIndex} className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border rounded-lg">
                          {/* Class Selection */}
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Class</label>
                            <select
                              className="input text-sm"
                              value={item.class_id}
                              onChange={(e) => updateFeeStructureItem(actualIndex, 'class_id', e.target.value)}
                              required
                            >
                              <option value="">Select Class</option>
                              {classes.map(cls => (
                                <option key={cls.id} value={cls.id}>{cls.name}</option>
                              ))}
                            </select>
                          </div>

                          {/* Fee Type Selection */}
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Fee Type</label>
                            <select
                              className="input text-sm"
                              value={item.fee_type_id}
                              onChange={(e) => updateFeeStructureItem(actualIndex, 'fee_type_id', e.target.value)}
                              required
                            >
                              <option value="">Select Fee Type</option>
                              {filteredFeeTypes.map(ft => (
                                <option key={ft.id} value={ft.id}>
                                  {ft.name} ({ft.frequency})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Amount */}
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Amount (₹)</label>
                            <input
                              type="number"
                              className="input text-sm"
                              value={item.amount || ''}
                              onChange={(e) => updateFeeStructureItem(actualIndex, 'amount', parseFloat(e.target.value) || 0)}
                              min="0"
                              step="0.01"
                              required
                            />
                          </div>

                          {/* Due Date */}
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Due Date</label>
                            <input
                              type="date"
                              className="input text-sm"
                              value={item.due_date}
                              onChange={(e) => updateFeeStructureItem(actualIndex, 'due_date', e.target.value)}
                              required
                            />
                          </div>

                          {/* Options */}
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Options</label>
                            <div className="space-y-1">
                              <label className="flex items-center gap-2 text-xs">
                                <input
                                  type="checkbox"
                                  checked={item.is_recurring_monthly}
                                  onChange={(e) => updateFeeStructureItem(actualIndex, 'is_recurring_monthly', e.target.checked)}
                                  className="h-3 w-3"
                                />
                                Monthly Recurring
                              </label>
                              <label className="flex items-center gap-2 text-xs">
                                <input
                                  type="checkbox"
                                  checked={item.applicable_to_new_students_only}
                                  onChange={(e) => updateFeeStructureItem(actualIndex, 'applicable_to_new_students_only', e.target.checked)}
                                  className="h-3 w-3"
                                />
                                New Students Only
                              </label>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-end">
                            <button
                              type="button"
                              className="btn btn-outline btn-sm text-error hover:bg-error/10"
                              onClick={() => removeFeeStructureItem(actualIndex)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fee History */}
        {showHistory && (
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="text-lg font-medium mb-4">Recent Changes</h4>
            {feeHistory.length === 0 ? (
              <p className="text-muted-foreground">No changes recorded</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {feeHistory.map((change, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-background rounded text-sm">
                    <div>
                      <span className="font-medium">
                        {change.fee_structure?.class?.name} - {change.fee_structure?.fee_type?.name}
                      </span>
                      <span className="text-muted-foreground ml-2">
                        ₹{change.previous_amount} → ₹{change.new_amount}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(change.change_date).toLocaleDateString()} by {change.changed_by?.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Summary */}
        {feeStructure.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="text-lg font-medium mb-2">Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total Fee Items:</span>
                <span className="font-medium ml-2">{feeStructure.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Classes Covered:</span>
                <span className="font-medium ml-2">
                  {new Set(feeStructure.map(item => item.class_id)).size}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Fee Types Used:</span>
                <span className="font-medium ml-2">
                  {new Set(feeStructure.map(item => item.fee_type_id)).size}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Form Actions */}
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
            disabled={submitting || feeStructure.length === 0}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save School Fee Structure'
            )}
          </button>
        </div>
      </form>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="h-6 w-6 text-warning flex-shrink-0" />
              <h3 className="text-lg font-semibold">Confirm Fee Structure</h3>
            </div>
            <div className="space-y-3 mb-6">
              <p className="text-muted-foreground">
                Are you sure you want to save this fee structure for {academicYear}?
              </p>
              <div className="bg-muted p-3 rounded text-sm">
                <div className="font-medium">Summary:</div>
                <div>• {feeStructure.length} fee items</div>
                <div>• {new Set(feeStructure.map(item => item.class_id)).size} classes</div>
                <div>• {new Set(feeStructure.map(item => item.fee_type_id)).size} fee types</div>
              </div>
              <p className="text-xs text-muted-foreground">
                This will update the fee structure and create an audit trail of changes.
              </p>
            </div>
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
                Confirm & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolFeeForm;