import { CircleDollarSign, Users, Bus, ArrowUpDown } from 'lucide-react';

interface VillageDetailsProps {
  village: any;
  onClose: () => void;
  onEdit: () => void;
}

const VillageDetails = ({ village, onClose, onEdit }: VillageDetailsProps) => {
  // Mock data for students
  const students = [
    { id: 'ST1001', name: 'Rahul Kumar', class: 'IX-A', usesBus: true },
    { id: 'ST1002', name: 'Priya Sharma', class: 'X-B', usesBus: true },
    { id: 'ST1003', name: 'Amit Singh', class: 'VIII-C', usesBus: false },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{village.name}</h2>
          <p className="text-muted-foreground">
            {village.distance_from_school} km from school
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-outline btn-md"
            onClick={onClose}
          >
            Close
          </button>
          <button
            className="btn btn-primary btn-md"
            onClick={onEdit}
          >
            Edit Village
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-muted p-4 rounded-md">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-medium">Total Students</h3>
          </div>
          <p className="text-2xl font-bold">{village.student_count}</p>
        </div>

        <div className="bg-muted p-4 rounded-md">
          <div className="flex items-center gap-2 mb-2">
            <Bus className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-medium">Bus Users</h3>
          </div>
          <p className="text-2xl font-bold">{village.bus_users}</p>
        </div>

        <div className="bg-muted p-4 rounded-md">
          <div className="flex items-center gap-2 mb-2">
            <CircleDollarSign className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-medium">Monthly Bus Revenue</h3>
          </div>
          <p className="text-2xl font-bold">₹{(village.bus_users * parseInt(village.current_bus_fee.replace(/[^0-9]/g, ''))).toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Bus Fee Structure */}
      <div className="bg-card rounded-lg shadow p-4">
        <h3 className="text-lg font-medium mb-4">Bus Fee Structure</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Academic Year</th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground">Monthly Fee</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Effective From</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="px-4 py-2">2025-2026</td>
              <td className="px-4 py-2 text-right">{village.current_bus_fee}</td>
              <td className="px-4 py-2">Jun 01, 2025</td>
              <td className="px-4 py-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
                  Active
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Students List */}
      <div className="bg-card rounded-lg shadow p-4">
        <h3 className="text-lg font-medium mb-4">Students from {village.name}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                  <button className="flex items-center gap-1">
                    Student ID
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                  <button className="flex items-center gap-1">
                    Name
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Class</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Bus Service</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="border-b hover:bg-muted/50">
                  <td className="px-4 py-2 font-medium">{student.id}</td>
                  <td className="px-4 py-2">{student.name}</td>
                  <td className="px-4 py-2">{student.class}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      student.usesBus ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                    }`}>
                      {student.usesBus ? 'Using Bus' : 'Not Using'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default VillageDetails;