import { X, Download, Printer, Mail, CircleDollarSign } from 'lucide-react';
import { MiscellaneousCharge } from '../../types/fees';

interface MiscellaneousChargeDetailsProps {
  charge: MiscellaneousCharge;
  onClose: () => void;
  onProcessPayment?: () => void;
}

const MiscellaneousChargeDetails = ({ 
  charge, 
  onClose,
  onProcessPayment
}: MiscellaneousChargeDetailsProps) => {
  return (
    <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-lg max-w-2xl w-full">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Charge Details</h2>
            <div className="flex gap-2">
              <button className="btn btn-outline btn-sm" title="Email Receipt">
                <Mail className="h-4 w-4" />
              </button>
              <button className="btn btn-outline btn-sm" title="Download PDF">
                <Download className="h-4 w-4" />
              </button>
              <button className="btn btn-outline btn-sm" title="Print Receipt">
                <Printer className="h-4 w-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-full"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <CircleDollarSign className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Miscellaneous Charge</h1>
            <p className="text-muted-foreground">
              {charge.is_paid ? 'Payment Receipt' : 'Pending Payment'}
            </p>
          </div>

          {/* Student Details */}
          <div className="bg-muted p-4 rounded-md space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground">Student Name:</p>
                <p className="font-medium">{charge.student?.student_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Admission Number:</p>
                <p className="font-medium">{charge.student?.admission_number}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground">Class:</p>
                <p className="font-medium">{charge.student?.class?.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status:</p>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  charge.is_paid 
                    ? 'bg-success/10 text-success' 
                    : 'bg-warning/10 text-warning'
                }`}>
                  {charge.is_paid ? 'Paid' : 'Unpaid'}
                </span>
              </div>
            </div>
          </div>

          {/* Charge Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Charge Information</h3>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Category:</p>
                <p className="font-medium">{charge.charge_category?.name || 'Custom'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Amount:</p>
                <p className="font-medium">₹{charge.amount}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Charge Date:</p>
                <p className="font-medium">{new Date(charge.charge_date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Due Date:</p>
                <p className="font-medium">{charge.due_date ? new Date(charge.due_date).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">Description:</p>
              <p className="bg-muted p-3 rounded-md">{charge.description}</p>
            </div>
          </div>

          {/* Payment Details (if paid) */}
          {charge.is_paid && charge.payment_id && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Payment Information</h3>
              
              <div className="bg-success/5 border border-success/20 p-4 rounded-md text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground">Payment Date:</p>
                    <p className="font-medium">
                      {/* This would need to be fetched from the payment record */}
                      {new Date().toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Receipt Number:</p>
                    <p className="font-medium">
                      {/* This would need to be fetched from the payment record */}
                      RC-{charge.payment_id.slice(-6)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground">
            <p>This is a computer-generated document and does not require a signature.</p>
          </div>
        </div>

        <div className="p-6 border-t">
          <div className="flex justify-between">
            <button
              className="btn btn-outline btn-md"
              onClick={onClose}
            >
              Close
            </button>
            
            {!charge.is_paid && onProcessPayment && (
              <button
                className="btn btn-primary btn-md"
                onClick={onProcessPayment}
              >
                <CircleDollarSign className="h-4 w-4 mr-2" />
                Process Payment
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MiscellaneousChargeDetails;