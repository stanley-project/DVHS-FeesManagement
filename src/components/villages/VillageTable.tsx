import { ArrowUpDown, Eye, Pencil, Trash2 } from 'lucide-react';
import { Village } from '../../types/village';

interface VillageTableProps {
  villages: Village[];
  onView: (village: Village) => void;
  onEdit: (village: Village) => void;
  onDelete: (id: string) => Promise<void>;
}

const VillageTable = ({
  villages = [], // Provide default empty array
  onView,
  onEdit,
  onDelete
}: VillageTableProps) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="px-4 py-3 text-left">
              <button className="flex items-center gap-1">
                Village Name
                <ArrowUpDown className="h-4 w-4" />
              </button>
            </th>
            <th className="px-4 py-3 text-left">
              <button className="flex items-center gap-1">
                Distance (km)
                <ArrowUpDown className="h-4 w-4" />
              </button>
            </th>
            <th className="px-4 py-3 text-left">
              <button className="flex items-center gap-1">
                Bus Number
                <ArrowUpDown className="h-4 w-4" />
              </button>
            </th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {villages.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                No villages found
              </td>
            </tr>
          ) : (
            villages.map((village) => (
              <tr key={village.id} className="border-b hover:bg-muted/50">
                <td className="px-4 py-3 font-medium">{village.name}</td>
                <td className="px-4 py-3">{village.distance_from_school}</td>
                <td className="px-4 py-3">{village.bus_number || 'N/A'}</td>
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
            ))
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