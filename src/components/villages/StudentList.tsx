import { useState, useEffect } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Village } from '../../types/village';

interface StudentListProps {
  village: Village;
}

const StudentList = ({ village }: StudentListProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: studentsError } = await supabase
          .from('students')
          .select(`
            id,
            admission_number,
            student_name,
            class:class_id(name),
            has_school_bus,
            status
          `)
          .eq('village_id', village.id)
          .eq('status', 'active')
          .order('student_name');

        if (studentsError) throw studentsError;

        setStudents(data || []);
      } catch (err) {
        console.error('Error fetching students:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch students');
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [village.id]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Students from {village.name}</h3>
      
      {error && (
        <div className="bg-error/10 border border-error/30 text-error rounded-md p-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No students found from this village
        </div>
      ) : (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-3 text-left">Student ID</th>
              <th className="px-4 py-3 text-left">Student Name</th>
              <th className="px-4 py-3 text-left">Class</th>
              <th className="px-4 py-3 text-left">Bus Service</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="border-b hover:bg-muted/50">
                <td className="px-4 py-3 font-medium">{student.admission_number}</td>
                <td className="px-4 py-3">{student.student_name}</td>
                <td className="px-4 py-3">{student.class?.name}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    student.has_school_bus ? 'bg-success/10 text-success' : 'bg-muted-foreground/10'
                  }`}>
                    {student.has_school_bus ? 'Yes' : 'No'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
};

export default StudentList;