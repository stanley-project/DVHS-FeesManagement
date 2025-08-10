import { useState, useEffect, useMemo } from 'react';
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
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  }>({
    key: 'defaulterCount',
    direction: 'desc'
  });

  // Memoize the sorted data to prevent unnecessary re-sorting
  const sortedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return [...data].sort((a, b) => {
      if (sortConfig.key === 'outstandingBalance') {
        // Convert string currency to number for sorting
        const aValue = parseFloat(a[sortConfig.key].replace(/,/g, ''));
        const bValue = parseFloat(b[sortConfig.key].replace(/,/g, ''));
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      } else if (sortConfig.key === 'defaulterCount') {
        return sortConfig.direction === 'asc' ? a[sortConfig.key] - b[sortConfig.key] : b[sortConfig.key] - a[sortConfig.key];
      } else {
        // String comparison for class and teacher
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      }
    });
  }, [data, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  return (
    <div className="bg-card rounded-lg shadow p-4 md:p-6">
      <h2 className="text-lg font-semibold mb-4">Class wise defaulters</h2>
      {!sortedData || sortedData.length === 0 ? (
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
                    <ArrowUpDown className={`h-4 w-4 ${sortConfig.key === 'class' ? 'text-primary' : ''}`} />
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  <button 
                    className="flex items-center gap-1 hover:text-foreground"
                    onClick={() => handleSort('teacher')}
                  >
                    Class Teacher
                    <ArrowUpDown className={`h-4 w-4 ${sortConfig.key === 'teacher' ? 'text-primary' : ''}`} />
                  </button>
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  <button 
                    className="flex items-center gap-1 ml-auto hover:text-foreground"
                    onClick={() => handleSort('defaulterCount')}
                  >
                    Defaulter Count
                    <ArrowUpDown className={`h-4 w-4 ${sortConfig.key === 'defaulterCount' ? 'text-primary' : ''}`} />
                  </button>
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  <button 
                    className="flex items-center gap-1 ml-auto hover:text-foreground"
                    onClick={() => handleSort('outstandingBalance')}
                  >
                    Outstanding Balance
                    <ArrowUpDown className={`h-4 w-4 ${sortConfig.key === 'outstandingBalance' ? 'text-primary' : ''}`} />
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