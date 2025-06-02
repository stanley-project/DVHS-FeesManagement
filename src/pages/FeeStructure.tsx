import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'react-hot-toast';
import AdmissionFeeForm from '../components/fees/AdmissionFeeForm';
import SchoolFeeForm from '../components/fees/SchoolFeeForm';
import BusFeeForm from '../components/fees/BusFeeForm';
import { useAcademicYears } from '../hooks/useAcademicYears';
import { useAdmissionFees } from '../hooks/useAdmissionFees';
import { useSchoolFees } from '../hooks/useSchoolFees';
import { useBusFees } from '../hooks/useBusFees';

const FeeStructure = () => {
  const [activeTab, setActiveTab] = useState('admission');
  const [showForm, setShowForm] = useState(false);
  const { academicYears, loading: yearsLoading } = useAcademicYears();
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  
  const admissionFees = useAdmissionFees();
  const schoolFees = useSchoolFees();
  const busFees = useBusFees();

  useEffect(() => {
    // Set the first year as selected when years are loaded
    if (academicYears.length > 0 && !selectedYear) {
      setSelectedYear(academicYears[0].id);
    }
  }, [academicYears, selectedYear]);

  const handleSubmit = async (data: any) => {
    try {
      if (!selectedYear) {
        throw new Error('No academic year selected');
      }

      switch (activeTab) {
        case 'admission':
          await admissionFees.saveAdmissionFee({
            ...data,
            academic_year_id: selectedYear,
            is_active: true
          });
          break;
          
        case 'school':
          await schoolFees.saveFeeStructure(data.fees.map((fee: any) => ({
            ...fee,
            academic_year_id: selectedYear
          })));
          break;
          
        case 'bus':
          await busFees.saveBusFees(data.fees.map((fee: any) => ({
            ...fee,
            academic_year_id: selectedYear
          })));
          break;
      }
      
      toast.success('Fee structure saved successfully');
      setShowForm(false);
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
        case 'admission':
          data = await admissionFees.copyFromPreviousYear(selectedYear);
          break;
        case 'school':
          data = await schoolFees.copyFromPreviousYear(selectedYear);
          break;
        case 'bus':
          data = await busFees.copyFromPreviousYear(selectedYear);
          break;
      }

      return data;
    } catch (err) {
      console.error('Error copying from previous year:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to copy from previous year');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fee Structure</h1>
        <button className="btn btn-outline btn-sm inline-flex items-center">
          <Download className="h-4 w-4 mr-2" />
          Export
        </button>
      </div>

      <div className="bg-card rounded-lg shadow">
        <div className="p-4 border-b">
          <select
            className="input"
            value={selectedYear || ''}
            onChange={(e) => setSelectedYear(e.target.value)}
            disabled={yearsLoading}
          >
            {!yearsLoading && academicYears.map((year) => (
              <option key={year.id} value={year.id}>
                {year.year_name} {year.is_current && '(Current)'}
              </option>
            ))}
          </select>
        </div>

        <div className="border-b">
          <nav className="flex">
            <button
              className={`px-4 py-2 font-medium ${
                activeTab === 'admission'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('admission')}
            >
              Admission Fee
            </button>
            <button
              className={`px-4 py-2 font-medium ${
                activeTab === 'school'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('school')}
            >
              School Fee
            </button>
            <button
              className={`px-4 py-2 font-medium ${
                activeTab === 'bus'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('bus')}
            >
              Bus Fee
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'admission' && (
            <AdmissionFeeForm
              academicYear={academicYears.find(y => y.id === selectedYear)?.year_name || ''}
              loading={admissionFees.loading}
              error={admissionFees.error?.message}
              onSubmit={handleSubmit}
              onCancel={() => setShowForm(false)}
              onCopyFromPrevious={handleCopyFromPrevious}
            />
          )}

          {activeTab === 'school' && (
            <SchoolFeeForm
              academicYear={academicYears.find(y => y.id === selectedYear)?.year_name || ''}
              loading={schoolFees.loading}
              error={schoolFees.error?.message}
              onSubmit={handleSubmit}
              onCancel={() => setShowForm(false)}
              onCopyFromPrevious={handleCopyFromPrevious}
            />
          )}

          {activeTab === 'bus' && (
            <BusFeeForm
              academicYear={academicYears.find(y => y.id === selectedYear)?.year_name || ''}
              loading={busFees.loading}
              error={busFees.error?.message}
              onSubmit={handleSubmit}
              onCancel={() => setShowForm(false)}
              onCopyFromPrevious={handleCopyFromPrevious}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default FeeStructure;
