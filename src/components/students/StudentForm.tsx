import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { Loader2, Users } from 'lucide-react';
import { Student } from '../../hooks/useStudents';
import { useClasses } from '../../hooks/useClasses';
import { useVillages } from '../../hooks/useVillages';
import { supabase } from '../../lib/supabase';

interface StudentFormProps {
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  initialData?: Student | null;
  registrationType: 'new' | 'rejoining' | 'continuing';
}

interface FormData {
  admission_number: string;
  student_name: string;
  gender: string;
  date_of_birth: string;
  class_id: string;
  admission_date: string;
  address: string;
  phone_number: string;
  father_name: string;
  mother_name: string;
  student_aadhar?: string;
  father_aadhar?: string;
  village_id: string;
  has_school_bus: boolean;
  registration_type: 'new' | 'continuing';
  previous_admission_number?: string;
  rejoining_reason?: string;
}

const StudentForm: React.FC<StudentFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  registrationType
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);
  const { classes, loading: classesLoading } = useClasses();
  const { villages, loading: villagesLoading } = useVillages();

  const { 
    register, 
    handleSubmit, 
    formState: { errors }, 
    setValue,
    watch,
    reset
  } = useForm<FormData>({
    defaultValues: {
      registration_type: registrationType === 'new' ? 'new' : 'continuing',
      has_school_bus: false,
      admission_date: new Date().toISOString().split('T')[0],
      gender: 'male',
      village_id: '' // Ensure village_id has a default value
    }
  });

  const watchClassId = watch('class_id');
  const watchVillageId = watch('village_id');

  // Set form values when initialData changes
  useEffect(() => {
    if (initialData) {
      reset({
        admission_number: initialData.admission_number,
        student_name: initialData.student_name,
        gender: initialData.gender,
        date_of_birth: initialData.date_of_birth,
        class_id: initialData.class_id,
        admission_date: initialData.admission_date,
        address: initialData.address,
        phone_number: initialData.phone_number,
        father_name: initialData.father_name,
        mother_name: initialData.mother_name,
        student_aadhar: initialData.student_aadhar || '',
        father_aadhar: initialData.father_aadhar || '',
        village_id: initialData.village_id || '',
        has_school_bus: initialData.has_school_bus,
        registration_type: initialData.registration_type,
        previous_admission_number: initialData.previous_admission_number || '',
        rejoining_reason: initialData.rejoining_reason || ''
      });
    }
  }, [initialData, reset]);

  // Fetch student count when class is selected
  useEffect(() => {
    const fetchStudentCount = async () => {
      if (!watchClassId) {
        setStudentCount(null);
        return;
      }

      setLoadingCount(true);
      try {
        const { count, error } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', watchClassId)
          .eq('status', 'active');

        if (error) throw error;
        setStudentCount(count || 0);
      } catch (error) {
        console.error('Error fetching student count:', error);
        setStudentCount(0);
      } finally {
        setLoadingCount(false);
      }
    };

    fetchStudentCount();
  }, [watchClassId]);

  // Auto-enable bus service when village is selected
  useEffect(() => {
    if (watchVillageId) {
      setValue('has_school_bus', true);
    }
  }, [watchVillageId, setValue]);

  const onFormSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);
      
      // Validate required fields
      if (!data.student_name.trim()) {
        throw new Error('Student name is required');
      }
      
      if (!data.admission_number.trim()) {
        throw new Error('Admission number is required');
      }

      if (!data.class_id) {
        throw new Error('Class selection is required');
      }

      if (!data.village_id) {
        throw new Error('Village selection is required');
      }

      // Validate phone number format
      if (!/^\d{10}$/.test(data.phone_number)) {
        throw new Error('Phone number must be exactly 10 digits');
      }

      // Validate Aadhar numbers if provided
      if (data.student_aadhar && !/^\d{12}$/.test(data.student_aadhar)) {
        throw new Error('Student Aadhar must be exactly 12 digits');
      }

      if (data.father_aadhar && !/^\d{12}$/.test(data.father_aadhar)) {
        throw new Error('Father Aadhar must be exactly 12 digits');
      }

      // Prepare submission data - remove section field completely
      const submissionData = {
        ...data,
        status: 'active' as const,
        section: 'A', // Default section since it's still required in the database
        student_aadhar: data.student_aadhar || null,
        father_aadhar: data.father_aadhar || null,
        village_id: data.village_id,
        previous_admission_number: data.previous_admission_number || null,
        rejoining_reason: data.rejoining_reason || null,
        last_registration_date: new Date().toISOString().split('T')[0],
        last_registration_type: data.registration_type
      };

      await onSubmit(submissionData);
      toast.success(initialData ? 'Student updated successfully' : 'Student registered successfully');
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save student');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (classesLoading || villagesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading form data...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Basic Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="admission_number" className="block text-sm font-medium">
              Admission Number *
            </label>
            <input
              id="admission_number"
              type="text"
              className="input"
              {...register('admission_number', { required: 'Admission number is required' })}
              disabled={!!initialData} // Don't allow editing admission number for existing students
            />
            {errors.admission_number && (
              <p className="text-sm text-error">{errors.admission_number.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="student_name" className="block text-sm font-medium">
              Student Name *
            </label>
            <input
              id="student_name"
              type="text"
              className="input"
              {...register('student_name', { required: 'Student name is required' })}
            />
            {errors.student_name && (
              <p className="text-sm text-error">{errors.student_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="gender" className="block text-sm font-medium">
              Gender *
            </label>
            <select
              id="gender"
              className="input"
              {...register('gender', { required: 'Gender is required' })}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            {errors.gender && (
              <p className="text-sm text-error">{errors.gender.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="date_of_birth" className="block text-sm font-medium">
              Date of Birth *
            </label>
            <input
              id="date_of_birth"
              type="date"
              className="input"
              {...register('date_of_birth', { required: 'Date of birth is required' })}
            />
            {errors.date_of_birth && (
              <p className="text-sm text-error">{errors.date_of_birth.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Academic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Academic Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="class_id" className="block text-sm font-medium">
              Class *
            </label>
            <select
              id="class_id"
              className="input"
              {...register('class_id', { required: 'Class is required' })}
            >
              <option value="">Select Class</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
            {errors.class_id && (
              <p className="text-sm text-error">{errors.class_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="student_count" className="block text-sm font-medium">
              Current Students in Class
            </label>
            <div className="relative">
              <input
                id="student_count"
                type="text"
                className="input pr-10"
                value={
                  loadingCount 
                    ? 'Loading...' 
                    : studentCount !== null 
                      ? `${studentCount} students` 
                      : 'Select a class'
                }
                readOnly
                disabled
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                {loadingCount ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <Users className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="admission_date" className="block text-sm font-medium">
              Admission Date *
            </label>
            <input
              id="admission_date"
              type="date"
              className="input"
              {...register('admission_date', { required: 'Admission date is required' })}
            />
            {errors.admission_date && (
              <p className="text-sm text-error">{errors.admission_date.message}</p>
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
              {...register('address', { required: 'Address is required' })}
            />
            {errors.address && (
              <p className="text-sm text-error">{errors.address.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="phone_number" className="block text-sm font-medium">
              Phone Number *
            </label>
            <input
              id="phone_number"
              type="tel"
              className="input"
              {...register('phone_number', { 
                required: 'Phone number is required',
                pattern: {
                  value: /^\d{10}$/,
                  message: 'Phone number must be exactly 10 digits'
                }
              })}
              maxLength={10}
            />
            {errors.phone_number && (
              <p className="text-sm text-error">{errors.phone_number.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="village_id" className="block text-sm font-medium">
              Village *
            </label>
            <select
              id="village_id"
              className="input"
              {...register('village_id', { required: 'Village selection is required' })}
            >
              <option value="">Select Village</option>
              {villages.filter(v => v.is_active).map((village) => (
                <option key={village.id} value={village.id}>{village.name}</option>
              ))}
            </select>
            {errors.village_id && (
              <p className="text-sm text-error">{errors.village_id.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Parent Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Parent Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="father_name" className="block text-sm font-medium">
              Father's Name *
            </label>
            <input
              id="father_name"
              type="text"
              className="input"
              {...register('father_name', { required: "Father's name is required" })}
            />
            {errors.father_name && (
              <p className="text-sm text-error">{errors.father_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="mother_name" className="block text-sm font-medium">
              Mother's Name *
            </label>
            <input
              id="mother_name"
              type="text"
              className="input"
              {...register('mother_name', { required: "Mother's name is required" })}
            />
            {errors.mother_name && (
              <p className="text-sm text-error">{errors.mother_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="student_aadhar" className="block text-sm font-medium">
              Student Aadhar Number
            </label>
            <input
              id="student_aadhar"
              type="text"
              className="input"
              {...register('student_aadhar', {
                pattern: {
                  value: /^\d{12}$/,
                  message: 'Aadhar number must be exactly 12 digits'
                }
              })}
              maxLength={12}
            />
            {errors.student_aadhar && (
              <p className="text-sm text-error">{errors.student_aadhar.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="father_aadhar" className="block text-sm font-medium">
              Father's Aadhar Number
            </label>
            <input
              id="father_aadhar"
              type="text"
              className="input"
              {...register('father_aadhar', {
                pattern: {
                  value: /^\d{12}$/,
                  message: 'Aadhar number must be exactly 12 digits'
                }
              })}
              maxLength={12}
            />
            {errors.father_aadhar && (
              <p className="text-sm text-error">{errors.father_aadhar.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Transport Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Transport Information</h3>
        
        <div className="flex items-center gap-2">
          <input
            id="has_school_bus"
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            {...register('has_school_bus')}
          />
          <label htmlFor="has_school_bus" className="text-sm font-medium">
            Requires School Bus Service
          </label>
        </div>
      </div>

      {/* Registration Type Specific Fields */}
      {registrationType === 'rejoining' && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Rejoining Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="previous_admission_number" className="block text-sm font-medium">
                Previous Admission Number
              </label>
              <input
                id="previous_admission_number"
                type="text"
                className="input"
                {...register('previous_admission_number')}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label htmlFor="rejoining_reason" className="block text-sm font-medium">
                Reason for Rejoining
              </label>
              <textarea
                id="rejoining_reason"
                rows={3}
                className="input"
                {...register('rejoining_reason')}
              />
            </div>
          </div>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-6 border-t">
        <button
          type="button"
          className="btn btn-outline btn-md"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary btn-md"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {initialData ? 'Updating...' : 'Registering...'}
            </>
          ) : (
            initialData ? 'Update Student' : 'Register Student'
          )}
        </button>
      </div>
    </form>
  );
};

export default StudentForm;