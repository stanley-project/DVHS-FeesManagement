import { ArrowUpDown } from 'lucide-react';

interface BusFeeHistoryProps {
  village: any;
}

const BusFeeHistory = ({ village }: BusFeeHistoryProps) => {
  // Mock data for fee history
  const feeHistory = [
    {
      id: 1,
      previousAmount: 1200,
      newAmount: 1500,
      changeDate: '2025-01-15',
      changedBy: 'Admin User',
      reason: 'Annual fee revision',
    },
    {
      id: 2,
      previousAmount: 1000,
      newAmount: 1200,
      changeDate: '2024-07-01',
      changedBy: 'Admin User',
      reason: 'Fuel price increase adjustment',
    },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Bus Fee History</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-3 text-left">
                <button className="flex items-center gap-1">
                  Change Date
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </th>
              <th className="px-4 py-3 text-right">Previous Amount</th>
              <th className="px-4 py-3 text-right">New Amount</th>
              <th className="px-4 py-3 text-left">Changed By</th>
              <th className="px-4 py-3 text-left">Reason</th>
            </tr>
          </thead>
          <tbody>
            {feeHistory.map((history) => (
              <tr key={history.id} className="border-b hover:bg-muted/50">
                <td className="px-4 py-3">{history.changeDate}</td>
                <td className="px-4 py-3 text-right">₹{history.previousAmount}</td>
                <td className="px-4 py-3 text-right">₹{history.newAmount}</td>
                <td className="px-4 py-3">{history.changedBy}</td>
                <td className="px-4 py-3">{history.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BusFeeHistory;