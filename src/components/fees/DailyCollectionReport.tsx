import { useState, useEffect } from 'react';
import { Download, Filter, X, Loader2, ArrowUpDown, Edit, Trash2 } from 'lucide-react';
import { useFeePayments } from '../../hooks/useFeePayments';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';
import EditPaymentModal from './EditPaymentModal';
import { FeePayment } from '../../types/fees';

interface DailyCollectionReportProps {
  onClose: () => void;
}

const DailyCollectionReport = ({ onClose }: DailyCollectionReportProps) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('all');
  const [selectedCollector, setSelectedCollector] = useState('all');
  const [editingPayment, setEditingPayment] = useState<FeePayment | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);

  const { 
    payments, 
    loading, 
    error, 
    summary,
    updatePayment,
    deletePayment,
    fetchPayments
  } = useFeePayments({
    startDate: selectedDate,
    endDate: selectedDate,
    paymentMethod: selectedPaymentMethod === 'all' ? undefined : selectedPaymentMethod as any,
  });

  const handleExport = () => {
    try {
      // Prepare data for export
      const exportData = payments.map(payment => {
        // Get allocation data
        const busAmount = payment.manual_payment_allocation?.[0]?.bus_fee_amount || 
                         payment.payment_allocation?.[0]?.bus_fee_amount || 
                         payment.metadata?.bus_fee_amount || 0;
                         
        const schoolAmount = payment.manual_payment_allocation?.[0]?.school_fee_amount || 
                            payment.payment_allocation?.[0]?.school_fee_amount || 
                            payment.metadata?.school_fee_amount || 0;
        
        return {
          'Receipt Number': payment.receipt_number,
          'Student Name': payment.student?.student_name || '',
          'Admission Number': payment.student?.admission_number || '',
          'Class': payment.student?.class?.name || '',
          'Amount': parseFloat(payment.amount_paid).toLocaleString('en-IN'),
          'Bus Fee': parseFloat(busAmount).toLocaleString('en-IN'),
          'School Fee': parseFloat(schoolAmount).toLocaleString('en-IN'),
          'Payment Method': payment.payment_method,
          'Transaction ID': payment.transaction_id || '',
          'Payment Date': new Date(payment.payment_date).toLocaleDateString(),
          'Time': new Date(payment.created_at || '').toLocaleTimeString(),
          'Notes': payment.notes || ''
        };
      });

      // Add summary row
      exportData.push({
        'Receipt Number': '',
        'Student Name': '',
        'Admission Number': '',
        'Class': '',
        'Amount': `Total: ${summary.totalAmount.toLocaleString('en-IN')}`,
        'Bus Fee': `Total: ${summary.busFeesAmount.toLocaleString('en-IN')}`,
        'School Fee': `Total: ${summary.schoolFeesAmount.toLocaleString('en-IN')}`,
        'Payment Method': '',
        'Transaction ID': '',
        'Payment Date': '',
        'Time': '',
        'Notes': ''
      });

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Daily Collection');

      // Generate filename with current date
      const fileName = `Daily_Collection_${selectedDate}.xlsx`;

      // Save file
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
  };

  const handleEditPayment = (payment: FeePayment) => {
    setEditingPayment(payment);
  };

  const handleUpdatePayment = async () => {
    try {
      toast.success('Payment updated successfully');
      fetchPayments();
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('Failed to update payment');
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    try {
      await deletePayment(paymentId);
      toast.success('Payment deleted successfully');
      setShowConfirmDelete(null);
      fetchPayments();
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast.error('Failed to delete payment');
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-lg w-full max-w-4xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Daily Collection Report</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input"
            />
            
            <select
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              className="input"
            >
              <option value="all">All Payment Methods</option>
              <option value="cash">Cash</option>
              <option value="online">Online</option>
            </select>
            
            <select
              value={selectedCollector}
              onChange={(e) => setSelectedCollector(e.target.value)}
              className="input"
            >
              <option value="all">All Collectors</option>
              <option value="admin">Administrator</option>
              <option value="accountant">Accountant</option>
            </select>

            <button 
              className="btn btn-outline btn-sm ml-auto"
              onClick={handleExport}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-muted p-4 rounded-md">
              <p className="text-sm text-muted-foreground">Total Collection</p>
              <p className="text-2xl font-bold mt-1">₹{summary.totalAmount.toLocaleString('en-IN')}</p>
              <p className="text-xs text-muted-foreground mt-1">{payments.length} transactions</p>
            </div>
            
            <div className="bg-muted p-4 rounded-md">
              <p className="text-sm text-muted-foreground">Cash Collection</p>
              <p className="text-2xl font-bold mt-1">₹{summary.cashAmount.toLocaleString('en-IN')}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {payments.filter(p => p.payment_method === 'cash').length} transactions
              </p>
            </div>
            
            <div className="bg-muted p-4 rounded-md">
              <p className="text-sm text-muted-foreground">Online Collection</p>
              <p className="text-2xl font-bold mt-1">₹{summary.onlineAmount.toLocaleString('en-IN')}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {payments.filter(p => p.payment_method === 'online').length} transactions
              </p>
            </div>
          </div>

          {/* Collections Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading collection data...</span>
            </div>
          ) : error ? (
            <div className="bg-error/10 border border-error/30 text-error rounded-md p-4">
              {error.message}
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No collections found for the selected date and filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      <button className="flex items-center gap-1">
                        Receipt No.
                        <ArrowUpDown className="h-4 w-4" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Student Name</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Class</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      <button className="flex items-center gap-1 ml-auto">
                        Amount
                        <ArrowUpDown className="h-4 w-4" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Payment Method</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Time</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium">{payment.receipt_number}</td>
                      <td className="px-4 py-3">{payment.student?.student_name}</td>
                      <td className="px-4 py-3">{payment.student?.class?.name}</td>
                      <td className="px-4 py-3 text-right">₹{parseFloat(payment.amount_paid).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 capitalize">{payment.payment_method}</td>
                      <td className="px-4 py-3">
                        {payment.created_at 
                          ? new Date(payment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : 'N/A'
                        }
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleEditPayment(payment)}
                            className="p-1 hover:bg-muted rounded-md text-primary"
                            title="Edit Payment"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setShowConfirmDelete(payment.id)}
                            className="p-1 hover:bg-muted rounded-md text-error"
                            title="Delete Payment"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/50">
                    <td className="px-4 py-3 font-medium" colSpan={3}>Total</td>
                    <td className="px-4 py-3 text-right font-medium">₹{summary.totalAmount.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3" colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Payment Modal */}
      {editingPayment && (
        <EditPaymentModal
          payment={editingPayment}
          onClose={() => setEditingPayment(null)}
          onUpdate={handleUpdatePayment}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-[60] p-4">
          <div className="bg-card rounded-lg shadow-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
            <p className="mb-6">Are you sure you want to delete this payment? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setShowConfirmDelete(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-error btn-sm"
                onClick={() => handleDeletePayment(showConfirmDelete)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyCollectionReport;