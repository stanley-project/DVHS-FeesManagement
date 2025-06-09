import { useState } from 'react';
import { Search, Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';
import StudentTable from '../components/students/StudentTable';
import StudentForm from '../components/students/StudentForm';
import StudentSearch from '../components/students/StudentSearch';
import StudentDetails from '../components/students/StudentDetails';
import StudentDataImport from '../components/students/StudentDataImport';
import RegistrationTypeSelector from '../components/students/RegistrationTypeSelector';
import { useStudents, Student } from '../hooks/useStudents';

const StudentRegistration = () => {
  const [showForm, setShowForm] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [registrationType, setRegistrationType] = useState<'new' | 'rejoining' | 'continuing'>('new');

  const { addStudent, updateStudent, refreshStudents } = useStudents();

  const handleSubmit = async (data: any) => {
    try {
      if (selectedStudent) {
        await updateStudent(selectedStudent.id, data);
        toast.success('Student updated successfully');
      } else {
        await addStudent(data);
        toast.success('Student registered successfully');
      }
      
      setShowForm(false);
      setSelectedStudent(null);
    } catch (error) {
      console.error('Error saving student:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save student');
    }
  };

  const handleSearchSelect = (student: Student) => {
    setSelectedStudent(student);
    setRegistrationType('rejoining');
    setShowForm(true);
  };

  const handleAddStudent = () => {
    setSelectedStudent(null);
    setRegistrationType('new');
    setShowForm(true);
  };

  const handleEditStudent = (student: Student) => {
    setSelectedStudent(student);
    setRegistrationType(student.registration_type);
    setShowForm(true);
  };

  const handleViewStudent = (student: Student) => {
    setSelectedStudent(student);
    setShowDetails(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedStudent(null);
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
    setSelectedStudent(null);
  };

  const handleEditFromDetails = () => {
    setShowDetails(false);
    setShowForm(true);
    // selectedStudent is already set
  };

  const handleImportComplete = () => {
    refreshStudents();
    toast.success('Student data import completed successfully');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1>Student Registration</h1>
        {!showForm && (
          <div className="flex gap-2">
            <button
              className="btn btn-outline btn-md inline-flex items-center"
              onClick={() => setShowImport(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Import Students
            </button>
            <button
              className="btn btn-outline btn-md inline-flex items-center"
              onClick={() => setShowSearch(true)}
            >
              <Search className="h-4 w-4 mr-2" />
              Search Previous Students
            </button>
          </div>
        )}
      </div>

      {showForm ? (
        <div className="bg-card rounded-lg shadow p-6">
          <RegistrationTypeSelector
            value={registrationType}
            onChange={setRegistrationType}
            onSearch={() => {
              setShowForm(false);
              setShowSearch(true);
            }}
          />
          
          <div className="mt-6">
            <StudentForm
              onSubmit={handleSubmit}
              onCancel={handleCloseForm}
              initialData={selectedStudent}
              registrationType={registrationType}
            />
          </div>
        </div>
      ) : (
        <StudentTable
          onAddStudent={handleAddStudent}
          onEditStudent={handleEditStudent}
          onViewStudent={handleViewStudent}
        />
      )}

      {showSearch && (
        <StudentSearch
          onSelect={handleSearchSelect}
          onClose={() => setShowSearch(false)}
        />
      )}

      {showDetails && selectedStudent && (
        <StudentDetails
          student={selectedStudent}
          onClose={handleCloseDetails}
          onEdit={handleEditFromDetails}
        />
      )}

      {showImport && (
        <StudentDataImport
          onClose={() => setShowImport(false)}
          onImportComplete={handleImportComplete}
        />
      )}
    </div>
  );
};

export default StudentRegistration;