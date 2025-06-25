import { useState, useEffect } from 'react';
import { Download, Plus, Settings, History, Copy, Trash2, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAcademicYears } from '../hooks/useAcademicYears';
import { useSchoolFees } from '../hooks/useSchoolFees';
import { useBusFees } from '../hooks/useBusFees';
import { FeeType, FeeStructure as FeeStructureType } from '../types/fees';

const FeeStructure = () => {
  const [activeTab, setActiveTab] = useState('school');
  const [showFeeTypeModal, setShowFeeTypeModal] = useState(false);
  const [showAddFeeModal, setShowAddFeeModal] = useState(false);
  const [selectedFeeType, setSelectedFeeType] = useState<FeeType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  
  const { academicYears, loading: yearsLoading } = useAcademicYears();
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [feeStructures, setFeeStructures] = useState<FeeStructureType[]>([]);
  const [classes, setClasses] = useState<{id: string, name: string}[]>([]);
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  
  const schoolFees = useSchoolFees();
  const busFees = useBusFees();

  // Set current academic year as default
  useEffect(() => {
    if (academicYears.length > 0 && !selectedYear) {
      const currentYear = academicYears.find(year => year.is_current);
      setSelectedYear(currentYear?.id || academicYears[0].id);
    }
  }, [academicYears, selectedYear]);

  // Fetch fee structure data when year changes
  useEffect(() => {
    if (selectedYear) {
      fetchFeeStructure();
      fetchClasses();
      fetchFeeTypes();
    }
  }, [selectedYear, activeTab]);

  const fetchFeeStructure = async () => {
    try {
      if (!selectedYear) return;
      
      const data = await schoolFees.fetchFeeStructure(selectedYear);
      setFeeStructures(data);
    } catch (err) {
      console.error('Error fetching fee structure:', err);
      toast.error('Failed to load fee structure');
    }
  };

  const fetchClasses = async () => {
    try {
      if (!selectedYear) return;
      
      const { data, error } = await schoolFees.supabase
        .from('classes')
        .select('id, name')
        .eq('academic_year_id', selectedYear)
        .order('name');
        
      if (error) throw error;
      setClasses(data || []);
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const fetchFeeTypes = async () => {
    try {
      const data = await schoolFees.fetchFeeTypes();
      const filteredTypes = activeTab === 'school' 
        ? data.filter(type => type.category === 'school')
        : data.filter(type => type.category === 'bus');
      
      setFeeTypes(filteredTypes);
    } catch (err) {
      console.error('Error fetching fee types:', err);
    }
  };

  const handleSubmit = async (data: any) => {
    try {
      if (!selectedYear) {
        throw new Error('No academic year selected');
      }

      if (activeTab === 'school') {
        await schoolFees.saveFeeStructure({
          academic_year_id: selectedYear,
          fee_structure: data.fee_structure,
          updated_by: data.updated_by
        });
      } else if (activeTab === 'bus') {
        await busFees.saveBusFees(data.fees.map((fee: any) => ({
          ...fee,
          academic_year_id: selectedYear
        })));
      }
      
      toast.success('Fee structure saved successfully');
      fetchFeeStructure();
    } catch (err) {
      console.error('Error saving fee structure:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save fee structure');
    }
  };

  const handleCopyFromPrevious = async () => {
    try {
      if (!selectedYear) {
        throw new Error('No academic year selected');
      }

      let data;
      if (activeTab === 'school') {
        data = await schoolFees.copyFromPreviousYear(selectedYear);
        if (data) {
          setFeeStructures(data);
          toast.success('School fee structure copied from previous year');
        }
      } else if (activeTab === 'bus') {
        data = await busFees.copyFromPreviousYear(selectedYear);
        if (data) {
          toast.success('Bus fee structure copied from previous year');
        }
      }
      
      return data;
    } catch (err) {
      console.error('Error copying from previous year:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to copy from previous year');
      return null;
    }
  };

  const handleDeleteFeeStructure = async (id: string) => {
    try {
      if (!confirm('Are you sure you want to delete this fee structure item?')) {
        return;
      }
      
      const { error } = await schoolFees.supabase
        .from('fee_structure')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      toast.success('Fee structure item deleted');
      fetchFeeStructure();
    } catch (err) {
      console.error('Error deleting fee structure:', err);
      toast.error('Failed to delete fee structure item');
    }
  };

  const handleAddFeeItem = async (formData: any) => {
    try {
      if (!selectedYear) {
        throw new Error('No academic year selected');
      }
      
      const newItem = {
        class_id: formData.class_id,
        fee_type_id: formData.fee_type_id,
        amount: parseFloat(formData.amount),
        due_date: formData.due_date,
        is_recurring_monthly: formData.is_recurring_monthly,
        academic_year_id: selectedYear
      };
      
      const { data, error } = await schoolFees.supabase
        .from('fee_structure')
        .insert([newItem])
        .select();
        
      if (error) throw error;
      
      toast.success('Fee item added successfully');
      setShowAddFeeModal(false);
      fetchFeeStructure();
    } catch (err) {
      console.error('Error adding fee item:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to add fee item');
    }
  };

  const exportFeeStructure = async () => {
    try {
      if (!selectedYear) {
        toast.error('Please select an academic year');
        return;
      }

      toast.success('Export functionality will be implemented');
    } catch (error) {
      toast.error('Failed to export fee structure');
    }
  };

  // Filter fee structures based on search and class filter
  const filteredFeeStructures = feeStructures.filter(fee => {
    const matchesSearch = searchQuery === '' || 
      fee.class?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fee.fee_type?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesClass = selectedClass === 'all' || fee.class_id === selectedClass;
    
    const matchesTab = activeTab === 'school' 
      ? fee.fee_type?.category === 'school'
      : fee.fee_type?.category === 'bus';
    
    return matchesSearch && matchesClass && matchesTab;
  });

  const selectedAcademicYear = academicYears.find(year => year.id === selectedYear);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fee Structure Management</h1>
        <div className="flex gap-2">
          <button 
            className="btn btn-outline btn-md"
            onClick={() => setShowFeeTypeModal(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Manage Fee Types
          </button>
          <button 
            className="btn btn-outline btn-md" 
            onClick={exportFeeStructure}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      <div className="bg-card rounded-lg shadow overflow-hidden">
        {/* Academic Year Selection */}
        <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium whitespace-nowrap">Academic Year:</label>
            <select
              className="input"
              value={selectedYear || ''}
              onChange={(e) => setSelectedYear(e.target.value)}
              disabled={yearsLoading}
            >
              {yearsLoading ? (
                <option>Loading...</option>
              ) : (
                academicYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.year_name} {year.is_current && '(Current)'}
                  </option>
                ))
              )}
            </select>
          </div>
          
          {selectedAcademicYear && (
            <span className="text-sm text-muted-foreground ml-auto">
              {new Date(selectedAcademicYear.start_date).toLocaleDateString()} - {new Date(selectedAcademicYear.end_date).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="border-b">
          <nav className="flex">
            <button
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'school'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
              onClick={() => setActiveTab('school')}
            >
              School Fees
            </button>
            <button
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'bus'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
              onClick={() => setActiveTab('bus')}
            >
              Bus Fees
            </button>
          </nav>
        </div>

        {/* Content Area */}
        <div className="p-6">
          {!selectedYear ? (
            <div className="text-center py-8 text-muted-foreground">
              Please select an academic year to manage fee structure
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header with Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">
                    {activeTab === 'school' ? 'School' : 'Bus'} Fee Structure
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Academic Year: {selectedAcademicYear?.year_name || ''}
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setShowAddFeeModal(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Fee Item
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={handleCopyFromPrevious}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy from Previous Year
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                  >
                    <History className="h-4 w-4 mr-2" />
                    History
                  </button>
                </div>
              </div>
              
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search by class or fee type..."
                    className="input pl-10 w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <select
                  className="input"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                >
                  <option value="all">All Classes</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Fee Structure Table */}
              <div className="bg-white rounded-lg border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Class</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fee Type</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount (₹)</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Due Date</th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">Monthly</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredFeeStructures.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                          No fee structure items found. Click "Add Fee Item" to create one.
                        </td>
                      </tr>
                    ) : (
                      filteredFeeStructures.map((fee) => (
                        <tr key={fee.id} className="hover:bg-muted/50">
                          <td className="px-4 py-3 font-medium">{fee.class?.name || 'Unknown'}</td>
                          <td className="px-4 py-3">{fee.fee_type?.name || 'Unknown'}</td>
                          <td className="px-4 py-3 text-right">₹{parseFloat(fee.amount.toString()).toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3">{new Date(fee.due_date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-center">
                            {fee.is_recurring_monthly ? (
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
                                onClick={() => handleDeleteFeeStructure(fee.id!)}
                                className="p-1 hover:bg-muted rounded-md text-error"
                                title="Delete"
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
            </div>
          )}
        </div>
      </div>

      {/* Add Fee Item Modal */}
      {showAddFeeModal && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-lg max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">Add Fee Item</h2>
              <button
                onClick={() => setShowAddFeeModal(false)}
                className="p-2 hover:bg-muted rounded-full"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const data = {
                class_id: formData.get('class_id') as string,
                fee_type_id: formData.get('fee_type_id') as string,
                amount: formData.get('amount') as string,
                due_date: formData.get('due_date') as string,
                is_recurring_monthly: formData.get('is_recurring_monthly') === 'on'
              };
              handleAddFeeItem(data);
            }} className="p-6 space-y-4">
              <div className="space-y-2">
                <label htmlFor="class_id" className="block text-sm font-medium">Class</label>
                <select
                  id="class_id"
                  name="class_id"
                  className="input w-full"
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
                  name="fee_type_id"
                  className="input w-full"
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
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  className="input w-full"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="due_date" className="block text-sm font-medium">Due Date</label>
                <input
                  id="due_date"
                  name="due_date"
                  type="date"
                  className="input w-full"
                  required
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  id="is_recurring_monthly"
                  name="is_recurring_monthly"
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                  defaultChecked={activeTab === 'school'}
                />
                <label htmlFor="is_recurring_monthly" className="text-sm font-medium">
                  Monthly Recurring Fee
                </label>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                <button
                  type="button"
                  className="btn btn-outline btn-md"
                  onClick={() => setShowAddFeeModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-md"
                >
                  Add Fee Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fee Type Management Modal */}
      {showFeeTypeModal && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">Fee Type Management</h2>
              <button
                onClick={() => setShowFeeTypeModal(false)}
                className="p-2 hover:bg-muted rounded-full"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="flex justify-between mb-6">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Filter by Category:</label>
                  <select
                    className="input text-sm"
                    value={activeTab}
                    onChange={(e) => setActiveTab(e.target.value)}
                  >
                    <option value="school">School</option>
                    <option value="bus">Bus</option>
                  </select>
                </div>
                <button
                  className="btn btn-primary btn-md"
                  onClick={() => {
                    setSelectedFeeType(null);
                    // Open fee type form
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Fee Type
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Frequency</th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">Monthly</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeTypes.map((feeType) => (
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
                            feeType.category === 'school' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {feeType.category}
                          </span>
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
                              className="p-1 hover:bg-muted rounded-md"
                              title="Edit"
                              onClick={() => setSelectedFeeType(feeType)}
                            >
                              <Settings className="h-4 w-4" />
                            </button>
                            <button
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
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeeStructure;