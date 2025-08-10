import { useState, useEffect } from 'react';
import { Search, CircleDollarSign, Filter, ArrowRight, FileText, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useFeeCalculations } from '../hooks/useFeeCalculations';
import * as XLSX from 'xlsx';

const StudentFeeStatus = () => {
  const { user } = useAuth();
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teacherClass, setTeacherClass] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [feeHistory, setFeeHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [feeStructure, setFeeStructure] = useState<any[]>([]);
  
  const { calculateStudentFeeStatus } = useFeeCalculations();

  // Fetch teacher's assigned class
  useEffect(() => {
    const fetchTeacherClass = async () => {
      if (!user || user.role !== 'teacher') return;

      try {
        // Get current academic year
        const { data: academicYear, error: yearError } = await supabase
          .from('academic_years')
          .select('id')
          .eq('is_current', true)
          .single();
        
        if (yearError) throw yearError;
        
        const { data, error } = await supabase
          .from('classes')
          .select('id, name')
          .eq('teacher_id', user.id)
          .eq('academic_year_id', academicYear.id)
          .single();

        if (error) {
          if (error.message.includes('No rows found')) {
            setTeacherClass('No Class Assigned');
            setLoading(false);
            return;
          }
          throw error;
        }
        
        setTeacherClass(data.name);
        
        // Fetch fee structure for this class
        const { data: feeData, error: feeError } = await supabase
          .from('fee_structure')
          .select(`
            id,
            amount,
            fee_type:fee_type_id(name)
          `)
          .eq('class_id', data.id)
          .eq('academic_year_id', academicYear.id);
        
        if (feeError) throw feeError;
        
        setFeeStructure(feeData || []);
      } catch (err) {
        console.error('Error fetching teacher class:', err);
        setError(err.message);
      }
    };

    fetchTeacherClass();
  }, [user]);

  // Fetch students in teacher's class
  useEffect(() => {
    const fetchStudents = async () => {
      if (!teacherClass || teacherClass === 'No Class Assigned') {
        setLoading(false);
        return;
      }

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

        // Get class ID
        const { data: classData, error: classError } = await supabase
          .from('classes')
          .select('id')
          .eq('name', teacherClass)
          .eq('academic_year_id', academicYear.id)
          .single();

        if (classError) throw classError;

        // Get students in class
        let query = supabase
          .from('students')
          .select(`
            id,
            admission_number,
            student_name,
            class_id,
            village_id,
            has_school_bus,
            registration_type
          `)
          .eq('class_id', classData.id)
          .eq('status', 'active');

        // Apply search filter if query exists
        if (searchQuery) {
          query = query.or(`admission_number.ilike.%${searchQuery}%,student_name.ilike.%${searchQuery}%`);
        }

        const { data: studentsData, error: studentsError } = await query;

        if (studentsError) throw studentsError;

        // Calculate fee status for each student
        const studentsWithFeeStatus = await Promise.all(
          studentsData.map(async (student) => {
            const feeStatus = await calculateStudentFeeStatus(student.id);
            return {
              ...student,
              id: student.id,
              name: student.student_name,
              admissionNumber: student.admission_number,
              totalFee: feeStatus?.total_fees || 0,
              paid: feeStatus?.total_paid || 0,
              pending: feeStatus?.outstanding || 0,
              status: feeStatus?.status || 'pending'
            };
          })
        );

        // Sort by status (pending first, then partial, then paid)
        studentsWithFeeStatus.sort((a, b) => {
          const statusOrder = { pending: 0, partial: 1, paid: 2 };
          return statusOrder[a.status] - statusOrder[b.status];
        });

        setStudents(studentsWithFeeStatus);
      } catch (err: any) {
        console.error('Error fetching students:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [teacherClass, searchQuery, calculateStudentFeeStatus]);

  // Fetch fee payment history when student is selected
  useEffect(() => {
    const fetchFeeHistory = async () => {
      if (selectedStudent === null) return;

      try {
        setLoadingHistory(true);
        const studentId = students[selectedStudent].id;

        const { data, error } = await supabase
          .from('fee_payments')
          .select(`
            id,
            receipt_number,
            amount_paid,
            payment_date,
            payment_method,
            payment_allocation(
              bus_fee_amount,
              school_fee_amount
            )
          `)
          .eq('student_id', studentId)
          .order('payment_date', { ascending: false });

        if (error) throw error;

        // Process payment history
        const processedHistory = data.map(payment => {
          const busAmount = payment.payment_allocation?.[0]?.bus_fee_amount || 0;
          const schoolAmount = payment.payment_allocation?.[0]?.school_fee_amount || 0;
          
          return {
            id: payment.receipt_number,
            type: busAmount > 0 && schoolAmount > 0 
              ? 'Bus & School Fees' 
              : busAmount > 0 
                ? 'Bus Fee' 
                : 'School Fee',
            amount: `₹${parseFloat(payment.amount_paid).toLocaleString('en-IN')}`,
            date: new Date(payment.payment_date).toLocaleDateString(),
            status: 'Paid',
            details: {
              busAmount: parseFloat(busAmount),
              schoolAmount: parseFloat(schoolAmount)
            }
          };
        });

        setFeeHistory(processedHistory);
      } catch (err: any) {
        console.error('Error fetching fee history:', err);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchFeeHistory();
  }, [selectedStudent, students]);

  const handleExport = () => {
    try {
      // Prepare data for export
      const exportData = students.map(student => ({
        'Admission Number': student.admissionNumber,
        'Student Name': student.name,
        'Total Fees': `₹${student.totalFee.toLocaleString('en-IN')}`,
        'Paid Amount': `₹${student.paid.toLocaleString('en-IN')}`,
        'Pending Amount': `₹${student.pending.toLocaleString('en-IN')}`,
        'Status': student.status.charAt(0).toUpperCase() + student.status.slice(1)
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Class Fee Status');

      // Generate filename with class name
      const fileName = `${teacherClass}_Fee_Status.xlsx`;

      // Save file
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Export error:', error);
    }
  };
  
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1>Student Fee Status</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Class:</span>
          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
            {teacherClass || 'Loading...'}
          </span>
          <button 
            className="btn btn-outline btn-sm ml-2"
            onClick={handleExport}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student List Panel */}
        <div className="lg:col-span-1 bg-card rounded-lg shadow overflow-hidden">
          <div className="bg-primary text-primary-foreground p-4">
            <h2 className="text-xl font-semibold">Students</h2>
          </div>
          
          <div className="p-4">
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <input
                type="text"
                placeholder="Search by name or ID"
                className="input pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Your Class: {teacherClass || 'Loading...'}</h3>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-error"></span>
                  <span className="text-xs">{students.filter(s => s.status === 'pending').length}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-warning"></span>
                  <span className="text-xs">{students.filter(s => s.status === 'partial').length}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-success"></span>
                  <span className="text-xs">{students.filter(s => s.status === 'paid').length}</span>
                </div>
              </div>
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                <span className="ml-2 text-muted-foreground">Loading students...</span>
              </div>
            ) : error ? (
              <div className="text-center py-4 text-error">
                {error}
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No students found
              </div>
            ) : (
              <div className="divide-y">
                {students.map((student, index) => (
                  <div
                    key={index}
                    className={`py-3 px-2 hover:bg-muted rounded-md cursor-pointer transition-colors ${selectedStudent === index ? 'bg-muted' : ''}`}
                    onClick={() => setSelectedStudent(index)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-xs text-muted-foreground">{student.admissionNumber}</p>
                      </div>
                      <ArrowRight className={`h-4 w-4 transition-opacity ${selectedStudent === index ? 'opacity-100 text-primary' : 'opacity-0'}`} />
                    </div>
                    <div className="mt-1 flex justify-between items-center">
                      <div className="flex items-center">
                        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                          student.status === 'paid' ? 'bg-success' : 
                          student.status === 'partial' ? 'bg-warning' : 
                          'bg-error'
                        }`}></span>
                        <span className="text-xs capitalize">{student.status}</span>
                      </div>
                      {student.status !== 'paid' && (
                        <p className="text-xs text-muted-foreground">Pending: ₹{student.pending.toLocaleString('en-IN')}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Fee Status Details Panel */}
        <div className="lg:col-span-2 bg-card rounded-lg shadow overflow-hidden">
          <div className="bg-primary text-primary-foreground p-4">
            <h2 className="text-xl font-semibold">Fee Status Details</h2>
          </div>
          
          {selectedStudent !== null ? (
            <div className="p-4">
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
                <div>
                  <h3 className="text-lg font-medium">{students[selectedStudent].name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {students[selectedStudent].admissionNumber} | Class {teacherClass}
                  </p>
                </div>
                <div className="self-end sm:self-auto">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    students[selectedStudent].status === 'paid' ? 'bg-success/10 text-success' : 
                    students[selectedStudent].status === 'partial' ? 'bg-warning/10 text-warning' : 
                    'bg-error/10 text-error'
                  }`}>
                    {students[selectedStudent].status === 'paid' ? 'Fully Paid' : 
                      students[selectedStudent].status === 'partial' ? 'Partially Paid' : 
                      'Payment Pending'}
                  </span>
                </div>
              </div>
              
              {/* Fee Summary */}
              <div className="mb-6">
                <h4 className="text-sm font-medium mb-3">Fee Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-xs text-muted-foreground">Total Fee</p>
                    <p className="text-lg font-semibold">₹{students[selectedStudent].totalFee.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-xs text-muted-foreground">Paid Amount</p>
                    <p className="text-lg font-semibold text-success">₹{students[selectedStudent].paid.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-xs text-muted-foreground">Pending Amount</p>
                    <p className={`text-lg font-semibold ${students[selectedStudent].status !== 'paid' ? 'text-error' : ''}`}>
                      ₹{students[selectedStudent].pending.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Fee Payment History */}
              <div>
                <h4 className="text-sm font-medium mb-3">Fee Payment History</h4>
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    <span className="ml-2 text-muted-foreground">Loading payment history...</span>
                  </div>
                ) : feeHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No payment history found for this student.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Receipt ID</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Fee Type</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Amount</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Date</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Receipt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {feeHistory.map((fee, index) => (
                          <tr key={index} className="border-b hover:bg-muted/50">
                            <td className="px-3 py-2 font-medium">{fee.id}</td>
                            <td className="px-3 py-2">{fee.type}</td>
                            <td className="px-3 py-2">{fee.amount}</td>
                            <td className="px-3 py-2">{fee.date}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                fee.status === 'Paid' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                              }`}>
                                {fee.status}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              {fee.status === 'Paid' && (
                                <button className="btn btn-ghost btn-sm p-0 text-primary hover:text-primary/80">
                                  <FileText className="h-4 w-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              
              {/* Fee Structure */}
              <div className="mt-6 p-4 bg-muted rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <CircleDollarSign className="h-5 w-5 text-muted-foreground" />
                  <h4 className="text-sm font-medium">Fee Structure ({teacherClass})</h4>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {feeStructure.length > 0 ? (
                      feeStructure.map((fee, index) => (
                        <tr key={index}>
                          <td className="py-1 text-muted-foreground">{fee.fee_type?.name || 'Fee'}</td>
                          <td className="py-1 text-right">₹{parseFloat(fee.amount).toLocaleString('en-IN')}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className="py-1 text-center text-muted-foreground">
                          No fee structure defined
                        </td>
                      </tr>
                    )}
                    {feeStructure.length > 0 && (
                      <>
                        <tr className="border-t">
                          <td className="py-1 font-medium">Total Fee</td>
                          <td className="py-1 text-right font-medium">
                            ₹{feeStructure.reduce((sum, fee) => sum + parseFloat(fee.amount), 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                        {students[selectedStudent].has_school_bus && (
                          <tr className="border-t">
                            <td className="py-1 font-medium">Bus Fee (Annual)</td>
                            <td className="py-1 text-right font-medium">
                              ₹{(students[selectedStudent].totalFee - feeStructure.reduce((sum, fee) => sum + parseFloat(fee.amount), 0)).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        )}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <ArrowRight className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">Select a Student</h3>
              <p className="text-muted-foreground">
                Select a student from the left panel to view fee details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentFeeStatus;