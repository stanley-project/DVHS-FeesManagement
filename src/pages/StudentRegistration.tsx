import { useState } from 'react';
import { Plus, Upload } from 'lucide-react';
import StudentTable from '../components/students/StudentTable';
import StudentForm from '../components/students/StudentForm';

const StudentRegistration = () => {
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (data: any) => {
    console.log('Form submitted:', data);
    setShowForm(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1>Student Registration</h1>
        <div className="flex gap-2">
          <button
            className="btn btn-outline btn-md inline-flex items-center"
            title="Import Students"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import
          </button>
          
          <button
            className="btn btn-primary btn-md inline-flex items-center"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Student
          </button>
        </div>
      </div>

      {showForm ? (
        <div className="bg-card rounded-lg shadow p-6">
          <StudentForm
            onSubmit={handleSubmit}
            onCancel={() => setShowForm(false)}
          />
        </div>
      ) : (
        <StudentTable />
      )}
    </div>
  );
};

export default StudentRegistration;