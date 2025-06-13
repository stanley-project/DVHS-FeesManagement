import { useState, useEffect } from 'react';
import { Download, ArrowUpDown, FileText, Loader2 } from 'lucide-react';
import { useFeePayments } from '../../hooks/useFeePayments';
import * as XLSX from 'xlsx';

interface CollectionReportProps {
  type: string;
  dateRange: {
    start: string;
    end: string;
  };
  selectedClass: string;
  selectedFeeType: string;
}

const CollectionReport = ({ type, dateRange, selectedClass, selectedFeeType }: CollectionReportProps) => {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const { 
    payments, 
    loading, 
    error, 
    totalCount, 
    summary 
  } = useFeePayments({
    startDate: dateRange.start,
    endDate: dateRange.end,
    page,
    limit
  });

  const totalPages = Math.ceil(totalCount / limit);

  const handleExport = () => {
    try {
      // Prepare data for export
      const exportData = payments.map(payment => ({
        'Receipt Number': payment.receipt_number,
        'Student Name': payment.student?.student_name || '',
        'Admission Number': payment.student?.admission_number || '',
        'Class': payment.student?.class?.name || '',
        'Amount': parseFloat(payment.amount_paid).toLocaleString('en-IN'),
        'Bus Fee': payment.allocation ? parseFloat(payment.allocation.bus_fee_amount).toLocaleString('en-IN') : '0',
        'School Fee': payment.allocation ? parseFloat(payment.allocation.school_fee_amount).toLocaleString('en-IN') : '0',
        'Payment Method': payment.payment_method,
        'Transaction ID': payment.transaction_id || '',
        'Payment Date': new Date(payment.payment_date).toLocaleDateString(),
        'Notes': payment.notes || ''
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Collection Report');

      // Generate filename with date range
      const fileName = `Collection_Report_${dateRange.start}_to_${dateRange.end}.xlsx`;

      // Save file
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-muted p-4 rounded-md">
          <p className="text-sm text-muted-foreground">Total Collection</p>
          <p className="text-2xl font-bold mt-1">₹{summary.totalAmount.toLocaleString('en-IN')}</p>
          <p className="text-xs text-muted-foreground mt-1">{totalCount} transactions</p>
        </div>
        
        <div className="bg-muted p-4 rounded-md">
          <p className="text-sm text-muted-foreground">Bus Fee Collection</p>
          <p className="text-2xl font-bold mt-1">₹{summary.busFeesAmount.toLocaleString('en-IN')}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {((summary.busFeesAmount / summary.totalAmount) * 100).toFixed(1)}% of total
          </p>
        </div>
        
        <div className="bg-muted p-4 rounded-md">
          <p className="text-sm text-muted-foreground">School Fee Collection</p>
          <p className="text-2xl font-bold mt-1">₹{summary.schoolFeesAmount.toLocaleString('en-IN')}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {((summary.schoolFeesAmount / summary.totalAmount) * 100).toFixed(1)}% of total
          </p>
        </div>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <button 
          className="btn btn-outline btn-sm"
          onClick={handleExport}
        >
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </button>
      </div>

      {/* Collection Table */}
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
          No collections found for the selected date range and filters.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-3 text-left">
                  <button className="flex items-center gap-1">
                    Date
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button className="flex items-center gap-1">
                    Receipt No.
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">Student Name</th>
                <th className="px-4 py-3 text-left">Class</th>
                <th className="px-4 py-3 text-right">
                  <button className="flex items-center gap-1 ml-auto">
                    Amount
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">Payment Method</th>
                <th className="px-4 py-3 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-b hover:bg-muted/50">
                  <td className="px-4 py-3">{new Date(payment.payment_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-medium">{payment.receipt_number}</td>
                  <td className="px-4 py-3">{payment.student?.student_name}</td>
                  <td className="px-4 py-3">{payment.student?.class?.name}</td>
                  <td className="px-4 py-3 text-right">₹{parseFloat(payment.amount_paid).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 capitalize">{payment.payment_method}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-primary hover:text-primary/80">
                      <FileText className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/50">
                <td className="px-4 py-3 font-medium" colSpan={4}>Total</td>
                <td className="px-4 py-3 text-right font-medium">₹{summary.totalAmount.toLocaleString('en-IN')}</td>
                <td className="px-4 py-3" colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, totalCount)} of {totalCount} entries
          </p>
          <div className="flex gap-1">
            <button 
              className="btn btn-outline btn-sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            <button 
              className="btn btn-outline btn-sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionReport;