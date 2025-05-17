import { ArrowRight } from 'lucide-react';

interface Student {
  id: string;
  name: string;
  status?: string;
  pending?: string;
  class?: string;
}

interface StudentListProps {
  students: Student[];
  selectedStudent: number | null;
  onSelectStudent: (index: number) => void;
}

const StudentList = ({ students, selectedStudent, onSelectStudent }: StudentListProps) => {
  return (
    <div className="divide-y">
      {students.map((student, index) => (
        <div
          key={index}
          className={`py-3 px-2 hover:bg-muted rounded-md cursor-pointer transition-colors ${selectedStudent === index ? 'bg-muted' : ''}`}
          onClick={() => onSelectStudent(index)}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium">{student.name}</p>
              <p className="text-xs text-muted-foreground">
                {student.id} {student.class && `| ${student.class}`}
              </p>
            </div>
            <ArrowRight className={`h-4 w-4 transition-opacity ${selectedStudent === index ? 'opacity-100 text-primary' : 'opacity-0'}`} />
          </div>
          {student.status && (
            <div className="mt-1 flex justify-between items-center">
              <div className="flex items-center">
                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                  student.status === 'paid' ? 'bg-success' : 
                  student.status === 'partial' ? 'bg-warning' : 
                  'bg-error'
                }`}></span>
                <span className="text-xs capitalize">{student.status}</span>
              </div>
              {student.pending && (
                <p className="text-xs text-muted-foreground">Pending: {student.pending}</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default StudentList;