import { useState } from 'react';
import { AlertCircle } from 'lucide-react';

interface StudentFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  initialData?: any;
}

const StudentForm = ({ onSubmit, onCancel, initialData }: StudentFormProps) => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formData, setFormData] = useState(initialData || {
    admissionNumber: '',
    studentName: '',
    gender: '',
    dateOfBirth: '',
    class: '',
    section: '',
    admissionDate: new Date().toISOString().split('T')[0],
    status: 'active',
    address: '',
    phoneNumber: '',
    studentAadhar: '',
    fatherName: '',
    motherName: '',
    fatherAadhar: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmation(true);
  };

  const handleConfirm = () => {
    onSubmit(formData);
    setShowConfirmation(false);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="admissionNumber" className="block text-sm font-medium">
                Admission Number
              </label>
              <input
                id="admissionNumber"
                type="text"
                className="input"
                value={formData.admissionNumber}
                onChange={(e) => setFormData({ ...formData, admissionNumber: e.target.value })}
                placeholder="Auto-generated"
                readOnly
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="studentName" className="block text-sm font-medium">
                Student Name *
              </label>
              <input
                id="studentName"
                type="text"
                className="input"
                value={formData.studentName}
                onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="gender" className="block text-sm font-medium">
                Gender *
              </label>
              <select
                id="gender"
                className="input"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                required
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="dateOfBirth" className="block text-sm font-medium">
                Date of Birth *
              </label>
              <input
                id="dateOfBirth"
                type="date"
                className="input"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="class" className="block text-sm font-medium">
                Class *
              </label>
              <select
                id="class"
                className="input"
                value={formData.class}
                onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                required
              >
                <option value="">Select class</option>
                {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'].map(
                  (cls) => (
                    <option key={cls} value={cls}>Class {cls}</option>
                  )
                )}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="section" className="block text-sm font-medium">
                Section *
              </label>
              <select
                id="section"
                className="input"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                required
              >
                <option value="">Select section</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="admissionDate" className="block text-sm font-medium">
                Admission Date *
              </label>
              <input
                id="admissionDate"
                type="date"
                className="input"
                value={formData.admissionDate}
                onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="status" className="block text-sm font-medium">
                Status
              </label>
              <select
                id="status"
                className="input"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <label htmlFor="address" className="block text-sm font-medium">
                Address *
              </label>
              <textarea
                id="address"
                rows={3}
                className="input"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="phoneNumber" className="block text-sm font-medium">
                Phone Number *
              </label>
              <div className="flex rounded-md shadow-sm">
                <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-muted-foreground text-sm">
                  +91
                </span>
                <input
                  id="phoneNumber"
                  type="tel"
                  className="input rounded-l-none"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  pattern="[0-9]{10}"
                  maxLength={10}
                  placeholder="10-digit phone number"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="studentAadhar" className="block text-sm font-medium">
                Student Aadhar Number
              </label>
              <input
                id="studentAadhar"
                type="text"
                className="input"
                value={formData.studentAadhar}
                onChange={(e) => setFormData({ ...formData, studentAadhar: e.target.value })}
                pattern="[0-9]{12}"
                maxLength={12}
                placeholder="12-digit Aadhar number"
              />
            </div>
          </div>
        </div>

        {/* Parent Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Parent Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="fatherName" className="block text-sm font-medium">
                Father's Name *
              </label>
              <input
                id="fatherName"
                type="text"
                className="input"
                value={formData.fatherName}
                onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="motherName" className="block text-sm font-medium">
                Mother's Name *
              </label>
              <input
                id="motherName"
                type="text"
                className="input"
                value={formData.motherName}
                onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="fatherAadhar" className="block text-sm font-medium">
                Father's Aadhar Number
              </label>
              <input
                id="fatherAadhar"
                type="text"
                className="input"
                value={formData.fatherAadhar}
                onChange={(e) => setFormData({ ...formData, fatherAadhar: e.target.value })}
                pattern="[0-9]{12}"
                maxLength={12}
                placeholder="12-digit Aadhar number"
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t">
          <button
            type="button"
            className="btn btn-outline btn-md"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary btn-md"
          >
            {initialData ? 'Update Student' : 'Register Student'}
          </button>
        </div>
      </form>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-6 w-6 text-warning" />
              <h3 className="text-lg font-semibold">Confirm Submission</h3>
            </div>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to {initialData ? 'update' : 'register'} this student? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setShowConfirmation(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleConfirm}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentForm;