import { useState, useEffect } from 'react';
import { Download, Plus, Settings } from 'lucide-react';
import { toast } from 'react-hot-toast';
import SchoolFeeForm from '../components/fees/SchoolFeeForm';
import BusFeeForm from '../components/fees/BusFeeForm';
import FeeTypeManagement from '../components/fees/FeeTypeManagement';
import { useAcademicYears } from '../hooks/useAcademicYears';
import { useSchoolFees } from '../hooks/useSchoolFees';
import { useBusFees } from '../hooks/useBusFees';

const FeeStructure = () => {
  const [activeTab, setActiveTab] = useState('school');
  const [showFeeTypeManagement, setShowFeeTypeManagement] = useState(false);
  const { academicYears, loading: yearsLoading } = useAcademicYears();
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  
  const schoolFees = useSchoolFees();
  const busFees = useBusFees();

  // Set current academic year as default
  useEffect(() => {
    if (academicYears.length > 0 && !selectedYear) {
      const currentYear = academicYears.find(year => year.is_current);
      setSelectedYear(currentYear?.id || academicYears[0].id);
    }
  }, [academicYears, selectedYear]);

  const selectedAcademicYear = academicYears.find(year => year.id === selectedYear);

  const handleSubmit = async (data: any) => {
    try {
      if (!selectedYear) {
        throw new Error('No academic year selected');
      }

      switch (activeTab) {
        case 'school':
          await schoolFees.saveFeeStructure({
            academic_year_id: selectedYear,
            fee_structure: data.fee_structure,
            updated_by: data.updated_by
          });
          break;
          
        case 'bus':
          await busFees.saveBusFees(data.fees.map((fee: any) => ({
            ...fee,
            academic_year_id: selectedYear
          })));
          break;
      }
      
      toast.success('Fee structure saved successfully');
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
      switch (activeTab) {
        case 'school':
          data = await schoolFees.copyFromPreviousYear(selectedYear);
          break;
        case 'bus':
          data = await busFees.copyFromPreviousYear(selectedYear);
          break;
      }

      if (data) {
        toast.success('Data copied from previous year successfully');
      }
      return data;
    } catch (err) {
      console.error('Error copying from previous year:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to copy from previous year');
      return null;
    }
  };

  const exportFeeStructure = async () => {
    try {
      if (!selectedYear) {
        toast.error('Please select an academic year');
        return;
      }

      // This would implement export functionality
      toast.info('Export functionality will be implemented');
    } catch (error) {
      toast.error('Failed to export fee structure');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fee Structure Management</h1>
        <div className="flex gap-2">
          <button 
            className="btn btn-outline btn-sm"
            onClick={() => setShowFeeTypeManagement(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Manage Fee Types
          </button>
          <button 
            className="btn btn-outline btn-sm" 
            onClick={exportFeeStructure}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      <div className="bg-card rounded-lg shadow">
        {/* Academic Year Selection */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Academic Year:</label>
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
            {selectedAcademicYear && (
              <span className="text-sm text-muted-foreground">
                {new Date(selectedAcademicYear.start_date).toLocaleDateString()} - {new Date(selectedAcademicYear.end_date).toLocaleDateString()}
              </span>
            )}
          </div>
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

        {/* Tab Content */}
        <div className="p-6">
          {!selectedYear ? (
            <div className="text-center py-8 text-muted-foreground">
              Please select an academic year to manage fee structure
            </div>
          ) : (
            <>
              {activeTab === 'school' && (
                <SchoolFeeForm
                  academicYear={selectedAcademicYear?.year_name || ''}
                  academicYearId={selectedYear}
                  loading={schoolFees.loading}
                  error={schoolFees.error?.message}
                  onSubmit={handleSubmit}
                  onCancel={() => {}}
                  onCopyFromPrevious={handleCopyFromPrevious}
                />
              )}

              {activeTab === 'bus' && (
                <BusFeeForm
                  academicYear={selectedAcademicYear?.year_name || ''}
                  loading={busFees.loading}
                  error={busFees.error?.message}
                  onSubmit={handleSubmit}
                  onCancel={() => {}}
                  onCopyFromPrevious={handleCopyFromPrevious}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Fee Type Management Modal */}
      {showFeeTypeManagement && (
        <FeeTypeManagement
          onClose={() => setShowFeeTypeManagement(false)}
        />
      )}
    </div>
  );
};

export default FeeStructure;