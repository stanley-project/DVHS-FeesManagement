import { useState } from 'react';
import { AlertCircle } from 'lucide-react';

interface AcademicYearFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  initialData?: any;
}

const AcademicYearForm = ({ onSubmit, onCancel, initialData }: AcademicYearFormProps) => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formData, setFormData] = useState(initialData || {
    yearName: '',
    startDate: '',
    endDate: '',
    isCurrent: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate year format (YYYY-YYYY)
    const yearPattern = /^(\d{4})-(\d{4})$/;
    if (!yearPattern.test(formData.yearName)) {
      alert('Academic year must be in format YYYY-YYYY (e.g., 2025-2026)');
      return;
    }

    // Extract years
    const [startYear, endYear] = formData.yearName.split('-').map(Number);
    if (endYear !== startYear + 1) {
      alert('End year must be the next year after start year');
      return;
    }

    // Set fixed dates: June 1st to April 30th
    const fixedStartDate = `${startYear}-06-01`;
    const fixedEndDate = `${endYear}-04-30`;

    // Update form data with fixed dates
    setFormData(prev => ({
      ...prev,
      startDate: fixedStartDate,
      endDate: fixedEndDate
    }));

    setShowConfirmation(true);
  };

  const handleConfirm = () => {
    onSubmit(formData);
    setShowConfirmation(false);
  };

  const handleYearChange = (yearName: string) => {
    if (yearName.length === 9 && yearName.includes('-')) {
      const [startYear] = yearName.split('-').map(Number);
      if (!isNaN(startYear)) {
        const fixedStartDate = `${startYear}-06-01`;
        const fixedEndDate = `${startYear + 1}-04-30`;
        setFormData(prev => ({
          ...prev,
          yearName,
          startDate: fixedStartDate,
          endDate: fixedEndDate
        }));
        return;
      }
    }
    setFormData(prev => ({ ...prev, yearName }));
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="yearName" className="block text-sm font-medium">
              Academic Year Name *
            </label>
            <input
              id="yearName"
              type="text"
              className="input"
              value={formData.yearName}
              onChange={(e) => handleYearChange(e.target.value)}
              placeholder="e.g., 2025-2026"
              required
            />
            <p className="text-xs text-muted-foreground">
              Academic year runs from June 1st to April 30th
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="startDate" className="block text-sm font-medium">
                Start Date
              </label>
              <input
                id="startDate"
                type="date"
                className="input bg-muted"
                value={formData.startDate}
                disabled
                title="Start date is fixed to June 1st"
              />
              <p className="text-xs text-muted-foreground">Fixed to June 1st</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="endDate" className="block text-sm font-medium">
                End Date
              </label>
              <input
                id="endDate"
                type="date"
                className="input bg-muted"
                value={formData.endDate}
                disabled
                title="End date is fixed to April 30th"
              />
              <p className="text-xs text-muted-foreground">Fixed to April 30th</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="isCurrent"
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={formData.isCurrent}
              onChange={(e) => setFormData({ ...formData, isCurrent: e.target.checked })}
            />
            <label htmlFor="isCurrent" className="text-sm font-medium">
              Set as Current Academic Year
            </label>
          </div>
        </div>

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
            {initialData ? 'Update Academic Year' : 'Create Academic Year'}
          </button>
        </div>
      </form>

      {showConfirmation && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-6 w-6 text-warning" />
              <h3 className="text-lg font-semibold">Confirm Submission</h3>
            </div>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to {initialData ? 'update' : 'create'} this academic year? 
              {formData.isCurrent && ' This will set it as the current academic year.'}
              <br /><br />
              Academic year will run from June 1st to April 30th.
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

export default AcademicYearForm;