import { ArrowUpDown } from 'lucide-react';

interface OutstandingReportProps {
  type: string;
  dateRange: {
    start: string;
    end: string;
  };
  selectedClass: string;
  selectedFeeType: string;
}

const OutstandingReport = ({ type, dateRange, selectedClass, selectedFeeType }: OutstandingReportProps) => {
  // Mock data for outstanding fees
  const outstandingData = [
    {
      class: 'IX-A',
      studentCount: 45,
      totalFee: '₹6,75,000',
      collected: '₹5,40,000',
      outstanding: '₹1,35,000',
      defaulters: 8,
    },
    // Add more mock data
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-muted p-4 rounded-md">
          <p className="text-sm text-muted-foreground">Total Outstanding</p>
          <p className="text-2xl font-bold mt-1">₹7,85,000</p>
          <p className="text-xs text-error mt-1">15% of total fee</p>
        </div>
        
        <div className="bg-muted p-4 rounded-md">
          <p className="text-sm text-muted-foreground">Defaulters</p>
          <p className="text-2xl font-bold mt-1">125</p>
          <p className="text-xs text-muted-foreground mt-1">10% of students</p>
        </div>
        
        <div className="bg-muted p-4 rounded-md">
          <p className="text-sm text-muted-foreground">30+ Days Overdue</p>
          <p className="text-2xl font-bold mt-1">₹3,25,000</p>
          <p className="text-xs text-error mt-1">41% of outstanding</p>
        </div>
        
        <div className="bg-muted p-4 rounded-md">
          <p className="text-sm text-muted-foreground">Collection Rate</p>
          <p className="text-2xl font-bold mt-1">85%</p>
          <p className="text-xs text-success mt-1">+2% from last month</p>
        </div>
      </div>

      {/* Outstanding Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-3 text-left">
                <button className="flex items-center gap-1">
                  Class
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </th>
              <th className="px-4 py-3 text-right">
                <button className="flex items-center gap-1 ml-auto">
                  Students
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </th>
              <th className="px-4 py-3 text-right">
                <button className="flex items-center gap-1 ml-auto">
                  Total Fee
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </th>
              <th className="px-4 py-3 text-right">
                <button className="flex items-center gap-1 ml-auto">
                  Collected
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </th>
              <th className="px-4 py-3 text-right">
                <button className="flex items-center gap-1 ml-auto">
                  Outstanding
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </th>
              <th className="px-4 py-3 text-right">
                <button className="flex items-center gap-1 ml-auto">
                  Defaulters
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {outstandingData.map((row, index) => (
              <tr key={index} className="border-b hover:bg-muted/50">
                <td className="px-4 py-3 font-medium">{row.class}</td>
                <td className="px-4 py-3 text-right">{row.studentCount}</td>
                <td className="px-4 py-3 text-right">{row.totalFee}</td>
                <td className="px-4 py-3 text-right">{row.collected}</td>
                <td className="px-4 py-3 text-right text-error">{row.outstanding}</td>
                <td className="px-4 py-3 text-right">{row.defaulters}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t bg-muted/50">
              <td className="px-4 py-3 font-medium">Total</td>
              <td className="px-4 py-3 text-right font-medium">450</td>
              <td className="px-4 py-3 text-right font-medium">₹67,50,000</td>
              <td className="px-4 py-3 text-right font-medium">₹59,65,000</td>
              <td className="px-4 py-3 text-right font-medium text-error">₹7,85,000</td>
              <td className="px-4 py-3 text-right font-medium">125</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Aging Analysis */}
      {type === 'aging' && (
        <div className="mt-8">
          <h3 className="text-lg font-medium mb-4">Aging Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-muted p-4 rounded-md">
              <p className="text-sm text-muted-foreground">0-30 Days</p>
              <p className="text-2xl font-bold mt-1">₹2,85,000</p>
              <p className="text-xs text-muted-foreground mt-1">36% of total</p>
            </div>
            
            <div className="bg-muted p-4 rounded-md">
              <p className="text-sm text-muted-foreground">31-60 Days</p>
              <p className="text-2xl font-bold mt-1">₹2,15,000</p>
              <p className="text-xs text-muted-foreground mt-1">27% of total</p>
            </div>
            
            <div className="bg-muted p-4 rounded-md">
              <p className="text-sm text-muted-foreground">61-90 Days</p>
              <p className="text-2xl font-bold mt-1">₹1,65,000</p>
              <p className="text-xs text-muted-foreground mt-1">21% of total</p>
            </div>
            
            <div className="bg-muted p-4 rounded-md">
              <p className="text-sm text-muted-foreground">90+ Days</p>
              <p className="text-2xl font-bold mt-1">₹1,20,000</p>
              <p className="text-xs text-muted-foreground mt-1">15% of total</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutstandingReport;