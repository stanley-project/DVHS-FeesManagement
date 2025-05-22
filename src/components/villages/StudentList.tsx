import { ArrowUpDown } from 'lucide-react';

interface StudentListProps {
  village: any;
}

const StudentList = ({ village }: StudentListProps) => {
  // Mock data for students
  const students = [
    {
      id: 'ST-1001',
      name: 'Amit Kumar',
      class: 'IX-A',
      hasBus: true,
      feeStatus: 'paid',
    },
    {
      id: 'ST-1002',
      name: 'Priya Sharma',
      class: 'X-B',
      hasBus: true,
      feeStatus: 'pending',
    },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Students from {village.name}</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-3 text-left">
                <button className="flex items-center gap-1">
                  Student ID
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </th>
              <th className="px-4 py-3 text-left">Student Name</th>
              <th className="px-4 py-3 text-left">Class</th>
              <th className="px-4 py-3 text-left">Bus Service</th>
              <th className="px-4 py-3 text-left">Fee Status</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="border-b hover:bg-muted/50">
                <td className="px-4 py-3 font-medium">{student.id}</td>
                <td className="px-4 py-3">{student.name}</td>
                <td className="px-4 py-3">{student.class}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    student.hasBus ? 'bg-success/10 text-success' : 'bg-muted-foreground/10'
                  }`}>
                    {student.hasBus ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    student.feeStatus === 'paid' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                  }`}>
                    {student.feeStatus === 'paid' ? 'Paid' : 'Pending'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentList;