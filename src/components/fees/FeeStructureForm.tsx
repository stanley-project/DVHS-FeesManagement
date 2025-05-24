import { useState } from 'react';
import { AlertCircle, Copy } from 'lucide-react';

interface FeeStructureFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  onCopyFromPrevious: () => void;
  initialData?: any;
}

const FeeStructureForm = ({ onSubmit, onCancel, onCopyFromPrevious, initialData }: FeeStructureFormProps) => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formData, setFormData] = useState(initialData || {
    academicYearId: '',
    classId: '',
    feeTypes: [
      { id: '1', name: 'Tuition Fee', amount: '', dueDate: '', category: 'school', isMonthly: true },
      { id: '2', name: 'Development Fee', amount: '', dueDate: '', category: 'school', isMonthly: false },
      { id: '3', name: 'Computer Lab Fee', amount: '', dueDate: '', category: 'school', isMonthly: false },
      { id: '4', name: 'Library Fee', amount: '', dueDate: '', category: 'school', isMonthly: false },
      { id: '5', name: 'Sports Fee', amount: '', dueDate: '', category: 'school', isMonthly: false },
    ],
    applicableToNewStudentsOnly: false,
    isRecurringMonthly: false,
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmation(true);
  };

  const handleConfirm = () => {
    onSubmit(formData);
    setShowConfirmation(false);
  };

  const calculateMonthlyTotal = () => {
    return formData.feeTypes.reduce((sum: number, fee: any) => {
      const amount = Number(fee.amount) || 0;
      return sum + (fee.isMonthly ? amount : amount / 12);
    }, 0);
  };

  const calculateTermTotal = () => {
    return formData.feeTypes.reduce((sum: number, fee: any) => {
      const amount = Number(fee.amount) || 0;
      return sum + (fee.isMonthly ? amount * 4 : amount / 3);
    }, 0);
  };

  const calculateAnnualTotal = () => {
    return formData.feeTypes.reduce((sum: number, fee: any) => {
      const amount = Number(fee.amount) || 0;
      return sum + (fee.isMonthly ? amount * 12 : amount);
    }, 0);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="academicYear" className="block text-sm font-medium">
                Academic Year *
              </label>
              <select
                id="academicYear"
                className="input"
                value={formData.academicYearId}
                onChange={(e) => setFormData({ ...formData, academicYearId: e.target.value })}
                required
              >
                <option value="">Select Academic Year</option>
                <option value="2025">2025-2026</option>
                <option value="2024">2024-2025</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="class" className="block text-sm font-medium">
                Class *
              </label>
              <select
                id="class"
                className="input"
                value={formData.classId}
                onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                required
              >
                <option value="">Select Class</option>
                {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'].map(
                  (cls) => (
                    <option key={cls} value={cls}>Class {cls}</option>
                  )
                )}
              </select>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Fee Components</h3>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={onCopyFromPrevious}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy from Previous Year
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fee Type</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Frequency</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Amount (₹)</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.feeTypes.map((feeType: any, index: number) => (
                    <tr key={feeType.id} className="border-b">
                      <td className="px-4 py-3">{feeType.name}</td>
                      <td className="px-4 py-3">
                        <select
                          className="input"
                          value={feeType.category}
                          onChange={(e) => {
                            const newFeeTypes = [...formData.feeTypes];
                            newFeeTypes[index].category = e.target.value;
                            setFormData({ ...formData, feeTypes: newFeeTypes });
                          }}
                        >
                          <option value="school">School</option>
                          <option value="admission">Admission</option>
                          <option value="bus">Bus</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          className="input"
                          value={feeType.isMonthly ? 'monthly' : 'term'}
                          onChange={(e) => {
                            const newFeeTypes = [...formData.feeTypes];
                            newFeeTypes[index].isMonthly = e.target.value === 'monthly';
                            setFormData({ ...formData, feeTypes: newFeeTypes });
                          }}
                        >
                          <option value="monthly">Monthly</option>
                          <option value="term">Term</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          className="input"
                          value={feeType.amount}
                          onChange={(e) => {
                            const newFeeTypes = [...formData.feeTypes];
                            newFeeTypes[index].amount = e.target.value;
                            setFormData({ ...formData, feeTypes: newFeeTypes });
                          }}
                          required
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="date"
                          className="input"
                          value={feeType.dueDate}
                          onChange={(e) => {
                            const newFeeTypes = [...formData.feeTypes];
                            newFeeTypes[index].dueDate = e.target.value;
                            setFormData({ ...formData, feeTypes: newFeeTypes });
                          }}
                          required
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/50">
                    <td colSpan={3} className="px-4 py-3 font-medium">Monthly Total</td>
                    <td className="px-4 py-3 text-right font-medium">₹{calculateMonthlyTotal().toLocaleString('en-IN')}</td>
                    <td></td>
                  </tr>
                  <tr className="bg-muted/50">
                    <td colSpan={3} className="px-4 py-3 font-medium">Term Total</td>
                    <td className="px-4 py-3 text-right font-medium">₹{calculateTermTotal().toLocaleString('en-IN')}</td>
                    <td></td>
                  </tr>
                  <tr className="bg-muted/50">
                    <td colSpan={3} className="px-4 py-3 font-medium">Annual Total</td>
                    <td className="px-4 py-3 text-right font-medium">₹{calculateAnnualTotal().toLocaleString('en-IN')}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="space-y-4 mt-6">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="applicableToNewStudents"
                className="h-4 w-4 rounded border-input"
                checked={formData.applicableToNewStudentsOnly}
                onChange={(e) => setFormData({ ...formData, applicableToNewStudentsOnly: e.target.checked })}
              />
              <label htmlFor="applicableToNewStudents" className="text-sm font-medium">
                Applicable to New Students Only
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isRecurringMonthly"
                className="h-4 w-4 rounded border-input"
                checked={formData.isRecurringMonthly}
                onChange={(e) => setFormData({ ...formData, isRecurringMonthly: e.target.checked })}
              />
              <label htmlFor="isRecurringMonthly" className="text-sm font-medium">
                Enable Monthly Recurring Payments
              </label>
            </div>

            <div className="space-y-2">
              <label htmlFor="notes" className="block text-sm font-medium">
                Notes
              </label>
              <textarea
                id="notes"
                className="input"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Add any notes about this fee structure..."
              />
            </div>
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
            {initialData ? 'Update Fee Structure' : 'Create Fee Structure'}
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
              Are you sure you want to {initialData ? 'update' : 'create'} this fee structure? This action cannot be undone.
              {formData.applicableToNewStudentsOnly && ' This fee structure will only apply to new students.'}
              {formData.isRecurringMonthly && ' Monthly recurring payments will be enabled.'}
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

export default FeeStructureForm;