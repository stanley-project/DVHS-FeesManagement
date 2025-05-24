import React from 'react';
import { useForm } from 'react-hook-form';

// Class options array
export const classOptions = [
  { value: 'nursery', label: 'Nursery' },
  { value: 'lkg', label: 'LKG' },
  { value: 'ukg', label: 'UKG' },
  ...Array.from({ length: 10 }, (_, i) => ({
    value: (i + 1).toString(),
    label: `Class ${i + 1}`
  }))
];

interface StudentFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  initialData?: any;
  registrationType: 'new' | 'rejoining' | 'continuing';
}

const StudentForm: React.FC<StudentFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  registrationType
}) => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: initialData || {}
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Student Name
          </label>
          <input
            type="text"
            {...register('student_name', { required: 'Student name is required' })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
          {errors.student_name && (
            <p className="mt-1 text-sm text-red-600">
              {errors.student_name.message as string}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Class
          </label>
          <select
            {...register('class', { required: 'Class is required' })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="">Select Class</option>
            {classOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.class && (
            <p className="mt-1 text-sm text-red-600">
              {errors.class.message as string}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-outline"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
        >
          {initialData ? 'Update' : 'Register'} Student
        </button>
      </div>
    </form>
  );
};

export default StudentForm;