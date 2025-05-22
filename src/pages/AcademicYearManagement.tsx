import { useState } from 'react';
import { Plus, ArrowUpDown, AlertCircle } from 'lucide-react';
import AcademicYearForm from '../components/fees/AcademicYearForm';

const AcademicYearManagement = () => {
  const [showForm, setShowForm] = useState(false);
  const [showTransitionConfirm, setShowTransitionConfirm] = useState(false);
  const [selectedYear, setSelectedYear] = useState<any>(null);

  // Mock data for academic years
  const academicYears = [
    {
      id: '1',
      yearName: '2025-2026',
      startDate: '2025-06-01',
      endDate: '2026-03-31',
      isCurrent: true,
      transitionStatus: 'pending',
      totalStudents: 450,
      promotedStudents: 0,
      retainedStudents: 0,
      transferredStudents: 0,
    },
    {
      id: '2',
      yearName: '2024-2025',
      startDate: '2024-06-01',
      endDate: '2025-03-31',
      isCurrent: false,
      transitionStatus: 'completed',
      totalStudents: 425,
      promotedStudents: 380,
      retainedStudents: 25,
      transferredStudents: 20,
    },
  ];

  const handleStartTransition = (year: any) => {
    setSelectedYear(year);
    setShowTransitionConfirm(true);
  };

  const handleConfirmTransition = () => {
    // In a real app, this would trigger the transition workflow
    console.log('Starting transition for year:', selectedYear?.yearName);
    setShowTransitionConfirm(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1>Academic Year Management</h1>
        <button
          className="btn btn-primary btn-md inline-flex items-center"
          onClick={() => setShowForm(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Academic Year
        </button>
      </div>

      <div className="bg-card rounded-lg shadow overflow-hidden">
        <div className="p-6">
          {/* Academic Years Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left">
                    <button className="flex items-center gap-1">
                      Academic Year
                      <ArrowUpDown className="h-4 w-4" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">Start Date</th>
                  <th className="px-4 py-3 text-left">End Date</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Transition Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {academicYears.map((year) => (
                  <tr key={year.id} className="border-b hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">
                      {year.yearName}
                      {year.isCurrent && (
                        <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                          Current
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">{year.startDate}</td>
                    <td className="px-4 py-3">{year.endDate}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        year.isCurrent ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                      }`}>
                        {year.isCurrent ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        year.transitionStatus === 'completed' ? 'bg-success/10 text-success' :
                        year.transitionStatus === 'in_progress' ? 'bg-warning/10 text-warning' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {year.transitionStatus.charAt(0).toUpperCase() + year.transitionStatus.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        {year.isCurrent && year.transitionStatus === 'pending' && (
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => handleStartTransition(year)}
                          >
                            Start Transition
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Transition Statistics */}
          {academicYears.map((year) => (
            year.transitionStatus === 'completed' && (
              <div key={`stats-${year.id}`} className="mt-6 p-4 bg-muted rounded-md">
                <h3 className="text-lg font-medium mb-4">
                  Transition Statistics: {year.yearName}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Students</p>
                    <p className="text-2xl font-bold">{year.totalStudents}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Promoted</p>
                    <p className="text-2xl font-bold text-success">{year.promotedStudents}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Retained</p>
                    <p className="text-2xl font-bold text-warning">{year.retainedStudents}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Transferred Out</p>
                    <p className="text-2xl font-bold text-error">{year.transferredStudents}</p>
                  </div>
                </div>
              </div>
            )
          ))}
        </div>
      </div>

      {/* Academic Year Form */}
      {showForm && (
        <AcademicYearForm
          onSubmit={(data) => {
            console.log('Form submitted:', data);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Transition Confirmation Dialog */}
      {showTransitionConfirm && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-6 w-6 text-warning" />
              <h3 className="text-lg font-semibold">Confirm Academic Year Transition</h3>
            </div>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to start the transition process for {selectedYear?.yearName}?
              This will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Lock current year's fee collection</li>
                <li>Initiate student promotion workflow</li>
                <li>Generate year-end reports</li>
              </ul>
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setShowTransitionConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleConfirmTransition}
              >
                Start Transition
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademicYearManagement;