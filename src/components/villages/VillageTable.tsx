import { ArrowUpDown, Eye, Pencil, ToggleLeft } from 'lucide-react';

interface VillageTableProps {
  searchQuery: string;
  statusFilter: string;
  onView: (village: any) => void;
  onEdit: (village: any) => void;
}

const VillageTable = ({ searchQuery, statusFilter, onView, onEdit }: VillageTableProps) => {
  // Mock data for villages
  const villages = [
    {
      id: '1',
      name: 'Ramapuram',
      distance_from_school: 5.2,
      is_active: true,
      current_bus_fee: '₹1,500',
      total_students: 45,
      bus_students: 32,
    },
    {
      id: '2',
      name: 'Kondapur',
      distance_from_school: 3.8,
      is_active: true,
      current_bus_fee: '₹1,200',
      total_students: 38,
      bus_students: 25,
    },
    {
      id: '3',
      name: 'Gachibowli',
      distance_from_school: 7.5,
      is_active: false,
      current_bus_fee: '₹2,000',
      total_students: 28,
      bus_students: 20,
    },
  ];

  const filteredVillages = villages.filter(village => {
    const matchesSearch = village.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && village.is_active) ||
      (statusFilter === 'inactive' && !village.is_active);
    
    return matchesSearch && matchesStatus;
  });

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
          {filteredVillages.map((village) => (
            <tr key={village.id} className="border-b hover:bg-muted/50">
              <td className="px-4 py-3 font-medium">{village.name}</td>
              <td className="px-4 py-3 text-right">{village.distance_from_school}</td>
              <td className="px-4 py-3 text-right">{village.current_bus_fee}</td>
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
                    title="Toggle Status"
                  >
                    <ToggleLeft className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {filteredVillages.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No villages found matching your search criteria
        </div>
      )}
    </div>
  );
};

export default VillageTable;