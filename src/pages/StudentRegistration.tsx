import { useState } from 'react';
import { Plus, Upload, Search } from 'lucide-react';
import StudentTable from '../components/students/StudentTable';
import StudentForm from '../components/students/StudentForm';
import StudentSearch from '../components/students/StudentSearch';
import RegistrationTypeSelector from '../components/students/RegistrationTypeSelector';

const StudentRegistration = () => {
  const [showForm, setShowForm] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  const [registrationType, setRegistrationType] = useState<'new' | 'rejoining' | 'continuing'>('new');

  const handleSubmit = (data: any) => {
    console.log('Form submitted:', data);
    setShowForm(false);
    setFormData(null);
  };

  const handleSearchSelect = (student: any) => {
    setFormData(student);
    setShowForm(true);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1>Student Registration</h1>
        <div className="flex gap-2">
          <button
            className="btn btn-outline btn-md inline-flex items-center"
            onClick={() => setShowSearch(true)}
          >
            <Search className="h-4 w-4 mr-2" />
            Search Previous Students
          </button>
          
          <button
            className="btn btn-outline btn-md inline-flex items-center"
            title="Import Students"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import
          </button>
          
          <button
            className="btn btn-primary btn-md inline-flex items-center"
            onClick={() => {
              setFormData(null);
              setShowForm(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Student
          </button>
        </div>
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
              onCancel={() => {
                setShowForm(false);
                setFormData(null);
              }}
              initialData={formData}
              registrationType={registrationType}
            />
          </div>
        </div>
      ) : (
        <StudentTable />
      )}

      {showSearch && (
        <StudentSearch
          onSelect={handleSearchSelect}
          onClose={() => setShowSearch(false)}
        />
      )}
    </div>
  );
};

export default StudentRegistration;