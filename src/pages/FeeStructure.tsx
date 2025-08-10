import { useState, useEffect } from 'react';
import { Download, Plus, Settings, History, Copy, Trash2, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAcademicYears } from '../hooks/useAcademicYears';
import { useSchoolFees } from '../hooks/useSchoolFees';
import { useBusFees } from '../hooks/useBusFees';
import { FeeType, FeeStructure as FeeStructureType } from '../types/fees';
import AddFeeItemModal from '../components/fees/AddFeeItemModal';
import AddBusFeeModal from '../components/fees/AddBusFeeModal';
import FeeTypeModal from '../components/fees/FeeTypeModal';
import FeeStructureTable from '../components/fees/FeeStructureTable';
import BusFeeStructureTable from '../components/fees/BusFeeStructureTable';

const FeeStructure = () => {
  const [activeTab, setActiveTab] = useState('school');
  const [showFeeTypeModal, setShowFeeTypeModal] = useState(false);
  const [showAddFeeModal, setShowAddFeeModal] = useState(false);
  const [showAddBusFeeModal, setShowAddBusFeeModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [editingFee, setEditingFee] = useState<any>(null);
  
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
      
      if (activeTab === 'school') {
        const data = await schoolFees.fetchFeeStructure(selectedYear);
        setFeeStructures(data);
      } else if (activeTab === 'bus') {
        await busFees.fetchBusFees(selectedYear);
      }
    } catch (err) {
      console.error('Error fetching fee structure:', err);
      toast.error('Failed to load fee structure');
    }
  };

  const fetchClasses = async () => {
    try {
      if (!selectedYear) return;
      
      const { data, error } = await supabase
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
      
      const { error } = await supabase
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

  const handleDeleteBusFee = async (id: string) => {
    try {
      if (!confirm('Are you sure you want to delete this bus fee?')) {
        return;
      }
      
      const { error } = await supabase
        .from('bus_fee_structure')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      toast.success('Bus fee deleted successfully');
      fetchFeeStructure();
    } catch (err) {
      console.error('Error deleting bus fee:', err);
      toast.error('Failed to delete bus fee');
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
      
      const { data, error } = await supabase
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

  const handleAddBusFee = async (formData: any) => {
    try {
      if (!selectedYear) {
        throw new Error('No academic year selected');
      }
      
      const busFeeData = {
        village_id: formData.village_id,
        fee_amount: formData.fee_amount,
        effective_from_date: formData.effective_from_date,
        effective_to_date: formData.effective_to_date,
        is_active: formData.is_active,
        academic_year_id: selectedYear
      };
      
      console.log('Bus fee data to save:', busFeeData);
      console.log('Is this an update?', !!formData.id);
      
      if (formData.id) {
        // Update existing bus fee
        const { data, error } = await supabase
          .from('bus_fee_structure')
          .update({
            fee_amount: formData.fee_amount,
            effective_from_date: formData.effective_from_date,
            effective_to_date: formData.effective_to_date,
            is_active: formData.is_active
          })
          .eq('id', formData.id)
          .select();
          
        if (error) {
          console.error('Update error:', error);
          throw error;
        }
        
        console.log('Update response:', data);
        toast.success('Bus fee updated successfully');
      } else {
        // Insert new bus fee
        const { data, error } = await supabase
          .from('bus_fee_structure')
          .insert([busFeeData])
          .select();
          
        if (error) {
          console.error('Insert error:', error);
          throw error;
        }
        
        console.log('Insert response:', data);
        toast.success('Bus fee added successfully');
      }
      
      setShowAddBusFeeModal(false);
      setEditingFee(null);
      // Refresh the fee structure data
      await fetchFeeStructure();
    } catch (err) {
      console.error('Error saving bus fee:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save bus fee');
    }
  };

  const handleEditFeeStructure = async (fee: FeeStructureType) => {
    // This would be implemented for editing existing fee items
    toast.info('Edit functionality will be implemented');
  };

  const handleEditBusFee = (fee: any) => {
    console.log('Editing bus fee:', fee);
    setEditingFee(fee);
    setShowAddBusFeeModal(true);
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
                    onClick={() => {
                      setEditingFee(null);
                      if (activeTab === 'school') {
                        setShowAddFeeModal(true);
                      } else {
                        setShowAddBusFeeModal(true);
                      }
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add {activeTab === 'school' ? 'Fee Item' : 'Bus Fee'}
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
              
              {/* Search and Filters - Only show for school fees */}
              {activeTab === 'school' && (
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
              )}
              
              {/* Fee Structure Table */}
              {activeTab === 'school' ? (
                <FeeStructureTable 
                  feeStructures={filteredFeeStructures}
                  onDelete={handleDeleteFeeStructure}
                  onEdit={handleEditFeeStructure}
                />
              ) : (
                <BusFeeStructureTable 
                  academicYearId={selectedYear}
                  onDelete={handleDeleteBusFee}
                  onEdit={handleEditBusFee}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Fee Item Modal */}
      {showAddFeeModal && (
        <AddFeeItemModal
          onClose={() => setShowAddFeeModal(false)}
          onSubmit={handleAddFeeItem}
          classes={classes}
          feeTypes={feeTypes}
          isSchoolFee={activeTab === 'school'}
          academicYearId={selectedYear || ''}
        />
      )}

      {/* Add Bus Fee Modal */}
      {showAddBusFeeModal && (
        <AddBusFeeModal
          onClose={() => {
            setShowAddBusFeeModal(false);
            setEditingFee(null);
          }}
          onSubmit={handleAddBusFee}
          academicYearId={selectedYear || ''}
          editingFee={editingFee}
        />
      )}

      {/* Fee Type Management Modal */}
      {showFeeTypeModal && (
        <FeeTypeModal
          onClose={() => setShowFeeTypeModal(false)}
          selectedCategory={activeTab === 'school' ? 'school' : 'bus'}
          onFeeTypesChanged={fetchFeeTypes}
        />
      )}
    </div>
  );
};

export default FeeStructure;