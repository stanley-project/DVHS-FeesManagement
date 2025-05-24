import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

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
    village_id: '', // Required field
    has_school_bus: false,
    registration_type: registrationType,
    rejoining_reason: '',
    previous_admission_number: '',
  });

  const [feePreview, setFeePreview] = useState({
    admissionFee: 0,
    monthlySchoolFee: 0,
    monthlyBusFee: 0,
    totalOneTime: 0,
    totalMonthly: 0,
    totalAnnual: 0,
    loading: true,
    error: null as string | null
  });

  // Class options including pre-primary classes
  const classOptions = [
    { value: 'nursery', label: 'Nursery' },
    { value: 'lkg', label: 'LKG' },
    { value: 'ukg', label: 'UKG' },
    ...Array.from({ length: 10 }, (_, i) => ({
      value: (i + 1).toString(),
      label: `Class ${i + 1}`
    }))
  ];

  // Mock villages data - in real app, fetch from API
  const villages = [
    { id: 'v1', name: 'Ramapuram', distance: 5.2 },
    { id: 'v2', name: 'Kondapur', distance: 3.8 },
    { id: 'v3', name: 'Gachibowli', distance: 7.5 },
  ];

  useEffect(() => {
    calculateFees();
  }, [formData.class, formData.village_id, formData.has_school_bus]);

  const calculateFees = async () => {
    if (!formData.class) return;

    try {
      setFeePreview(prev => ({ ...prev, loading: true, error: null }));

      // Get current academic year
      const { data: academicYear, error: yearError } = await supabase
        .from('academic_years')
        .select('id')
        .eq('is_current', true)
        .single();

      if (yearError) throw new Error('No active academic year found');

      // Get admission fee if new registration
      let admissionFee = 0;
      if (registrationType === 'new') {
        const { data: admissionFeeData, error: admissionError } = await supabase
          .from('admission_fee_settings')
          .select('amount')
          .eq('academic_year_id', academicYear.id)
          .eq('is_active', true)
          .single();

        if (!admissionError && admissionFeeData) {
          admissionFee = admissionFeeData.amount;
        }
      }

      // Get school fees
      const { data: schoolFees, error: schoolError } = await supabase
        .from('fee_structure')
        .select(`
          amount,
          is_recurring_monthly,
          fee_type:fee_types(category)
        `)
        .eq('academic_year_id', academicYear.id)
        .eq('class_id', formData.class);

      if (schoolError) throw schoolError;

      const monthlySchoolFee = schoolFees
        ?.filter(fee => fee.is_recurring_monthly && fee.fee_type.category === 'school')
        .reduce((sum, fee) => sum + fee.amount, 0) || 0;

      // Get bus fee if applicable
      let monthlyBusFee = 0;
      if (formData.has_school_bus && formData.village_id) {
        const { data: busFee, error: busError } = await supabase
          .from('bus_fee_structure')
          .select('fee_amount')
          .eq('village_id', formData.village_id)
          .eq('academic_year_id', academicYear.id)
          .eq('is_active', true)
          .single();

        if (!busError && busFee) {
          monthlyBusFee = busFee.fee_amount;
        }
      }

      // Calculate totals
      const totalMonthly = monthlySchoolFee + monthlyBusFee;
      const totalAnnual = (totalMonthly * 12) + admissionFee;

      setFeePreview({
        admissionFee,
        monthlySchoolFee,
        monthlyBusFee,
        totalOneTime: admissionFee,
        totalMonthly,
        totalAnnual,
        loading: false,
        error: null
      });

    } catch (error: any) {
      setFeePreview(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate village selection
    if (!formData.village_id) {
      alert('Please select a village');
      return;
    }

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
                {classOptions.map((cls) => (
                  <option key={cls.value} value={cls.value}>{cls.label}</option>
                ))}
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
          </div>
        </div>

        {/* Transportation Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Transportation Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="village" className="block text-sm font-medium">
                Village * <span className="text-error">Required</span>
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
                    {village.name} ({village.distance} km)
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Distance from school will affect bus fee calculation
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Bus Service *
              </label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="hasSchoolBus"
                  className="h-4 w-4 rounded border-input"
                  checked={formData.has_school_bus}
                  onChange={(e) => setFormData({ ...formData, has_school_bus: e.target.checked })}
                />
                <label htmlFor="hasSchoolBus" className="text-sm">
                  Opt for School Bus Service
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                Monthly bus fee will be calculated based on village distance
              </p>
            </div>
          </div>
        </div>

        {/* Fee Preview */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Fee Preview</h3>
          {feePreview.loading ? (
            <div className="text-center py-4 text-muted-foreground">
              Calculating fees...
            </div>
          ) : feePreview.error ? (
            <div className="bg-error/10 text-error p-4 rounded-md">
              {feePreview.error}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {registrationType === 'new' && feePreview.admissionFee > 0 && (
                <div className="bg-muted p-4 rounded-md">
                  <p className="text-sm text-muted-foreground">One-time Admission Fee</p>
                  <p className="text-2xl font-bold">₹{feePreview.admissionFee.toLocaleString('en-IN')}</p>
                </div>
              )}
              
              <div className="bg-muted p-4 rounded-md">
                <p className="text-sm text-muted-foreground">Monthly School Fee</p>
                <p className="text-2xl font-bold">₹{feePreview.monthlySchoolFee.toLocaleString('en-IN')}</p>
              </div>

              {formData.has_school_bus && (
                <div className="bg-muted p-4 rounded-md">
                  <p className="text-sm text-muted-foreground">Monthly Bus Fee</p>
                  <p className="text-2xl font-bold">₹{feePreview.monthlyBusFee.toLocaleString('en-IN')}</p>
                </div>
              )}

              <div className="bg-muted p-4 rounded-md">
                <p className="text-sm text-muted-foreground">Total Monthly Fee</p>
                <p className="text-2xl font-bold">₹{feePreview.totalMonthly.toLocaleString('en-IN')}</p>
              </div>

              <div className="bg-muted p-4 rounded-md md:col-span-2">
                <p className="text-sm text-muted-foreground">Total Annual Fee (including one-time fees)</p>
                <p className="text-2xl font-bold">₹{feePreview.totalAnnual.toLocaleString('en-IN')}</p>
              </div>
            </div>
          )}
        </div>

        {/* Rejoining Information (if applicable) */}
        {registrationType === 'rejoining' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Rejoining Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="previousAdmissionNumber" className="block text-sm font-medium">
                  Previous Admission Number *
                </label>
                <input
                  id="previousAdmissionNumber"
                  type="text"
                  className="input"
                  value={formData.previous_admission_number}
                  onChange={(e) => setFormData({ ...formData, previous_admission_number: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label htmlFor="rejoiningReason" className="block text-sm font-medium">
                  Reason for Rejoining *
                </label>
                <textarea
                  id="rejoiningReason"
                  className="input"
                  value={formData.rejoining_reason}
                  onChange={(e) => setFormData({ ...formData, rejoining_reason: e.target.value })}
                  rows={3}
                  required
                />
              </div>
            </div>
          </div>
        )}

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
              Are you sure you want to {initialData ? 'update' : 'register'} this student?
              {registrationType === 'new' && feePreview.admissionFee > 0 && (
                <><br />One-time admission fee of ₹{feePreview.admissionFee.toLocaleString('en-IN')} will be charged.</>
              )}
              {formData.has_school_bus && (
                <><br />Monthly bus fee of ₹{feePreview.monthlyBusFee.toLocaleString('en-IN')} will be charged.</>
              )}
              <><br />Total monthly fee will be ₹{feePreview.totalMonthly.toLocaleString('en-IN')}.</>
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