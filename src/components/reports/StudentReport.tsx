import { useState, useEffect } from 'react';
import { Users, TrendingUp, AlertCircle, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface StudentReportProps {
  type: string;
  dateRange: { start: string; end: string };
  selectedClass: string;
}

interface StudentSummary {
  totalStudents: number;
  paidStudents: number;
  partialStudents: number;
  pendingStudents: number;
  totalFees: number;
  totalPaid: number;
  totalOutstanding: number;
  collectionPercentage: number;
}

interface StudentFeeData {
  id: string;
  admission_number: string;
  student_name: string;
  class_name: string;
  section: string;
  total_fees: number;
  total_paid: number;
  outstanding: number;
  status: 'paid' | 'partial' | 'pending';
  last_payment_date?: string;
}

const StudentReport = ({ type, dateRange, selectedClass }: StudentReportProps) => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<StudentSummary>({
    totalStudents: 0,
    paidStudents: 0,
    partialStudents: 0,
    pendingStudents: 0,
    totalFees: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    collectionPercentage: 0
  });
  const [studentData, setStudentData] = useState<StudentFeeData[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStudentReport();
  }, [type, dateRange, selectedClass]);

  const fetchStudentReport = async () => {
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

      let query = supabase
        .from('students')
        .select(`
          id,
          admission_number,
          student_name,
          section,
          classes!inner(id, name),
          fee_payments(
            id,
            amount_paid,
            payment_date,
            academic_year_id
          )
        `)
        .eq('status', 'active')
        .eq('classes.academic_year_id', academicYear.id);

      if (selectedClass !== 'all') {
        query = query.eq('class_id', selectedClass);
      }

      const { data: studentsData, error: studentsError } = await query;

      if (studentsError) throw studentsError;

      // Get fee structure for calculations
      let feeQuery = supabase
        .from('fee_structure')
        .select(`
          class_id,
          amount,
          fee_types(name, category)
        `)
        .eq('academic_year_id', academicYear.id);

      if (selectedClass !== 'all') {
        feeQuery = feeQuery.eq('class_id', selectedClass);
      }

      const { data: feeStructure, error: feeError } = await feeQuery;

      if (feeError) throw feeError;

      // Process student data
      const processedData: StudentFeeData[] = [];
      let totalStudents = 0;
      let paidStudents = 0;
      let partialStudents = 0;
      let pendingStudents = 0;
      let totalFees = 0;
      let totalPaid = 0;

      studentsData?.forEach((student: any) => {
        totalStudents++;

        // Calculate total fees for this student's class
        const classFees = feeStructure?.filter(fee => fee.class_id === student.classes.id) || [];
        const studentTotalFees = classFees.reduce((sum, fee) => sum + parseFloat(fee.amount || '0'), 0);

        // Calculate total paid by this student in the date range
        const payments = student.fee_payments?.filter((payment: any) => {
          const paymentDate = new Date(payment.payment_date);
          const startDate = new Date(dateRange.start);
          const endDate = new Date(dateRange.end);
          return paymentDate >= startDate && paymentDate <= endDate && payment.academic_year_id === academicYear.id;
        }) || [];

        const studentTotalPaid = payments.reduce((sum: number, payment: any) => sum + parseFloat(payment.amount_paid || '0'), 0);
        const outstanding = Math.max(0, studentTotalFees - studentTotalPaid);

        let status: 'paid' | 'partial' | 'pending' = 'pending';
        if (studentTotalPaid >= studentTotalFees && studentTotalFees > 0) {
          status = 'paid';
          paidStudents++;
        } else if (studentTotalPaid > 0) {
          status = 'partial';
          partialStudents++;
        } else {
          pendingStudents++;
        }

        const lastPayment = payments.sort((a: any, b: any) => 
          new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
        )[0];

        processedData.push({
          id: student.id,
          admission_number: student.admission_number,
          student_name: student.student_name,
          class_name: student.classes.name,
          section: student.section,
          total_fees: studentTotalFees,
          total_paid: studentTotalPaid,
          outstanding,
          status,
          last_payment_date: lastPayment?.payment_date
        });

        totalFees += studentTotalFees;
        totalPaid += studentTotalPaid;
      });

      const totalOutstanding = Math.max(0, totalFees - totalPaid);
      const collectionPercentage = totalFees > 0 ? (totalPaid / totalFees) * 100 : 0;

      setSummary({
        totalStudents,
        paidStudents,
        partialStudents,
        pendingStudents,
        totalFees,
        totalPaid,
        totalOutstanding,
        collectionPercentage
      });

      setStudentData(processedData);

    } catch (err) {
      console.error('Error fetching student report:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch student report');
    } finally {
      setLoading(false);
    }
  };

  const renderSummaryCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-card p-4 rounded-lg border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total Students</p>
            <p className="text-2xl font-bold">{summary.totalStudents}</p>
          </div>
          <Users className="h-8 w-8 text-blue-500" />
        </div>
      </div>

      <div className="bg-card p-4 rounded-lg border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Collection Rate</p>
            <p className="text-2xl font-bold">{summary.collectionPercentage.toFixed(1)}%</p>
          </div>
          <TrendingUp className="h-8 w-8 text-green-500" />
        </div>
      </div>

      <div className="bg-card p-4 rounded-lg border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total Collected</p>
            <p className="text-2xl font-bold">₹{summary.totalPaid.toLocaleString()}</p>
          </div>
          <DollarSign className="h-8 w-8 text-green-500" />
        </div>
      </div>

      <div className="bg-card p-4 rounded-lg border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Outstanding</p>
            <p className="text-2xl font-bold">₹{summary.totalOutstanding.toLocaleString()}</p>
          </div>
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
      </div>
    </div>
  );

  const renderStatusBreakdown = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-card p-4 rounded-lg border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Fully Paid</p>
            <p className="text-xl font-bold text-green-600">{summary.paidStudents}</p>
            <p className="text-xs text-muted-foreground">
              {summary.totalStudents > 0 ? ((summary.paidStudents / summary.totalStudents) * 100).toFixed(1) : 0}% of total
            </p>
          </div>
          <CheckCircle className="h-6 w-6 text-green-500" />
        </div>
      </div>

      <div className="bg-card p-4 rounded-lg border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Partial Payment</p>
            <p className="text-xl font-bold text-yellow-600">{summary.partialStudents}</p>
            <p className="text-xs text-muted-foreground">
              {summary.totalStudents > 0 ? ((summary.partialStudents / summary.totalStudents) * 100).toFixed(1) : 0}% of total
            </p>
          </div>
          <Clock className="h-6 w-6 text-yellow-500" />
        </div>
      </div>

      <div className="bg-card p-4 rounded-lg border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">No Payment</p>
            <p className="text-xl font-bold text-red-600">{summary.pendingStudents}</p>
            <p className="text-xs text-muted-foreground">
              {summary.totalStudents > 0 ? ((summary.pendingStudents / summary.totalStudents) * 100).toFixed(1) : 0}% of total
            </p>
          </div>
          <AlertCircle className="h-6 w-6 text-red-500" />
        </div>
      </div>
    </div>
  );

  const renderStudentTable = () => (
    <div className="bg-card rounded-lg border overflow-hidden">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">Student Fee Status Details</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">Admission No.</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Student Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Class</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Section</th>
              <th className="px-4 py-3 text-right text-sm font-medium">Total Fees</th>
              <th className="px-4 py-3 text-right text-sm font-medium">Paid</th>
              <th className="px-4 py-3 text-right text-sm font-medium">Outstanding</th>
              <th className="px-4 py-3 text-center text-sm font-medium">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Last Payment</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {studentData.map((student) => (
              <tr key={student.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 text-sm">{student.admission_number}</td>
                <td className="px-4 py-3 text-sm font-medium">{student.student_name}</td>
                <td className="px-4 py-3 text-sm">{student.class_name}</td>
                <td className="px-4 py-3 text-sm">{student.section}</td>
                <td className="px-4 py-3 text-sm text-right">₹{student.total_fees.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-right">₹{student.total_paid.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-right">₹{student.outstanding.toLocaleString()}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    student.status === 'paid' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : student.status === 'partial'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {student.status === 'paid' ? 'Paid' : student.status === 'partial' ? 'Partial' : 'Pending'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  {student.last_payment_date 
                    ? new Date(student.last_payment_date).toLocaleDateString()
                    : 'No payment'
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderClasswiseReport = () => {
    // Group students by class
    const classwiseData = studentData.reduce((acc, student) => {
      const className = student.class_name;
      if (!acc[className]) {
        acc[className] = {
          totalStudents: 0,
          paidStudents: 0,
          partialStudents: 0,
          pendingStudents: 0,
          totalFees: 0,
          totalPaid: 0,
          totalOutstanding: 0
        };
      }
      
      acc[className].totalStudents++;
      acc[className].totalFees += student.total_fees;
      acc[className].totalPaid += student.total_paid;
      acc[className].totalOutstanding += student.outstanding;
      
      if (student.status === 'paid') acc[className].paidStudents++;
      else if (student.status === 'partial') acc[className].partialStudents++;
      else acc[className].pendingStudents++;
      
      return acc;
    }, {} as Record<string, any>);

    return (
      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Class-wise Student Count & Collection</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Class</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Total Students</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Paid</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Partial</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Pending</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Total Fees</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Collected</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Outstanding</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Collection %</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {Object.entries(classwiseData).map(([className, data]: [string, any]) => {
                const collectionPercentage = data.totalFees > 0 ? (data.totalPaid / data.totalFees) * 100 : 0;
                return (
                  <tr key={className} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-sm font-medium">{className}</td>
                    <td className="px-4 py-3 text-sm text-center">{data.totalStudents}</td>
                    <td className="px-4 py-3 text-sm text-center text-green-600">{data.paidStudents}</td>
                    <td className="px-4 py-3 text-sm text-center text-yellow-600">{data.partialStudents}</td>
                    <td className="px-4 py-3 text-sm text-center text-red-600">{data.pendingStudents}</td>
                    <td className="px-4 py-3 text-sm text-right">₹{data.totalFees.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-right">₹{data.totalPaid.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-right">₹{data.totalOutstanding.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={`font-medium ${
                        collectionPercentage >= 80 ? 'text-green-600' :
                        collectionPercentage >= 50 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {collectionPercentage.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderNewAdmissionsReport = () => {
    const newAdmissions = studentData.filter(student => {
      // This would need to be enhanced based on your admission date logic
      // For now, we'll show all students as this is a placeholder
      return true;
    });

    return (
      <div className="space-y-6">
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">New Admissions in Period</p>
              <p className="text-2xl font-bold">{newAdmissions.length}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-card rounded-lg border overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">New Admissions Details</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Admission No.</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Student Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Class</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Section</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Fees Due</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Paid</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {newAdmissions.slice(0, 50).map((student) => (
                  <tr key={student.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-sm">{student.admission_number}</td>
                    <td className="px-4 py-3 text-sm font-medium">{student.student_name}</td>
                    <td className="px-4 py-3 text-sm">{student.class_name}</td>
                    <td className="px-4 py-3 text-sm">{student.section}</td>
                    <td className="px-4 py-3 text-sm text-right">₹{student.total_fees.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-right">₹{student.total_paid.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        student.status === 'paid' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : student.status === 'partial'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {student.status === 'paid' ? 'Paid' : student.status === 'partial' ? 'Partial' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderReport = () => {
    if (type === 'feeStatus') {
      return (
        <div className="space-y-6">
          {renderSummaryCards()}
          {renderStatusBreakdown()}
          {renderStudentTable()}
        </div>
      );
    } else if (type === 'classwise') {
      return (
        <div className="space-y-6">
          {renderSummaryCards()}
          {renderClasswiseReport()}
        </div>
      );
    } else if (type === 'newAdmissions') {
      return renderNewAdmissionsReport();
    }
    
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card p-4 rounded-lg border animate-pulse">
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-8 bg-muted rounded"></div>
            </div>
          ))}
        </div>
        <div className="bg-card p-6 rounded-lg border animate-pulse">
          <div className="h-6 bg-muted rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card p-6 rounded-lg border">
        <div className="flex items-center gap-2 text-red-600 mb-2">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">Error Loading Report</span>
        </div>
        <p className="text-sm text-muted-foreground">{error}</p>
        <button 
          onClick={fetchStudentReport}
          className="mt-4 btn btn-outline btn-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return renderReport();
};

export default StudentReport;