import { ArrowUpDown } from 'lucide-react';

interface DefaultersTableProps {
  data: {
    class: string;
    teacher: string;
    defaulterCount: number;
    outstandingBalance: string;
  }[];
}

const DefaultersTable = ({ data }: DefaultersTableProps) => {
  return (
    <div className="bg-card rounded-lg shadow p-4 md:p-6">
      <h2 className="text-lg font-semibold mb-4">Class wise defaulters</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                <button className="flex items-center gap-1">
                  Class
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                <button className="flex items-center gap-1">
                  Class Teacher
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                <button className="flex items-center gap-1 ml-auto">
                  Defaulter Count
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                <button className="flex items-center gap-1 ml-auto">
                  Outstanding Balance
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index} className="border-b last:border-0 hover:bg-muted/50">
                <td className="px-4 py-3 font-medium">{row.class}</td>
                <td className="px-4 py-3">{row.teacher}</td>
                <td className="px-4 py-3 text-right">{row.defaulterCount}</td>
                <td className="px-4 py-3 text-right">₹{row.outstandingBalance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DefaultersTable;