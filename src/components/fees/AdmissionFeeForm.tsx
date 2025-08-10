import { useForm } from 'react-hook-form';
import { AdmissionFeeSetting } from '../../types/fees';

interface AdmissionFeeFormProps {
  academicYear: string;
  onSubmit: (data: Partial<AdmissionFeeSetting>) => void;
  onCancel: () => void;
  onCopyFromPrevious: () => Promise<AdmissionFeeSetting | null>;
  loading?: boolean;
  error?: string;
}

const AdmissionFeeForm = ({
  academicYear,
  onSubmit,
  onCancel,
  onCopyFromPrevious,
  loading,
  error
}: AdmissionFeeFormProps) => {
  const { register, handleSubmit, setValue } = useForm<Partial<AdmissionFeeSetting>>();

  const handleCopyPrevious = async () => {
    const data = await onCopyFromPrevious();
    if (data) {
      setValue('amount', data.amount);
      setValue('effective_from', data.effective_from);
      setValue('effective_to', data.effective_to);
    }
  };

  const onFormSubmit = (formData: Partial<AdmissionFeeSetting>) => {
    onSubmit({
      ...formData,
      is_active: true
    });
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)}>
      <div className="space-y-4">
        <div>
          <label htmlFor="amount">Admission Fee Amount</label>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register('amount', { required: true })}
            className="input w-full"
          />
        </div>
        <div>
          <label htmlFor="effective_from">Effective From</label>
          <input
            type="date"
            {...register('effective_from', { required: true })}
            className="input w-full"
          />
        </div>
        <div>
          <label htmlFor="effective_to">Effective To</label>
          <input
            type="date"
            {...register('effective_to', { required: true })}
            className="input w-full"
          />
        </div>
        
        {error && <div className="text-error">{error}</div>}
        
        <div className="flex justify-between">
          <button
            type="button"
            onClick={handleCopyPrevious}
            className="btn btn-outline"
            disabled={loading}
          >
            Copy from Previous Year
          </button>
          <div className="space-x-2">
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-outline"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default AdmissionFeeForm;