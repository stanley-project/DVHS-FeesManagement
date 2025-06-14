import { ArrowUpDown, Eye, Pencil, Trash2, Users, Bus, Loader2 } from 'lucide-react';
import { Village } from '../../types/village';

interface SortConfig {
  column: keyof Village;
  direction: 'asc' | 'desc';
}

interface VillageTableProps {
  villages: Village[];
  sortConfig: SortConfig;
  onSort: (column: keyof Village) => void;
  onView: (village: Village) => void;
  onEdit: (village: Village) => void;
  onDelete: (id: string) => Promise<void>;
  villageStats?: Record<string, { totalStudents: number, busStudents: number }>;
  loadingStats?: boolean;
}

const VillageTable = ({
  villages = [], // Provide default empty array
  sortConfig,
  onSort,
  onView,
  onEdit,
  onDelete,
  villageStats = {},
  loadingStats = false
}: VillageTableProps) => {
  const getSortIcon = (column: keyof Village) => {
    if (sortConfig.column !== column) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ArrowUpDown className="h-4 w-4 text-primary" /> : 
      <ArrowUpDown className="h-4 w-4 text-primary rotate-180" />;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="px-4 py-3 text-left">
              <button 
                onClick={() => onSort('name')}
                className="flex items-center gap-1 hover:text-primary"
              >
                Village Name
                {getSortIcon('name')}
              </button>
            </th>
            <th className="px-4 py-3 text-left">
              <button 
                onClick={() => onSort('distance_from_school')}
                className="flex items-center gap-1 hover:text-primary"
              >
                Distance (km)
                {getSortIcon('distance_from_school')}
              </button>
            </th>
            <th className="px-4 py-3 text-left">
              <button 
                onClick={() => onSort('bus_number')}
                className="flex items-center gap-1 hover:text-primary"
              >
                Bus Number
                {getSortIcon('bus_number')}
              </button>
            </th>
            <th className="px-4 py-3 text-center">
              <div className="flex items-center justify-center gap-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>Total Students</span>
              </div>
            </th>
            <th className="px-4 py-3 text-center">
              <div className="flex items-center justify-center gap-1">
                <Bus className="h-4 w-4 text-muted-foreground" />
                <span>Bus Students</span>
              </div>
            </th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {villages.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                No villages found
              </td>
            </tr>
          ) : (
            villages.map((village) => {
              const stats = villageStats[village.id] || { totalStudents: 0, busStudents: 0 };
              
              return (
                <tr key={village.id} className="border-b hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium">{village.name}</td>
                  <td className="px-4 py-3">{village.distance_from_school}</td>
                  <td className="px-4 py-3">{village.bus_number || 'N/A'}</td>
                  <td className="px-4 py-3 text-center">
                    {loadingStats ? (
                      <div className="flex justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <span className="font-medium">{stats.totalStudents}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {loadingStats ? (
                      <div className="flex justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <span className="font-medium">{stats.busStudents}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        village.is_active
                          ? 'bg-success/10 text-success'
                          : 'bg-error/10 text-error'
                      }`}
                    >
                      {village.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onView(village)}
                        className="p-1 hover:bg-muted rounded-md"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onEdit(village)}
                        className="p-1 hover:bg-muted rounded-md"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDelete(village.id)}
                        className="p-1 hover:bg-muted rounded-md text-error"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      <div className="p-4 border-t flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {villages.length} villages
        </p>
      </div>
    </div>
  );
};

export default VillageTable;