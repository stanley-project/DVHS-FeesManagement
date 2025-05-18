import { ArrowUpDown, FileText } from 'lucide-react';

interface CollectionReportProps {
  type: string;
  dateRange: {
    start: string;
    end: string;
  };
  selectedClass: string;
  selectedFeeType: string;
}

const CollectionReport = ({ type, dateRange, selectedClass, selectedFeeType }: CollectionReportProps) => {
  // Mock data for collections
  const collections = [
    {
      date: '2025-08-15',
      receiptNumber: 'RC-2025001',
      studentName: 'Amit Kumar',
      class: 'IX-A',
      feeType: 'Term 1 Fee',
      amount: '₹15,000',
      paymentMethod: 'UPI',
    },
    // Add more mock data
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-muted p-4 rounded-md">
          <p className="text-sm text-muted-foreground">Total Collection</p>
          <p className="text-2xl font-bold mt-1">₹3,25,000</p>
          <p className="text-xs text-success mt-1">+12% from last period</p>
        </div>
        
        <div className="bg-muted p-4 rounded-md">
          <p className="text-sm text-muted-foreground">Online Payments</p>
          <p className="text-2xl font-bold mt-1">₹2,15,000</p>
          <p className="text-xs text-muted-foreground mt-1">66% of total</p>
        </div>
        
        <div className="bg-muted p-4 rounded-md">
          <p className="text-sm text-muted-foreground">Cash Payments</p>
          <p className="text-2xl font-bold mt-1">₹1,10,000</p>
          <p className="text-xs text-muted-foreground mt-1">34% of total</p>
        </div>
      </div>

      {/* Collection Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-3 text-left">
                <button className="flex items-center gap-1">
                  Date
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button className="flex items-center gap-1">
                  Receipt No.
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </th>
              <th className="px-4 py-3 text-left">Student Name</th>
              <th className="px-4 py-3 text-left">Class</th>
              <th className="px-4 py-3 text-left">Fee Type</th>
              <th className="px-4 py-3 text-right">
                <button className="flex items-center gap-1 ml-auto">
                  Amount
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </th>
              <th className="px-4 py-3 text-left">Payment Method</th>
              <th className="px-4 py-3 text-right">Receipt</th>
            </tr>
          </thead>
          <tbody>
            {collections.map((collection, index) => (
              <tr key={index} className="border-b hover:bg-muted/50">
                <td className="px-4 py-3">{collection.date}</td>
                <td className="px-4 py-3 font-medium">{collection.receiptNumber}</td>
                <td className="px-4 py-3">{collection.studentName}</td>
                <td className="px-4 py-3">{collection.class}</td>
                <td className="px-4 py-3">{collection.feeType}</td>
                <td className="px-4 py-3 text-right">{collection.amount}</td>
                <td className="px-4 py-3">{collection.paymentMethod}</td>
                <td className="px-4 py-3 text-right">
                  <button className="text-primary hover:text-primary/80">
                    <FileText className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t bg-muted/50">
              <td className="px-4 py-3 font-medium" colSpan={5}>Total</td>
              <td className="px-4 py-3 text-right font-medium">₹3,25,000</td>
              <td className="px-4 py-3" colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Showing 1 to 10 of 50 entries
        </p>
        <div className="flex gap-1">
          <button className="btn btn-outline btn-sm">Previous</button>
          <button className="btn btn-outline btn-sm">Next</button>
        </div>
      </div>
    </div>
  );
};

export default CollectionReport;