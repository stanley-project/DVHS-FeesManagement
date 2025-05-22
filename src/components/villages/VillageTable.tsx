import { Eye, Pencil, ToggleLeft } from 'lucide-react';

interface VillageTableProps {
  searchQuery: string;
  statusFilter: string;
  onView: (village: any) => void;
  onEdit: (village: any) => void;
}

const VillageTable = ({ searchQuery, statusFilter, onView, onEdit }: VillageTableProps) => {
  // Mock data - replace with actual API call
  const villages = [
    {
      id: '1',
      name: 'Rajapuram',
      distance_from_school: 5.2,
      is_active: true,
      current_bus_fee: '₹1,500',
      student_count: 45,
      bus_users: 32,
    },
    {
      id: '2',
      name: 'Krishnapuram',
      distance_from_school: 3.8,
      is_active: true,
      current_bus_fee: '₹1,200',
      student_count: 38,
      bus_users: 25,
    },
    {
      id: '3',
      name: 'Venkatapuram',
      distance_from_school: 7.5,
      is_active: false,
      current_bus_fee: '₹1,800',
      student_count: 15,
      bus_users: 12,
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
    <div className="bg-card rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Village Name</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Distance (km)</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Current Bus Fee</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Students</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Bus Users</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredVillages.map((village) => (
              <tr key={village.id} className="border-b hover:bg-muted/50">
                <td className="px-4 py-3 font-medium">{village.name}</td>
                <td className="px-4 py-3 text-right">{village.distance_from_school}</td>
                <td className="px-4 py-3 text-right">{village.current_bus_fee}</td>
                <td className="px-4 py-3 text-right">{village.student_count}</td>
                <td className="px-4 py-3 text-right">{village.bus_users}</td>
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
                      title="Edit Village"
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
      </div>

      {filteredVillages.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No villages found matching your search criteria
        </div>
      )}
    </div>
  );
};

export default VillageTable;