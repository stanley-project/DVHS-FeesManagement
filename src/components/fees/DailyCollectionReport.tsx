import { useState } from 'react';
import { Download, Filter, X } from 'lucide-react';

interface DailyCollectionReportProps {
  onClose: () => void;
}

const DailyCollectionReport = ({ onClose }: DailyCollectionReportProps) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('all');
  const [selectedCollector, setSelectedCollector] = useState('all');

  // Mock data for collections
  const collections = [
    { 
      receiptNumber: 'RC-2025001',
      studentName: 'Amit Kumar',
      class: 'IX-A',
      feeType: 'Term 1 Fee',
      amount: '₹15,000',
      paymentMethod: 'UPI',
      collectedBy: 'John Doe',
      time: '09:30 AM'
    },
    { 
      receiptNumber: 'RC-2025002',
      studentName: 'Priya Sharma',
      class: 'X-B',
      feeType: 'Term 1 Fee',
      amount: '₹15,000',
      paymentMethod: 'Cash',
      collectedBy: 'Jane Smith',
      time: '10:15 AM'
    },
    // Add more mock data as needed
  ];

  return (
    <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-lg w-full max-w-4xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Daily Collection Report</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input"
            />
            
            <select
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              className="input"
            >
              <option value="all">All Payment Methods</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
            </select>
            
            <select
              value={selectedCollector}
              onChange={(e) => setSelectedCollector(e.target.value)}
              className="input"
            >
              <option value="all">All Collectors</option>
              <option value="john">John Doe</option>
              <option value="jane">Jane Smith</option>
            </select>

            <button className="btn btn-outline btn-sm ml-auto">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-muted p-4 rounded-md">
              <p className="text-sm text-muted-foreground">Total Collection</p>
              <p className="text-2xl font-bold mt-1">₹45,000</p>
              <p className="text-xs text-muted-foreground mt-1">15 transactions</p>
            </div>
            
            <div className="bg-muted p-4 rounded-md">
              <p className="text-sm text-muted-foreground">Cash Collection</p>
              <p className="text-2xl font-bold mt-1">₹15,000</p>
              <p className="text-xs text-muted-foreground mt-1">5 transactions</p>
            </div>
            
            <div className="bg-muted p-4 rounded-md">
              <p className="text-sm text-muted-foreground">Online Collection</p>
              <p className="text-2xl font-bold mt-1">₹30,000</p>
              <p className="text-xs text-muted-foreground mt-1">10 transactions</p>
            </div>
          </div>

          {/* Collections Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Receipt No.</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Student Name</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Class</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fee Type</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Payment Method</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Collected By</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Time</th>
                </tr>
              </thead>
              <tbody>
                {collections.map((collection, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">{collection.receiptNumber}</td>
                    <td className="px-4 py-3">{collection.studentName}</td>
                    <td className="px-4 py-3">{collection.class}</td>
                    <td className="px-4 py-3">{collection.feeType}</td>
                    <td className="px-4 py-3 text-right">{collection.amount}</td>
                    <td className="px-4 py-3">{collection.paymentMethod}</td>
                    <td className="px-4 py-3">{collection.collectedBy}</td>
                    <td className="px-4 py-3">{collection.time}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/50">
                  <td className="px-4 py-3 font-medium" colSpan={4}>Total</td>
                  <td className="px-4 py-3 text-right font-medium">₹45,000</td>
                  <td className="px-4 py-3" colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyCollectionReport;