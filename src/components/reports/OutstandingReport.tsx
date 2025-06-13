import { useState, useEffect } from 'react';
import { Download, ArrowUpDown, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import * as XLSX from 'xlsx';

interface OutstandingReportProps {
  type: string;
  dateRange: {
    start: string;
    end: string;
  };
  selectedClass: string;
  selectedFeeType: string;
}

const OutstandingReport = ({ type, dateRange, selectedClass, selectedFeeType }: OutstandingReportProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [outstandingData, setOutstandingData] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    totalOutstanding: 0,
    busOutstanding: 0,
    schoolOutstanding: 0,
    totalStudents: 0,
    defaulterCount: 0
  });

  useEffect(() => {
    fetchOutstandingData();
  }, [type, dateRange, selectedClass, selectedFeeType]);

  const fetchOutstandingData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current academic year
      const { data: academicYear, error: yearError } = await supabase
        .from('academic_years')
        .select('id')
        .eq('is_current', true)
        .single();

      if (yearError) throw yearError;

      // Get all students with their class info
      let query = supabase
        .from('students')
        .select(`
          id,
          student_name,
          admission_number,
          class:class_id(id, name),
          village_id,
          has_school_bus
        `)
        .eq('status', 'active');

      // Apply class filter if selected
      if (selectedClass !== 'all') {
        query = query.eq('class.name', selectedClass);
      }

      const { data: students, error: studentsError } = await query;

      if (studentsError) throw studentsError;

      // Get fee structure for current academic year
      const { data: feeStructure, error: feeError } = await supabase
        .from('fee_structure')
        .select(`
          class_id,
          amount,
          fee_type:fee_type_id(id, name, category)
        `)
        .eq('academic_year_id', academicYear.id);

      if (feeError) throw feeError;

      // Get bus fees
      const { data: busFees, error: busError } = await supabase
        .from('bus_fee_structure')
        .select(`
          village_id,
          fee_amount
        `)
        .eq('academic_year_id', academicYear.id)
        .eq('is_active', true);

      if (busError) throw busError;

      // Get all payments
      const { data: payments, error: paymentsError } = await supabase
        .from('fee_payments')
        .select(`
          student_id,
          amount_paid,
          payment_allocation(
            bus_fee_amount,
            school_fee_amount
          )
        `);

      if (paymentsError) throw paymentsError;

      // Calculate outstanding amounts for each student
      const outstandingList = students.map(student => {
        // Calculate total fees
        let totalSchoolFees = 0;
        let totalBusFees = 0;

        // Add school fees
        const classFees = feeStructure?.filter(fee => 
          fee.class_id === student.class.id && 
          (selectedFeeType === 'all' || fee.fee_type.name === selectedFeeType)
        ) || [];
        
        totalSchoolFees = classFees.reduce((sum, fee) => sum + parseFloat(fee.amount), 0);

        // Add bus fees if applicable
        if (student.has_school_bus && student.village_id) {
          const villageBusFee = busFees?.find(fee => fee.village_id === student.village_id);
          if (villageBusFee) {
            totalBusFees = parseFloat(villageBusFee.fee_amount);
          }
        }

        const totalFees = totalSchoolFees + totalBusFees;

        // Calculate paid amount
        const studentPayments = payments?.filter(payment => payment.student_id === student.id) || [];
        let paidBusFees = 0;
        let paidSchoolFees = 0;

        studentPayments.forEach(payment => {
          if (payment.payment_allocation && payment.payment_allocation.length > 0) {
            const allocation = payment.payment_allocation[0];
            paidBusFees += parseFloat(allocation.bus_fee_amount || 0);
            paidSchoolFees += parseFloat(allocation.school_fee_amount || 0);
          } else {
            // Fallback for older payments
            paidSchoolFees += parseFloat(payment.amount_paid || 0);
          }
        });

        const totalPaid = paidBusFees + paidSchoolFees;

        // Calculate outstanding amounts
        const outstandingBusFees = Math.max(0, totalBusFees - paidBusFees);
        const outstandingSchoolFees = Math.max(0, totalSchoolFees - paidSchoolFees);
        const totalOutstanding = outstandingBusFees + outstandingSchoolFees;

        // Determine status
        let status = 'paid';
        if (totalOutstanding > 0) {
          status = totalPaid > 0 ? 'partial' : 'pending';
        }

        return {
          id: student.id,
          name: student.student_name,
          admissionNumber: student.admission_number,
          class: student.class.name,
          totalFees,
          totalPaid,
          outstandingBusFees,
          outstandingSchoolFees,
          totalOutstanding,
          status
        };
      });

      // Filter out students with no outstanding balance if viewing defaulters
      const filteredData = type === 'defaulters' 
        ? outstandingList.filter(student => student.totalOutstanding > 0)
        : outstandingList;

      // Sort by outstanding amount (highest first)
      filteredData.sort((a, b) => b.totalOutstanding - a.totalOutstanding);

      // Calculate summary
      const totalOutstanding = filteredData.reduce((sum, student) => sum + student.totalOutstanding, 0);
      const busOutstanding = filteredData.reduce((sum, student) => sum + student.outstandingBusFees, 0);
      const schoolOutstanding = filteredData.reduce((sum, student) => sum + student.outstandingSchoolFees, 0);
      const defaulterCount = filteredData.filter(student => student.totalOutstanding > 0).length;

      setSummary({
        totalOutstanding,
        busOutstanding,
        schoolOutstanding,
        totalStudents: filteredData.length,
        defaulterCount
      });

      setOutstandingData(filteredData);
    } catch (err: any) {
      console.error('Error fetching outstanding data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    try {
      // Prepare data for export
      const exportData = outstandingData.map(student => ({
        'Admission Number': student.admissionNumber,
        'Student Name': student.name,
        'Class': student.class,
        'Total Fees': student.totalFees.toLocaleString('en-IN'),
        'Total Paid': student.totalPaid.toLocaleString('en-IN'),
        'Bus Fee Due': student.outstandingBusFees.toLocaleString('en-IN'),
        'School Fee Due': student.outstandingSchoolFees.toLocaleString('en-IN'),
        'Total Outstanding': student.totalOutstanding.toLocaleString('en-IN'),
        'Status': student.status.charAt(0).toUpperCase() + student.status.slice(1)
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Outstanding Report');

      // Generate filename with date
      const fileName = `Outstanding_Report_${new Date().toISOString().split('T')[0]}.xlsx`;

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
          <p className="text-sm text-muted-foreground">Total Outstanding</p>
          <p className="text-2xl font-bold mt-1">₹{summary.totalOutstanding.toLocaleString('en-IN')}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {summary.defaulterCount} of {summary.totalStudents} students
          </p>
        </div>
        
        <div className="bg-muted p-4 rounded-md">
          <p className="text-sm text-muted-foreground">Bus Fee Outstanding</p>
          <p className="text-2xl font-bold mt-1">₹{summary.busOutstanding.toLocaleString('en-IN')}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {((summary.busOutstanding / summary.totalOutstanding) * 100).toFixed(1)}% of total
          </p>
        </div>
        
        <div className="bg-muted p-4 rounded-md">
          <p className="text-sm text-muted-foreground">School Fee Outstanding</p>
          <p className="text-2xl font-bold mt-1">₹{summary.schoolOutstanding.toLocaleString('en-IN')}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {((summary.schoolOutstanding / summary.totalOutstanding) * 100).toFixed(1)}% of total
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

      {/* Outstanding Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading outstanding data...</span>
        </div>
      ) : error ? (
        <div className="bg-error/10 border border-error/30 text-error rounded-md p-4">
          {error}
        </div>
      ) : outstandingData.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No outstanding fees found for the selected filters.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-3 text-left">
                  <button className="flex items-center gap-1">
                    Admission No.
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button className="flex items-center gap-1">
                    Student Name
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">Class</th>
                <th className="px-4 py-3 text-right">
                  <button className="flex items-center gap-1 ml-auto">
                    Total Fees
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </th>
                <th className="px-4 py-3 text-right">
                  <button className="flex items-center gap-1 ml-auto">
                    Paid Amount
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </th>
                <th className="px-4 py-3 text-right">
                  <button className="flex items-center gap-1 ml-auto">
                    Outstanding
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {outstandingData.map((student) => (
                <tr key={student.id} className="border-b hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium">{student.admissionNumber}</td>
                  <td className="px-4 py-3">{student.name}</td>
                  <td className="px-4 py-3">{student.class}</td>
                  <td className="px-4 py-3 text-right">₹{student.totalFees.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-right">₹{student.totalPaid.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-right">₹{student.totalOutstanding.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      student.status === 'paid' ? 'bg-success/10 text-success' : 
                      student.status === 'partial' ? 'bg-warning/10 text-warning' : 
                      'bg-error/10 text-error'
                    }`}>
                      {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/50">
                <td className="px-4 py-3 font-medium" colSpan={5}>Total Outstanding</td>
                <td className="px-4 py-3 text-right font-medium">₹{summary.totalOutstanding.toLocaleString('en-IN')}</td>
                <td className="px-4 py-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

export default OutstandingReport;