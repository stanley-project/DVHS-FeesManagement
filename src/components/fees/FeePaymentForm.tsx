import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { AlertCircle } from 'lucide-react';

interface FeePaymentFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  studentId?: string;
  registrationType?: 'new' | 'continuing';
  chargeId?: string; // New prop for miscellaneous charges
  isForMiscellaneousCharge?: boolean; // Flag to indicate if this is for a miscellaneous charge
}

const FeePaymentForm = ({ 
  onSubmit, 
  onCancel, 
  studentId, 
  registrationType,
  chargeId,
  isForMiscellaneousCharge = false
}: FeePaymentFormProps) => {
  const [feeTypes, setFeeTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    feeTypeId: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMode: 'cash',
    transactionId: '',
    remarks: ''
  });
  const [miscellaneousCharge, setMiscellaneousCharge] = useState<any | null>(null);

  useEffect(() => {
    if (isForMiscellaneousCharge && chargeId) {
      fetchMiscellaneousCharge();
    } else {
      fetchFeeTypes();
    }
  }, [studentId, registrationType, chargeId, isForMiscellaneousCharge]);

  const fetchMiscellaneousCharge = async () => {
    try {
      setError(null);
      setLoading(true);

      const { data, error: chargeError } = await supabase
        .from('miscellaneous_charges')
        .select(`
          *,
          charge_category:charge_category_id(name),
          student:student_id(
            id,
            student_name,
            admission_number,
            class:class_id(name)
          )
        `)
        .eq('id', chargeId)
        .single();

      if (chargeError) throw chargeError;
      
      setMiscellaneousCharge(data);
      setFormData({
        ...formData,
        amount: data.amount.toString(),
        feeTypeId: 'miscellaneous',
        remarks: `Payment for: ${data.description}`
      });
    } catch (err) {
      console.error('Error fetching miscellaneous charge:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch charge details');
    } finally {
      setLoading(false);
    }
  };

  const fetchFeeTypes = async () => {
    try {
      setError(null);
      
      // Get current academic year with proper error handling
      const { data: academicYears, error: yearError } = await supabase
        .from('academic_years')
        .select('id')
        .eq('is_current', true)
        .limit(1)
        .single();

      if (yearError) {
        if (yearError.message.includes('JSON object requested, multiple (or no) rows returned')) {
          setError('No active academic year found. Please set a current academic year in Academic Year Management.');
          setLoading(false);
          return;
        }
        throw yearError;
      }

      if (!academicYears) {
        setError('No active academic year found. Please set a current academic year in Academic Year Management.');
        setLoading(false);
        return;
      }

      // Get student details if studentId is provided
      let studentClass;
      let studentVillage;
      if (studentId) {
        const { data: student, error: studentError } = await supabase
          .from('students')
          .select(`
            class_id,
            village_id,
            has_school_bus
          `)
          .eq('id', studentId)
          .single();

        if (studentError) throw studentError;
        studentClass = student.class_id;
        studentVillage = student.village_id;
      }

      // Get fee types based on registration type and student details
      let query = supabase
        .from('fee_structure')
        .select(`
          id,
          amount,
          due_date,
          fee_type:fee_types(
            id,
            name,
            category,
            is_monthly,
            is_for_new_students_only
          )
        `)
        .eq('academic_year_id', academicYears.id);

      // Add filters based on student details
      if (studentClass) {
        query = query.eq('class_id', studentClass);
      }

      // For new students, include admission fees
      if (registrationType === 'new') {
        // Get admission fee
        const { data: admissionFee, error: admissionError } = await supabase
          .from('admission_fee_settings')
          .select('*')
          .eq('academic_year_id', academicYears.id)
          .eq('is_active', true)
          .single();

        if (!admissionError && admissionFee) {
          // Add admission fee to fee types
          const admissionFeeType = {
            id: 'admission',
            amount: admissionFee.amount,
            due_date: admissionFee.effective_from,
            fee_type: {
              id: 'admission',
              name: 'Admission Fee',
              category: 'admission',
              is_monthly: false,
              is_for_new_students_only: true
            }
          };
          setFeeTypes([admissionFeeType]);
        }
      }

      // Get regular fee types
      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        setError('No fee structure defined for the current academic year.');
        setLoading(false);
        return;
      }

      // Filter fee types based on registration type
      const filteredFeeTypes = data.filter(fee => {
        if (registrationType === 'new') {
          return true; // Show all fees for new students
        } else {
          return !fee.fee_type.is_for_new_students_only; // Hide admission-only fees for continuing students
        }
      });

      // If student has bus service, get bus fee
      if (studentId && studentVillage) {
        const { data: busFee, error: busError } = await supabase
          .from('bus_fee_structure')
          .select('*')
          .eq('village_id', studentVillage)
          .eq('academic_year_id', academicYears.id)
          .eq('is_active', true)
          .single();

        if (!busError && busFee) {
          const busFeeType = {
            id: 'bus',
            amount: busFee.fee_amount,
            due_date: busFee.effective_from_date,
            fee_type: {
              id: 'bus',
              name: 'Bus Fee',
              category: 'bus',
              is_monthly: true
            }
          };
          filteredFeeTypes.push(busFeeType);
        }
      }

      // Add Miscellaneous Charges option
      const miscellaneousOption = {
        id: 'miscellaneous',
        amount: 0,
        due_date: new Date().toISOString().split('T')[0],
        fee_type: {
          id: 'miscellaneous',
          name: 'Miscellaneous Charges',
          category: 'school',
          is_monthly: false,
          is_for_new_students_only: false
        }
      };
      
      setFeeTypes([...feeTypes, ...filteredFeeTypes, miscellaneousOption]);
    } catch (error: any) {
      console.error('Error fetching fee types:', error);
      setError(error.message || 'Failed to fetch fee types. Please try again later.');
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

  const validateForm = () => {
    if (!formData.feeTypeId) {
      setError('Please select a fee type');
      return false;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Amount must be greater than 0');
      return false;
    }

    if (!formData.paymentDate) {
      setError('Payment date is required');
      return false;
    }

    // Check if payment date is not in the future
    const paymentDate = new Date(formData.paymentDate);
    if (paymentDate > new Date()) {
      setError('Payment date cannot be in the future');
      return false;
    }

    // Validate transaction ID for online payments
    if (formData.paymentMode === 'online' && !formData.transactionId.trim()) {
      setError('Transaction ID is required for online payments');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    try {
      // Generate receipt number
      const receiptNumber = `RC-${Date.now().toString().slice(-6)}`;

      // Prepare payment data
      const paymentData: any = {
        student_id: studentId,
        amount_paid: parseFloat(formData.amount),
        payment_date: formData.paymentDate,
        payment_method: formData.paymentMode,
        transaction_id: formData.transactionId || null,
        receipt_number: receiptNumber,
        notes: formData.remarks,
        created_by: (await supabase.auth.getUser()).data.user?.id
      };

      // Handle miscellaneous charges differently
      if (isForMiscellaneousCharge || formData.feeTypeId === 'miscellaneous') {
        paymentData.fee_structure_id = null;
        paymentData.charge_type = 'miscellaneous';
        
        if (miscellaneousCharge) {
          paymentData.charge_description = miscellaneousCharge.description;
        } else if (formData.remarks) {
          paymentData.charge_description = formData.remarks;
        }
      } else {
        paymentData.fee_structure_id = formData.feeTypeId;
        paymentData.charge_type = 'regular';
      }

      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from('fee_payments')
        .insert(paymentData)
        .select()
        .single();

      if (paymentError) throw paymentError;

      onSubmit(payment);
    } catch (error: any) {
      console.error('Error processing payment:', error);
      setError(error.message || 'Failed to process payment. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Loading fee types...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => isForMiscellaneousCharge ? fetchMiscellaneousCharge() : fetchFeeTypes()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {isForMiscellaneousCharge && miscellaneousCharge && (
        <div className="bg-muted p-4 rounded-md mb-6">
          <h3 className="font-medium mb-2">Miscellaneous Charge Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Student:</p>
              <p className="font-medium">{miscellaneousCharge.student?.student_name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Category:</p>
              <p className="font-medium">{miscellaneousCharge.charge_category?.name || 'Custom'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Description:</p>
              <p className="font-medium">{miscellaneousCharge.description}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Amount:</p>
              <p className="font-medium">₹{miscellaneousCharge.amount}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {!isForMiscellaneousCharge && (
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
              disabled={isForMiscellaneousCharge}
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
        )}
        
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
              readOnly={isForMiscellaneousCharge}
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
          </select>
        </div>
        
        {formData.paymentMode === 'online' && (
          <div className="space-y-2 md:col-span-2">
            <label htmlFor="transactionId" className="block text-sm font-medium">
              Transaction ID *
            </label>
            <input
              id="transactionId"
              type="text"
              className="input"
              placeholder="Enter transaction ID"
              value={formData.transactionId}
              onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
              required
            />
          </div>
        )}
        
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