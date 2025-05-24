import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface FeePaymentFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  studentId?: string;
}

const FeePaymentForm = ({ onSubmit, onCancel, studentId }: FeePaymentFormProps) => {
  const [feeTypes, setFeeTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    feeTypeId: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMode: 'cash',
    remarks: ''
  });

  useEffect(() => {
    fetchFeeTypes();
  }, []);

  const fetchFeeTypes = async () => {
    try {
      // Get current academic year
      const { data: currentYear } = await supabase
        .from('academic_years')
        .select('id')
        .eq('is_current', true)
        .single();

      if (!currentYear) {
        throw new Error('No current academic year found');
      }

      // Get fee types from fee structure
      const { data, error } = await supabase
        .from('fee_structure')
        .select(`
          id,
          amount,
          due_date,
          fee_type:fee_types(
            id,
            name,
            category,
            is_monthly
          )
        `)
        .eq('academic_year_id', currentYear.id);

      if (error) throw error;

      setFeeTypes(data || []);
    } catch (error) {
      console.error('Error fetching fee types:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFeeTypeChange = (feeTypeId: string) => {
    const selectedFee = feeTypes.find(fee => fee.id === feeTypeId);
    setFormData({
      ...formData,
      feeTypeId,
      amount: selectedFee ? selectedFee.amount.toString() : ''
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount)
    });
  };

  if (loading) {
    return <div>Loading fee types...</div>;
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="feeType" className="block text-sm font-medium">
            Fee Type *
          </label>
          <select
            id="feeType"
            className="input"
            value={formData.feeTypeId}
            onChange={(e) => handleFeeTypeChange(e.target.value)}
            required
          >
            <option value="">Select fee type</option>
            {feeTypes.map((fee) => (
              <option key={fee.id} value={fee.id}>
                {fee.fee_type.name} - ₹{fee.amount} 
                {fee.fee_type.is_monthly ? ' (Monthly)' : ''}
              </option>
            ))}
          </select>
        </div>
        
        <div className="space-y-2">
          <label htmlFor="amount" className="block text-sm font-medium">
            Amount *
          </label>
          <div className="flex rounded-md shadow-sm">
            <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-muted-foreground text-sm">
              ₹
            </span>
            <input
              id="amount"
              type="number"
              className="input rounded-l-none"
              placeholder="Enter amount"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <label htmlFor="paymentDate" className="block text-sm font-medium">
            Payment Date *
          </label>
          <input
            id="paymentDate"
            type="date"
            className="input"
            value={formData.paymentDate}
            onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
            required
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="paymentMode" className="block text-sm font-medium">
            Payment Mode *
          </label>
          <select
            id="paymentMode"
            className="input"
            value={formData.paymentMode}
            onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
            required
          >
            <option value="cash">Cash</option>
            <option value="online">Online Transfer</option>
            <option value="upi">UPI</option>
          </select>
        </div>
        
        <div className="space-y-2 md:col-span-2">
          <label htmlFor="remarks" className="block text-sm font-medium">
            Remarks
          </label>
          <textarea
            id="remarks"
            rows={3}
            className="input"
            placeholder="Any additional information about this payment"
            value={formData.remarks}
            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
          />
        </div>
      </div>
      
      <div className="border-t pt-4 flex flex-col sm:flex-row justify-end gap-3">
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
          Collect Fee & Generate Receipt
        </button>
      </div>
    </form>
  );
};

export default FeePaymentForm;