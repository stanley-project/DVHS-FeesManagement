import { useVillageContext } from '../../contexts/VillageContext';
// Assuming these are imported from somewhere, e.g., @lucide/react
import { ArrowUpDown, Eye, Pencil, ToggleLeft } from 'lucide-react'; 

interface VillageTableProps {
  searchQuery: string;
  statusFilter: string;
  onView: (village: any) => void;
  onEdit: (village: any) => void;
}

const VillageTable = ({ searchQuery, statusFilter, onView, onEdit }: VillageTableProps) => {
  const { villages, loading, error, updateVillage, isInitialized } = useVillageContext();

  if (!isInitialized) {
    return <div className="text-center py-8">Initializing village data...</div>;
  }

  console.log("VillageTable: Data from useVillageContext:");
  console.log("  villages:", villages);
  console.log("  loading:", loading);
  console.log("  error:", error);
  console.log("VillageTable: Props:");
  console.log("  searchQuery:", searchQuery);
  console.log("  statusFilter:", statusFilter);


  const handleToggleStatus = async (village: any) => {
    try {
      console.log(`VillageTable: Toggling status for village ${village.id}: from ${village.is_active} to ${!village.is_active}`);
      await updateVillage(village.id, { is_active: !village.is_active });
    } catch (err) {
      console.error('VillageTable: Failed to toggle village status:', err);
    }
  };

  const filteredVillages = villages.filter(village => {
    const matchesSearch = village.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && village.is_active) ||
      (statusFilter === 'inactive' && !village.is_active);
    
    return matchesSearch && matchesStatus;
  });

  console.log("VillageTable: Filtered Villages:", filteredVillages);

  // Removed duplicate loading and error checks
  if (loading) {
    return <div className="text-center py-8">Loading villages...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-8 text-error">
        Error loading villages: {error}
      </div>
    );
  }

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
            <th className="px-4 py-3 text-right">
              <button className="flex items-center gap-1 ml-auto">
                Distance (km)
                <ArrowUpDown className="h-4 w-4" />
              </button>
            </th>
            <th className="px-4 py-3 text-right">Current Bus Fee</th>
            <th className="px-4 py-3 text-right">Total Students</th>
            <th className="px-4 py-3 text-right">Bus Students</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredVillages.length === 0 && !loading && !error ? (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                No villages found matching your search criteria.
              </td>
            </tr>
          ) : (
            filteredVillages.map((village) => (
              <tr key={village.id} className="border-b hover:bg-muted/50">
                <td className="px-4 py-3 font-medium">{village.name}</td>
                <td className="px-4 py-3 text-right">{village.distance_from_school}</td>
                <td className="px-4 py-3 text-right">
                  {village.current_bus_fee 
                    ? `₹${village.current_bus_fee.toLocaleString('en-IN')}`
                    : '-'
                  }
                </td>
                <td className="px-4 py-3 text-right">{village.total_students}</td>
                <td className="px-4 py-3 text-right">{village.bus_students}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    village.is_active ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                  }`}>
                    {village.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      className="p-1 hover:bg-muted rounded-md"
                      onClick={() => onView(village)}
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      className="p-1 hover:bg-muted rounded-md"
                      onClick={() => onEdit(village)}
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      className="p-1 hover:bg-muted rounded-md"
                      onClick={() => handleToggleStatus(village)}
                      title="Toggle Status"
                    >
                      <ToggleLeft className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default VillageTable;