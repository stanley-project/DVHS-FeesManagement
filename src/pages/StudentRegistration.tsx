import { useState, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import StudentTable from '../components/students/StudentTable';
import StudentForm from '../components/students/StudentForm';
import StudentSearch from '../components/students/StudentSearch';
import StudentDetails from '../components/students/StudentDetails';
import StudentDataImport from '../components/students/StudentDataImport';
import StudentNewDataImport from '../components/students/StudentNewDataImport';
import RegistrationTypeSelector from '../components/students/RegistrationTypeSelector';
import { useStudents, Student } from '../hooks/useStudents';
import { handleApiError, isAuthError } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import ErrorBoundary from '../components/ErrorBoundary';

const StudentRegistration = () => {
  const [showForm, setShowForm] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showNewImport, setShowNewImport] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [registrationType, setRegistrationType] = useState<'new' | 'rejoining' | 'continuing'>('new');
  const { handleError } = useAuth();

  const { 
    addStudent, 
    updateStudent, 
    refreshStudents,
    loading: studentsLoading
  } = useStudents();

  // Event listeners for import buttons in dropdown - use useCallback to prevent recreation on every render
  const handleImportNewStudents = useCallback(() => setShowNewImport(true), []);
  const handleImportContinuingStudents = useCallback(() => setShowImport(true), []);
  
  useEffect(() => {
    window.addEventListener('import-new-students', handleImportNewStudents);
    window.addEventListener('import-continuing-students', handleImportContinuingStudents);
    
    return () => {
      window.removeEventListener('import-new-students', handleImportNewStudents);
      window.removeEventListener('import-continuing-students', handleImportContinuingStudents);
    };
  }, [handleImportNewStudents, handleImportContinuingStudents]);

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
      
      if (isAuthError(error)) {
        handleError(error);
        return;
      }
      
      handleApiError(error);
    }
  };

  const handleSearchSelect = (student: Student) => {
    setSelectedStudent(student);
    setRegistrationType('rejoining');
    setShowForm(true);
    setShowSearch(false);
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

  // Prevent rendering multiple modals simultaneously
  const isModalOpen = showForm || showSearch || showDetails || showImport || showNewImport;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1>Student Registration</h1>
        {!showForm && (
          <div className="flex gap-2">
            <button
              className="btn btn-outline btn-md"
              onClick={() => setShowSearch(true)}
              disabled={isModalOpen && !showSearch}
            >
              <Search className="h-4 w-4 mr-2" />
              Search Previous Students
            </button>
          </div>
        )}
      </div>

      <ErrorBoundary onError={(error) => {
        console.error('Student Registration error:', error);
        handleApiError(error, refreshStudents);
        return true;
      }}>
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
      </ErrorBoundary>

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

      {showNewImport && (
        <StudentNewDataImport
          onClose={() => setShowNewImport(false)}
          onImportComplete={handleImportComplete}
        />
      )}
    </div>
  );
};

export default StudentRegistration;