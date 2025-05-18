import { useState } from 'react';
import { Plus, Download, FileText, Pencil, Trash2 } from 'lucide-react';
import FeeTypeForm from '../components/fees/FeeTypeForm';
import FeeStructureForm from '../components/fees/FeeStructureForm';
import AcademicYearForm from '../components/fees/AcademicYearForm';

const FeeStructure = () => {
  const [activeTab, setActiveTab] = useState('structure');
  const [showFeeTypeForm, setShowFeeTypeForm] = useState(false);
  const [showFeeStructureForm, setShowFeeStructureForm] = useState(false);
  const [showAcademicYearForm, setShowAcademicYearForm] = useState(false);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1>Fee Structure Management</h1>
        
        <div className="flex gap-2">
          {activeTab === 'structure' && (
            <button
              className="btn btn-primary btn-md inline-flex items-center"
              onClick={() => setShowFeeStructureForm(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Fee Structure
            </button>
          )}
          {activeTab === 'types' && (
            <button
              className="btn btn-primary btn-md inline-flex items-center"
              onClick={() => setShowFeeTypeForm(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Fee Type
            </button>
          )}
          {activeTab === 'academic-years' && (
            <button
              className="btn btn-primary btn-md inline-flex items-center"
              onClick={() => setShowAcademicYearForm(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Academic Year
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-card rounded-lg shadow overflow-hidden">
        <div className="border-b">
          <div className="flex overflow-x-auto">
            <button
              className={`px-4 py-2 font-medium text-sm whitespace-nowrap border-b-2 ${
                activeTab === 'structure' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('structure')}
            >
              Fee Structure
            </button>
            <button
              className={`px-4 py-2 font-medium text-sm whitespace-nowrap border-b-2 ${
                activeTab === 'types' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('types')}
            >
              Fee Types
            </button>
            <button
              className={`px-4 py-2 font-medium text-sm whitespace-nowrap border-b-2 ${
                activeTab === 'academic-years' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('academic-years')}
            >
              Academic Years
            </button>
          </div>
        </div>

        <div className="p-4 md:p-6">
          {/* Fee Structure Tab */}
          {activeTab === 'structure' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <select className="input text-sm">
                    <option value="2025">2025-2026</option>
                    <option value="2024">2024-2025</option>
                  </select>
                  <select className="input text-sm">
                    <option value="">All Classes</option>
                    {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'].map(
                      (cls) => (
                        <option key={cls} value={cls}>Class {cls}</option>
                      )
                    )}
                  </select>
                </div>
                <button className="btn btn-outline btn-sm inline-flex items-center">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Primary Classes */}
                <div className="bg-card rounded-lg shadow overflow-hidden">
                  <div className="bg-primary text-primary-foreground p-4">
                    <div className="flex justify-between items-center">
                      <h2 className="text-xl font-semibold">Primary Classes (I-V)</h2>
                      <div className="flex gap-2">
                        <button className="p-1 hover:bg-primary-foreground/10 rounded">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button className="p-1 hover:bg-primary-foreground/10 rounded">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm opacity-90">Academic Year 2025-2026</p>
                  </div>
                  
                  <div className="p-4">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center pb-2 border-b">
                        <span className="font-medium">Fee Component</span>
                        <span className="font-medium">Amount (₹)</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span>Tuition Fee (Per Term)</span>
                        <span>12,500</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span>Development Fee (Per Term)</span>
                        <span>2,500</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span>Computer Lab Fee (Per Term)</span>
                        <span>1,500</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span>Library Fee (Per Term)</span>
                        <span>1,000</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span>Sports & Activities (Per Term)</span>
                        <span>1,500</span>
                      </div>
                      
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="font-semibold">Total (Per Term)</span>
                        <span className="font-semibold">19,000</span>
                      </div>
                      
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="font-semibold">Annual Fee (3 Terms)</span>
                        <span className="font-semibold">57,000</span>
                      </div>
                    </div>
                    
                    <div className="mt-6 p-3 bg-muted rounded-md text-sm">
                      <p className="font-medium mb-1">Payment Schedule:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Term 1: 15th June</li>
                        <li>Term 2: 15th September</li>
                        <li>Term 3: 15th December</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Similar structure for other class groups */}
              </div>
            </div>
          )}

          {/* Fee Types Tab */}
          {activeTab === 'types' && (
            <div className="space-y-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Frequency</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: 'Tuition Fee', description: 'Regular tuition fee', frequency: 'Monthly' },
                      { name: 'Development Fee', description: 'School development charges', frequency: 'Quarterly' },
                      { name: 'Computer Lab Fee', description: 'Computer lab maintenance', frequency: 'Monthly' },
                      { name: 'Library Fee', description: 'Library maintenance and books', frequency: 'Annual' },
                      { name: 'Sports Fee', description: 'Sports equipment and activities', frequency: 'Quarterly' },
                    ].map((feeType, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="px-4 py-3 font-medium">{feeType.name}</td>
                        <td className="px-4 py-3">{feeType.description}</td>
                        <td className="px-4 py-3">{feeType.frequency}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button className="p-1 hover:bg-muted rounded-md">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button className="p-1 hover:bg-muted rounded-md text-error">
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
          )}

          {/* Academic Years Tab */}
          {activeTab === 'academic-years' && (
            <div className="space-y-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Academic Year</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Start Date</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">End Date</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { year: '2025-2026', startDate: '2025-06-01', endDate: '2026-03-31', isCurrent: true },
                      { year: '2024-2025', startDate: '2024-06-01', endDate: '2025-03-31', isCurrent: false },
                      { year: '2023-2024', startDate: '2023-06-01', endDate: '2024-03-31', isCurrent: false },
                    ].map((academicYear, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="px-4 py-3 font-medium">{academicYear.year}</td>
                        <td className="px-4 py-3">{academicYear.startDate}</td>
                        <td className="px-4 py-3">{academicYear.endDate}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            academicYear.isCurrent ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                          }`}>
                            {academicYear.isCurrent ? 'Current' : 'Past'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button className="p-1 hover:bg-muted rounded-md">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button className="p-1 hover:bg-muted rounded-md text-error">
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
          )}
        </div>
      </div>

      {/* Forms in Modal */}
      {showFeeTypeForm && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-lg max-w-2xl w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Add Fee Type</h2>
            </div>
            <div className="p-6">
              <FeeTypeForm
                onSubmit={(data) => {
                  console.log('Fee Type Form Data:', data);
                  setShowFeeTypeForm(false);
                }}
                onCancel={() => setShowFeeTypeForm(false)}
              />
            </div>
          </div>
        </div>
      )}

      {showFeeStructureForm && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-lg max-w-4xl w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Add Fee Structure</h2>
            </div>
            <div className="p-6">
              <FeeStructureForm
                onSubmit={(data) => {
                  console.log('Fee Structure Form Data:', data);
                  setShowFeeStructureForm(false);
                }}
                onCancel={() => setShowFeeStructureForm(false)}
                onCopyFromPrevious={() => {
                  console.log('Copy from previous year');
                }}
              />
            </div>
          </div>
        </div>
      )}

      {showAcademicYearForm && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-lg max-w-2xl w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Add Academic Year</h2>
            </div>
            <div className="p-6">
              <AcademicYearForm
                onSubmit={(data) => {
                  console.log('Academic Year Form Data:', data);
                  setShowAcademicYearForm(false);
                }}
                onCancel={() => setShowAcademicYearForm(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeeStructure;