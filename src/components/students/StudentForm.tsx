import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

interface StudentFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  initialData?: any;
  registrationType: 'new' | 'rejoining' | 'continuing';
}

const StudentForm = ({ onSubmit, onCancel, initialData, registrationType }: StudentFormProps) => {
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
    village_id: '',
    has_school_bus: false,
    registration_type: registrationType,
    rejoining_reason: '',
    previous_admission_number: '',
  });

  const [villages, setVillages] = useState([
    { id: '1', name: 'Ramapuram', distance_from_school: 5.2, bus_fee: 1500 },
    { id: '2', name: 'Kondapur', distance_from_school: 3.8, bus_fee: 1200 },
    { id: '3', name: 'Gachibowli', distance_from_school: 7.5, bus_fee: 2000 },
  ]);

  const [feeBreakdown, setFeeBreakdown] = useState({
    admissionFee: 0,
    monthlySchoolFee: 0,
    monthlyBusFee: 0,
    totalMonthlyFee: 0,
  });

  useEffect(() => {
    // Calculate fees based on selections
    const selectedVillage = villages.find(v => v.id === formData.village_id);
    const admissionFee = formData.registration_type === 'new' ? 5000 : 0;
    const monthlySchoolFee = 2500; // Example fixed amount
    const monthlyBusFee = formData.has_school_bus && selectedVillage ? selectedVillage.bus_fee : 0;

    setFeeBreakdown({
      admissionFee,
      monthlySchoolFee,
      monthlyBusFee,
      totalMonthlyFee: monthlySchoolFee + monthlyBusFee,
    });
  }, [formData.village_id, formData.has_school_bus, formData.registration_type]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmation(true);
  };

  const handleConfirm = () => {
    onSubmit(formData);
    setShowConfirmation(false);
  };

  const renderRegistrationSpecificFields = () => {
    if (registrationType === 'rejoining') {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="previousAdmissionNumber" className="block text-sm font-medium">
              Previous Admission Number
            </label>
            <input
              id="previousAdmissionNumber"
              type="text"
              className="input"
              value={formData.previous_admission_number}
              onChange={(e) => setFormData({ ...formData, previous_admission_number: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="rejoiningReason" className="block text-sm font-medium">
              Reason for Rejoining *
            </label>
            <textarea
              id="rejoiningReason"
              className="input"
              value={formData.rejoining_reason}
              onChange={(e) => setFormData({ ...formData, rejoining_reason: e.target.value })}
              required={registrationType === 'rejoining'}
              rows={3}
            />
          </div>
        </div>
      );
    }
    return null;
  };

  const renderFeePreview = () => {
    const selectedVillage = villages.find(v => v.id === formData.village_id);
    const admissionFee = registrationType === 'new' ? 5000 : 0;
    const monthlySchoolFee = 2500;
    const monthlyBusFee = formData.has_school_bus && selectedVillage ? selectedVillage.bus_fee : 0;

    return (
      <div className="bg-muted p-4 rounded-md">
        <h3 className="text-lg font-medium mb-4">Fee Preview</h3>
        <div className="space-y-2">
          {registrationType === 'new' && (
            <div className="flex justify-between">
              <span>One-time Admission Fee:</span>
              <span>₹{admissionFee.toLocaleString('en-IN')}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Monthly School Fee:</span>
            <span>₹{monthlySchoolFee.toLocaleString('en-IN')}</span>
          </div>
          {formData.has_school_bus && (
            <div className="flex justify-between">
              <span>Monthly Bus Fee:</span>
              <span>₹{monthlyBusFee.toLocaleString('en-IN')}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t font-medium">
            <span>Total Monthly Fee:</span>
            <span>₹{(monthlySchoolFee + monthlyBusFee).toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>
    );
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

        {/* Registration Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Registration Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderRegistrationSpecificFields()}

            <div className="space-y-2">
              <label htmlFor="village" className="block text-sm font-medium">
                Village *
              </label>
              <select
                id="village"
                className="input"
                value={formData.village_id}
                onChange={(e) => setFormData({ ...formData, village_id: e.target.value })}
                required
              >
                <option value="">Select village</option>
                {villages.map((village) => (
                  <option key={village.id} value={village.id}>
                    {village.name} ({village.distance_from_school} km)
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.has_school_bus}
                  onChange={(e) => setFormData({ ...formData, has_school_bus: e.target.checked })}
                  className="h-4 w-4 rounded border-input"
                />
                <span className="text-sm font-medium">Opt-in for School Bus Service</span>
              </label>
              {formData.has_school_bus && formData.village_id && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Monthly bus fee for {villages.find(v => v.id === formData.village_id)?.name}:
                  ₹{villages.find(v => v.id === formData.village_id)?.bus_fee}
                </p>
              )}
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

        {/* Fee Preview */}
        {renderFeePreview()}

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