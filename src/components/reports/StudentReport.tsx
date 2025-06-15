import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Download, ArrowUpDown } from 'lucide-react';
import * as XLSX from 'xlsx';

interface StudentReportProps {
  type: string;
  dateRange: {
    start: string;
    end: string;
  };
  selectedClass: string;
}

const StudentReport: React.FC<StudentReportProps> = ({ type, dateRange, selectedClass }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});

  useEffect(() => {
    fetchReportData();
  }, [type, dateRange, selectedClass]);

  const fetchReportData = async () => {
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

      let data = [];
      let summaryData = {};

      switch (type) {
        case 'feeStatus':
          // Get students with their fee status
          let query = supabase
            .from('students')
            .select(`
              id,
              admission_number,
              student_name,
              class:class_id(id, name),
              status
            `);

          // Apply class filter
          if (selectedClass !== 'all') {
            query = query.eq('class_id', selectedClass);
          }

          const { data: students, error: studentsError } = await query;
          if (studentsError) throw studentsError;

          // For each student, calculate fee status
          const studentFeeStatus = await Promise.all(students.map(async (student) => {
            // Get fee structure for this student's class
            const { data: feeStructure, error: feeError } = await supabase
              .from('fee_structure')
              .select('amount')
              .eq('class_id', student.class.id)
              .eq('academic_year_id', academicYear.id);

            if (feeError) throw feeError;

            // Calculate total fees
            const totalFees = feeStructure?.reduce((sum, fee) => 
              sum + parseFloat(fee.amount), 0) || 0;

            // Get payments for this student
            const { data: payments, error: paymentsError } = await supabase
              .from('fee_payments')
              .select('amount_paid')
              .eq('student_id', student.id);

            if (paymentsError) throw paymentsError;

            // Calculate paid amount
            const paidAmount = payments?.reduce((sum, payment) => 
              sum + parseFloat(payment.amount_paid), 0) || 0;

            // Calculate outstanding amount
            const outstandingAmount = Math.max(0, totalFees - paidAmount);

            // Determine status
            let status = 'pending';
            if (paidAmount >= totalFees) {
              status = 'paid';
            } else if (paidAmount > 0) {
              status = 'partial';
            }

            return {
              admissionNumber: student.admission_number,
              studentName: student.student_name,
              class: student.class.name,
              totalFees,
              paidAmount,
              outstandingAmount,
              status
            };
          }));

          data = studentFeeStatus;

          // Calculate summary
          const totalStudents = data.length;
          const paidStudents = data.filter(s => s.status === 'paid').length;
          const partialStudents = data.filter(s => s.status === 'partial').length;
          const pendingStudents = data.filter(s => s.status === 'pending').length;
          const totalFees = data.reduce((sum, s) => sum + s.totalFees, 0);
          const totalPaid = data.reduce((sum, s) => sum + s.paidAmount, 0);
          const totalOutstanding = data.reduce((sum, s) => sum + s.outstandingAmount, 0);

          summaryData = {
            totalStudents,
            paidStudents,
            partialStudents,
            pendingStudents,
            totalFees,
            totalPaid,
            totalOutstanding,
            collectionPercentage: totalFees > 0 ? (totalPaid / totalFees) * 100 : 0
          };
          break;

        case 'classwise':
          // Get classes for current academic year
          const { data: classes, error: classesError } = await supabase
            .from('classes')
            .select('id, name')
            .eq('academic_year_id', academicYear.id)
            .order('name');

          if (classesError) throw classesError;

          // For each class, get student count
          const classData = await Promise.all(classes.map(async (cls) => {
            const { count, error: countError } = await supabase
              .from('students')
              .select('*', { count: 'exact', head: true })
              .eq('class_id', cls.id)
              .eq('status', 'active');

            if (countError) throw countError;

            return {
              className: cls.name,
              studentCount: count || 0
            };
          }));

          data = classData;

          // Calculate summary
          const totalClassCount = data.length;
          const totalStudentCount = data.reduce((sum, c) => sum + c.studentCount, 0);
          const avgStudentsPerClass = totalClassCount > 0 ? Math.round(totalStudentCount / totalClassCount) : 0;
          const maxStudentsClass = data.reduce((max, c) => c.studentCount > max.count ? { name: c.className, count: c.studentCount } : max, { name: '', count: 0 });

          summaryData = {
            totalClasses: totalClassCount,
            totalStudents: totalStudentCount,
            avgStudentsPerClass,
            maxStudentsClass: maxStudentsClass.name,
            maxStudentsCount: maxStudentsClass.count
          };
          break;

        case 'newAdmissions':
          // Get new admissions within date range
          const { data: newAdmissions, error: admissionsError } = await supabase
            .from('students')
            .select(`
              id,
              admission_number,
              student_name,
              gender,
              date_of_birth,
              admission_date,
              class:class_id(name),
              father_name,
              mother_name,
              phone_number,
              village:village_id(name)
            `)
            .eq('registration_type', 'new')
            .gte('admission_date', dateRange.start)
            .lte('admission_date', dateRange.end);

          if (admissionsError) throw admissionsError;

          data = newAdmissions.map(student => ({
            admissionNumber: student.admission_number,
            studentName: student.student_name,
            gender: student.gender,
            dateOfBirth: new Date(student.date_of_birth).toLocaleDateString(),
            admissionDate: new Date(student.admission_date).toLocaleDateString(),
            class: student.class?.name || 'N/A',
            fatherName: student.father_name,
            motherName: student.mother_name,
            phoneNumber: student.phone_number,
            village: student.village?.name || 'N/A'
          }));

          // Calculate summary
          const maleCount = newAdmissions.filter(s => s.gender === 'male').length;
          const femaleCount = newAdmissions.filter(s => s.gender === 'female').length;
          const otherCount = newAdmissions.filter(s => s.gender === 'other').length;

          summaryData = {
            totalAdmissions: data.length,
            maleCount,
            femaleCount,
            otherCount,
            dateRange: `${new Date(dateRange.start).toLocaleDateString()} to ${new Date(dateRange.end).toLocaleDateString()}`
          };
          break;

        default:
          data = [];
          summaryData = {};
      }

      setReportData(data);
      setSummary(summaryData);
    } catch (err) {
      console.error('Error fetching report data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    try {
      let exportData = [];
      let sheetName = '';

      switch (type) {
        case 'feeStatus':
          exportData = reportData.map(student => ({
            'Admission Number': student.admissionNumber,
            'Student Name': student.studentName,
            'Class': student.class,
            'Total Fees': student.totalFees.toLocaleString('en-IN'),
            'Paid Amount': student.paidAmount.toLocaleString('en-IN'),
            'Outstanding': student.outstandingAmount.toLocaleString('en-IN'),
            'Status': student.status.charAt(0).toUpperCase() + student.status.slice(1)
          }));
          sheetName = 'Fee Status Report';
          break;

        case 'classwise':
          exportData = reportData.map(cls => ({
            'Class': cls.className,
            'Student Count': cls.studentCount
          }));
          sheetName = 'Class-wise Student Count';
          break;

        case 'newAdmissions':
          exportData = reportData.map(student => ({
            'Admission Number': student.admissionNumber,
            'Student Name': student.studentName,
            'Gender': student.gender.charAt(0).toUpperCase() + student.gender.slice(1),
            'Date of Birth': student.dateOfBirth,
            'Admission Date': student.admissionDate,
            'Class': student.class,
            'Father Name': student.fatherName,
            'Mother Name': student.motherName,
            'Phone Number': student.phoneNumber,
            'Village': student.village
          }));
          sheetName = 'New Admissions Report';
          break;
      }

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      // Generate filename with date
      const fileName = `${sheetName}_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Save file
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const renderReport = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <span className="ml-2 text-muted-foreground">Loading report data...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-error/10 border border-error/30 text-error rounded-md p-4">
          {error}
        </div>
      );
    }

    if (reportData.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          No data found for the selected criteria
        </div>
      );
    }

    switch (type) {
      case 'feeStatus':
        return (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-muted p-4 rounded-md">
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold mt-1">{summary.totalStudents}</p>
              </div>
              
              <div className="bg-muted p-4 rounded-md">
                <p className="text-sm text-muted-foreground">Collection Rate</p>
                <p className="text-2xl font-bold mt-1">{summary.collectionPercentage.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  ₹{summary.totalPaid.toLocaleString('en-IN')} of ₹{summary.totalFees.toLocaleString('en-IN')}
                </p>
              </div>
              
              <div className="bg-muted p-4 rounded-md">
                <p className="text-sm text-muted-foreground">Outstanding Amount</p>
                <p className="text-2xl font-bold mt-1">₹{summary.totalOutstanding.toLocaleString('en-IN')}</p>
              </div>
              
              <div className="bg-muted p-4 rounded-md">
                <p className="text-sm text-muted-foreground">Status Breakdown</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-3 h-3 rounded-full bg-success"></div>
                  <span className="text-xs">Paid: {summary.paidStudents}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-warning"></div>
                  <span className="text-xs">Partial: {summary.partialStudents}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-error"></div>
                  <span className="text-xs">Pending: {summary.pendingStudents}</span>
                </div>
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

            {/* Fee Status Table */}
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
                  {reportData.map((student, index) => (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium">{student.admissionNumber}</td>
                      <td className="px-4 py-3">{student.studentName}</td>
                      <td className="px-4 py-3">{student.class}</td>
                      <td className="px-4 py-3 text-right">₹{student.totalFees.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right">₹{student.paidAmount.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right">₹{student.outstandingAmount.toLocaleString('en-IN')}</td>
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
              </table>
            </div>
          </div>
        );

      case 'classwise':
        return (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-muted p-4 rounded-md">
                <p className="text-sm text-muted-foreground">Total Classes</p>
                <p className="text-2xl font-bold mt-1">{summary.totalClasses}</p>
              </div>
              
              <div className="bg-muted p-4 rounded-md">
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold mt-1">{summary.totalStudents}</p>
              </div>
              
              <div className="bg-muted p-4 rounded-md">
                <p className="text-sm text-muted-foreground">Avg. Students/Class</p>
                <p className="text-2xl font-bold mt-1">{summary.avgStudentsPerClass}</p>
              </div>
              
              <div className="bg-muted p-4 rounded-md">
                <p className="text-sm text-muted-foreground">Largest Class</p>
                <p className="text-2xl font-bold mt-1">{summary.maxStudentsClass}</p>
                <p className="text-xs text-muted-foreground mt-1">{summary.maxStudentsCount} students</p>
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

            {/* Class-wise Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left">
                      <button className="flex items-center gap-1">
                        Class
                        <ArrowUpDown className="h-4 w-4" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right">
                      <button className="flex items-center gap-1 ml-auto">
                        Student Count
                        <ArrowUpDown className="h-4 w-4" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((cls, index) => (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium">{cls.className}</td>
                      <td className="px-4 py-3 text-right">{cls.studentCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'newAdmissions':
        return (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-muted p-4 rounded-md">
                <p className="text-sm text-muted-foreground">Total New Admissions</p>
                <p className="text-2xl font-bold mt-1">{summary.totalAdmissions}</p>
                <p className="text-xs text-muted-foreground mt-1">{summary.dateRange}</p>
              </div>
              
              <div className="bg-muted p-4 rounded-md">
                <p className="text-sm text-muted-foreground">Male Students</p>
                <p className="text-2xl font-bold mt-1">{summary.maleCount}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.totalAdmissions > 0 ? ((summary.maleCount / summary.totalAdmissions) * 100).toFixed(1) : 0}%
                </p>
              </div>
              
              <div className="bg-muted p-4 rounded-md">
                <p className="text-sm text-muted-foreground">Female Students</p>
                <p className="text-2xl font-bold mt-1">{summary.femaleCount}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.totalAdmissions > 0 ? ((summary.femaleCount / summary.totalAdmissions) * 100).toFixed(1) : 0}%
                </p>
              </div>
              
              <div className="bg-muted p-4 rounded-md">
                <p className="text-sm text-muted-foreground">Other</p>
                <p className="text-2xl font-bold mt-1">{summary.otherCount}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.totalAdmissions > 0 ? ((summary.otherCount / summary.totalAdmissions) * 100).toFixed(1) : 0}%
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

            {/* New Admissions Table */}
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
                    <th className="px-4 py-3 text-left">Gender</th>
                    <th className="px-4 py-3 text-left">Admission Date</th>
                    <th className="px-4 py-3 text-left">Village</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((student, index) => (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium">{student.admissionNumber}</td>
                      <td className="px-4 py-3">{student.studentName}</td>
                      <td className="px-4 py-3">{student.class}</td>
                      <td className="px-4 py-3 capitalize">{student.gender}</td>
                      <td className="px-4 py-3">{student.admissionDate}</td>
                      <td className="px-4 py-3">{student.village}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-12 text-muted-foreground">
            Please select a report type
          </div>
        );
    }
  };

  return (
    <div>
      {renderReport()}
    </div>
  );
};

export default StudentReport;