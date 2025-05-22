import { X, MapPin, Users, Bus, CircleDollarSign, Pencil } from 'lucide-react';

interface VillageDetailsProps {
  village: any;
  onClose: () => void;
  onEdit: () => void;
}

const VillageDetails = ({ village, onClose, onEdit }: VillageDetailsProps) => {
  // Mock data for students from this village
  const students = [
    { id: 'ST-1001', name: 'Amit Kumar', class: 'IX-A', hasBus: true },
    { id: 'ST-1002', name: 'Priya Sharma', class: 'X-B', hasBus: true },
    { id: 'ST-1003', name: 'Rahul Singh', class: 'VII-C', hasBus: false },
  ];

  return (
    <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-lg max-w-4xl w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">{village.name}</h2>
            <p className="text-sm text-muted-foreground">Village Details</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="btn btn-outline btn-sm"
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit Village
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-full"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Village Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-muted p-4 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Distance</p>
              </div>
              <p className="text-2xl font-bold">{village.distance_from_school} km</p>
            </div>
            
            <div className="bg-muted p-4 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Total Students</p>
              </div>
              <p className="text-2xl font-bold">{village.total_students}</p>
            </div>
            
            <div className="bg-muted p-4 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <Bus className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Bus Students</p>
              </div>
              <p className="text-2xl font-bold">{village.bus_students}</p>
            </div>
            
            <div className="bg-muted p-4 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <CircleDollarSign className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Current Bus Fee</p>
              </div>
              <p className="text-2xl font-bold">{village.current_bus_fee}</p>
            </div>
          </div>

          {/* Students List */}
          <div className="bg-muted rounded-md p-4">
            <h3 className="text-lg font-medium mb-4">Students from {village.name}</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">ID</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Name</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Class</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Bus Service</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="border-b last:border-0">
                      <td className="px-4 py-2 font-medium">{student.id}</td>
                      <td className="px-4 py-2">{student.name}</td>
                      <td className="px-4 py-2">{student.class}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          student.hasBus ? 'bg-success/10 text-success' : 'bg-muted-foreground/10'
                        }`}>
                          {student.hasBus ? 'Yes' : 'No'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VillageDetails;