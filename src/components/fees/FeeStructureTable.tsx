import { Trash2, Edit, ArrowUpDown } from 'lucide-react';
import { FeeStructure } from '../../types/fees';

interface FeeStructureTableProps {
  feeStructures: FeeStructure[];
  onDelete: (id: string) => void;
  onEdit: (fee: FeeStructure) => void;
}

const FeeStructureTable = ({ feeStructures, onDelete, onEdit }: FeeStructureTableProps) => {
  if (feeStructures.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-8 text-center">
        <p className="text-muted-foreground">No fee structure items found.</p>
        <p className="text-sm text-muted-foreground mt-2">Click "Add Fee Item" to create one.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              <div className="flex items-center gap-1">
                Class
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              <div className="flex items-center gap-1">
                Fee Type
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">
              <div className="flex items-center justify-end gap-1">
                Amount (₹)
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Due Date</th>
            <th className="px-4 py-3 text-center font-medium text-muted-foreground">Monthly</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {feeStructures.map((fee) => (
            <tr key={fee.id} className="hover:bg-muted/50">
              <td className="px-4 py-3 font-medium">{fee.class?.name || 'Unknown'}</td>
              <td className="px-4 py-3">{fee.fee_type?.name || 'Unknown'}</td>
              <td className="px-4 py-3 text-right">₹{parseFloat(fee.amount.toString()).toLocaleString('en-IN')}</td>
              <td className="px-4 py-3">{new Date(fee.due_date).toLocaleDateString()}</td>
              <td className="px-4 py-3 text-center">
                {fee.is_recurring_monthly ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                    Yes
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                    No
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => onEdit(fee)}
                    className="p-1 hover:bg-muted rounded-md"
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(fee.id!)}
                    className="p-1 hover:bg-muted rounded-md text-error"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FeeStructureTable;