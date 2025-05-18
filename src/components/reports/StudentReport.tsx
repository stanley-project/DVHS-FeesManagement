import { ArrowUpDown } from 'lucide-react';

interface StudentReportProps {
  type: string;
  dateRange: {
    start: string;
    end: string;
  };
  selectedClass: string;
}

const StudentReport = ({ type, dateRange, selectedClass }: StudentReportProps) => {
  // Mock data for student reports
  const studentData = [
    {
      admissionNumber: 'ST-2025001',
      name: 'Amit Kumar',
      class: 'IX-A',
      admissionDate: '2025-06-01',
      totalFee: '₹45,000',
      paid: '₹30,000',
      pending: '₹15,000',
      status: 'partial',
    },
    // Add more mock data
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-muted p-4 rounded-md">
          <p className="text-sm text-muted-foreground">Total Students</p>
          <p className="text-2xl font-bold mt-1">1,250</p>
          <p className="text-xs text-success mt-1">+5% from last year</p>
        </div>
        
        <div className="bg-muted p-4 rounded-md">
          <p className="text-sm text-muted-foreground">New Admissions</p>
          <p className="text-2xl font-bold mt-1">125</p>
          <p className="text-xs text-muted-foreground mt-1">This academic year</p>
        </div>
        
        <div className="bg-muted p-4 rounded-md">
          <p className="text-sm text-muted-foreground">Fully Paid</p>
          <p className="text-2xl font-bold mt-1">875</p>
          <p className="text-xs text-success mt-1">70% of total</p>
        </div>
        
        <div className="bg-muted p-4 rounded-md">
          <p className="text-sm text-muted-foreground">Defaulters</p>
          <p className="text-2xl font-bold mt-1">125</p>
          <p className="text-xs text-error mt-1">10% of total</p>
        </div>
      </div>

      {/* Student Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-3 text-left">
                <button className="flex items-center gap-1">
                  Admission No.
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button className="flex items-center gap-1">
                  Student Name
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </th>
              <th className="px-4 py-3 text-left">Class</th>
              <th className="px-4 py-3 text-left">
                <button className="flex items-center gap-1">
                  Admission Date
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </th>
              <th className="px-4 py-3 text-right">Total Fee</th>
              <th className="px-4 py-3 text-right">Paid</th>
              <th className="px-4 py-3 text-right">Pending</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {studentData.map((student, index) => (
              <tr key={index} className="border-b hover:bg-muted/50">
                <td className="px-4 py-3 font-medium">{student.admissionNumber}</td>
                <td className="px-4 py-3">{student.name}</td>
                <td className="px-4 py-3">{student.class}</td>
                <td className="px-4 py-3">{student.admissionDate}</td>
                <td className="px-4 py-3 text-right">{student.totalFee}</td>
                <td className="px-4 py-3 text-right">{student.paid}</td>
                <td className="px-4 py-3 text-right">{student.pending}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    student.status === 'paid' ? 'bg-success/10 text-success' :
                    student.status === 'partial' ? 'bg-warning/10 text-warning' :
                    'bg-error/10 text-error'
                  }`}>
                    {student.status === 'paid' ? 'Paid' :
                     student.status === 'partial' ? 'Partial' :
                     'Pending'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Class-wise Distribution */}
      {type === 'classwise' && (
        <div className="mt-8">
          <h3 className="text-lg font-medium mb-4">Class-wise Distribution</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'].map((cls) => (
              <div key={cls} className="bg-muted p-4 rounded-md">
                <p className="text-sm text-muted-foreground">Class {cls}</p>
                <p className="text-2xl font-bold mt-1">{Math.floor(Math.random() * 50) + 30}</p>
                <div className="flex justify-between items-center mt-1 text-xs">
                  <span className="text-success">Active: {Math.floor(Math.random() * 40) + 20}</span>
                  <span className="text-error">Inactive: {Math.floor(Math.random() * 10)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentReport;