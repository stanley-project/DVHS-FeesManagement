import { School, Download, Printer, Mail } from 'lucide-react';

interface PaymentReceiptProps {
  receipt: {
    receiptNumber: string;
    date: string;
    student: {
      name: string;
      admissionNumber: string;
      class: string;
      section: string;
    };
    payments: {
      feeType: string;
      amount: string;
    }[];
    total: string;
    paymentMethod: string;
    transactionId?: string;
    collectedBy: string;
  };
  onClose: () => void;
}

const PaymentReceipt = ({ receipt, onClose }: PaymentReceiptProps) => {
  return (
    <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-lg max-w-2xl w-full">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Fee Receipt</h2>
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
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* School Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <School className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Deepthi Vidyalayam</h1>
            <p className="text-muted-foreground">Fee Receipt</p>
          </div>

          {/* Receipt Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Receipt No:</p>
              <p className="font-medium">{receipt.receiptNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground">Date:</p>
              <p className="font-medium">{receipt.date}</p>
            </div>
          </div>

          {/* Student Details */}
          <div className="bg-muted p-4 rounded-md space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground">Student Name:</p>
                <p className="font-medium">{receipt.student.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Admission Number:</p>
                <p className="font-medium">{receipt.student.admissionNumber}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground">Class:</p>
                <p className="font-medium">{receipt.student.class}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Section:</p>
                <p className="font-medium">{receipt.student.section}</p>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="space-y-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Fee Type</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">Amount</th>
                </tr>
              </thead>
              <tbody>
                {receipt.payments.map((payment, index) => (
                  <tr key={index} className="border-b">
                    <td className="px-4 py-2">{payment.feeType}</td>
                    <td className="px-4 py-2 text-right">₹{payment.amount}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t font-medium">
                  <td className="px-4 py-2">Total Amount</td>
                  <td className="px-4 py-2 text-right">₹{receipt.total}</td>
                </tr>
              </tfoot>
            </table>

            <div className="bg-muted p-4 rounded-md space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground">Payment Method:</p>
                  <p className="font-medium">{receipt.paymentMethod}</p>
                </div>
                {receipt.transactionId && (
                  <div>
                    <p className="text-muted-foreground">Transaction ID:</p>
                    <p className="font-medium">{receipt.transactionId}</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-muted-foreground">Collected By:</p>
                <p className="font-medium">{receipt.collectedBy}</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground">
            <p>This is a computer-generated receipt and does not require a signature.</p>
          </div>
        </div>

        <div className="p-6 border-t">
          <div className="flex justify-end">
            <button
              className="btn btn-outline btn-md"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentReceipt;