import { useState, useEffect } from 'react';
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
  const [sortedData, setSortedData] = useState(data);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  useEffect(() => {
    setSortedData([...data]);
  }, [data]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    const sorted = [...sortedData].sort((a, b) => {
      if (key === 'outstandingBalance') {
        // Convert string currency to number for sorting
        const aValue = parseFloat(a[key].replace(/,/g, ''));
        const bValue = parseFloat(b[key].replace(/,/g, ''));
        return direction === 'asc' ? aValue - bValue : bValue - aValue;
      } else if (key === 'defaulterCount') {
        return direction === 'asc' ? a[key] - b[key] : b[key] - a[key];
      } else {
        // String comparison for class and teacher
        if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
        if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
        return 0;
      }
    });
    
    setSortedData(sorted);
    setSortConfig({ key, direction });
  };

  return (
    <div className="bg-card rounded-lg shadow p-4 md:p-6">
      <h2 className="text-lg font-semibold mb-4">Class wise defaulters</h2>
      {sortedData.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No defaulters found
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  <button 
                    className="flex items-center gap-1 hover:text-foreground"
                    onClick={() => handleSort('class')}
                  >
                    Class
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  <button 
                    className="flex items-center gap-1 hover:text-foreground"
                    onClick={() => handleSort('teacher')}
                  >
                    Class Teacher
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  <button 
                    className="flex items-center gap-1 ml-auto hover:text-foreground"
                    onClick={() => handleSort('defaulterCount')}
                  >
                    Defaulter Count
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  <button 
                    className="flex items-center gap-1 ml-auto hover:text-foreground"
                    onClick={() => handleSort('outstandingBalance')}
                  >
                    Outstanding Balance
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((row, index) => (
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
      )}
    </div>
  );
};

export default DefaultersTable;