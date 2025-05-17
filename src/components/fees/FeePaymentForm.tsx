interface FeePaymentFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const FeePaymentForm = ({ onSubmit, onCancel }: FeePaymentFormProps) => {
  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="feeType" className="block text-sm font-medium">
            Fee Type
          </label>
          <select id="feeType" className="input">
            <option value="term1">Term 1 Fee</option>
            <option value="term2">Term 2 Fee</option>
            <option value="term3">Term 3 Fee</option>
            <option value="admissionFee">Admission Fee</option>
            <option value="transportFee">Transport Fee</option>
            <option value="examFee">Examination Fee</option>
            <option value="otherFee">Other Fee</option>
          </select>
        </div>
        
        <div className="space-y-2">
          <label htmlFor="amount" className="block text-sm font-medium">
            Amount
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
              defaultValue="15000"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <label htmlFor="paymentDate" className="block text-sm font-medium">
            Payment Date
          </label>
          <input
            id="paymentDate"
            type="date"
            className="input"
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="paymentMode" className="block text-sm font-medium">
            Payment Mode
          </label>
          <select id="paymentMode" className="input">
            <option value="cash">Cash</option>
            <option value="cheque">Cheque/DD</option>
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