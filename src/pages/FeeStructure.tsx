import { useState } from 'react';
import { Download } from 'lucide-react';
import AdmissionFeeForm from '../components/fees/AdmissionFeeForm';
import SchoolFeeForm from '../components/fees/SchoolFeeForm';
import BusFeeForm from '../components/fees/BusFeeForm';

const FeeStructure = () => {
  const [activeTab, setActiveTab] = useState('admission');
  const [selectedYear, setSelectedYear] = useState('2025-2026');
  const [showForm, setShowForm] = useState(false);

  // Mock academic years data
  const academicYears = [
    { id: '1', name: '2025-2026', isCurrent: true },
    { id: '2', name: '2024-2025', isCurrent: false },
  ];

  const handleSubmit = (data: any) => {
    console.log('Form submitted:', data);
    setShowForm(false);
  };

  const handleCopyFromPrevious = () => {
    console.log('Copying from previous year');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1>Fee Structure Management</h1>
        <button className="btn btn-outline btn-md inline-flex items-center">
          <Download className="h-4 w-4 mr-2" />
          Export
        </button>
      </div>

      <div className="bg-card rounded-lg shadow overflow-hidden">
        {/* Academic Year Selection */}
        <div className="p-4 border-b">
          <select
            className="input"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            {academicYears.map((year) => (
              <option key={year.id} value={year.name}>
                {year.name} {year.isCurrent && '(Current)'}
              </option>
            ))}
          </select>
        </div>

        {/* Fee Type Tabs */}
        <div className="border-b">
          <div className="flex overflow-x-auto">
            <button
              className={`px-4 py-2 font-medium text-sm whitespace-nowrap border-b-2 ${
                activeTab === 'admission' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('admission')}
            >
              Admission Fees
            </button>
            <button
              className={`px-4 py-2 font-medium text-sm whitespace-nowrap border-b-2 ${
                activeTab === 'school' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('school')}
            >
              School Fees
            </button>
            <button
              className={`px-4 py-2 font-medium text-sm whitespace-nowrap border-b-2 ${
                activeTab === 'bus' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('bus')}
            >
              Bus Fees
            </button>
          </div>
        </div>

        {/* Fee Structure Forms */}
        <div className="p-6">
          {activeTab === 'admission' && (
            <AdmissionFeeForm
              academicYear={selectedYear}
              onSubmit={handleSubmit}
              onCancel={() => setShowForm(false)}
              onCopyFromPrevious={handleCopyFromPrevious}
            />
          )}

          {activeTab === 'school' && (
            <SchoolFeeForm
              academicYear={selectedYear}
              onSubmit={handleSubmit}
              onCancel={() => setShowForm(false)}
              onC

opyFromPrevious={handleCopyFromPrevious}
            />
          )}

          {activeTab === 'bus' && (
            <BusFeeForm
              academicYear={selectedYear}
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