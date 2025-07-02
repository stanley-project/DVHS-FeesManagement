import { useState, useEffect } from 'react';
import { Search, ArrowRight, Filter, Download, FileText, Edit, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import StudentList from '../components/students/StudentList';
import FeePaymentForm from '../components/fees/FeePaymentForm';
import PaymentReceipt from '../components/fees/PaymentReceipt';
import DailyCollectionReport from '../components/fees/DailyCollectionReport';
import EditPaymentModal from '../components/fees/EditPaymentModal';

const FeeCollection = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showDailyCollection, setShowDailyCollection] = useState(false);
  const [showEditPayment, setShowEditPayment] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [studentPayments, setStudentPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [currentAcademicYearId, setCurrentAcademicYearId] = useState<string | null>(null);
  const [loadingAcademicYear, setLoadingAcademicYear] = useState(true);
  
  useEffect(() => {
    fetchCurrentAcademicYear();
  }, []);

  useEffect(() => {
    // Only fetch students after academic year is loaded and available
    if (!loadingAcademicYear && currentAcademicYearId) {
      fetchStudents();
    } else if (!loadingAcademicYear && !currentAcademicYearId) {
      setError('No active academic year found. Please contact the administrator.');
      setLoading(false);
    }
  }, [searchQuery, loadingAcademicYear, currentAcademicYearId]);

  useEffect(() => {
    // Fetch student payments when a student is selected
    if (selectedStudent !== null && students[selectedStudent]) {
      fetchStudentPayments(students[selectedStudent].id);
    }
  }, [selectedStudent, students]);

  const fetchCurrentAcademicYear = async () => {
    try {
      setLoadingAcademicYear(true);
      
      const { data: currentYear, error: yearError } = await supabase
        .from('academic_years')
        .select('id')
        .eq('is_current', true)
        .maybeSingle();

      if (yearError) {
        console.error('Error fetching current academic year:', yearError);
        setError('Error loading academic year data.');
        return;
      }

      if (currentYear) {
        setCurrentAcademicYearId(currentYear.id);
      } else {
        // If no current year, try to get the latest one
        const { data: latestYear, error: latestError } = await supabase
          .from('academic_years')
          .select('id')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
          
        if (!latestError && latestYear) {
          setCurrentAcademicYearId(latestYear.id);
        } else {
          setCurrentAcademicYearId(null);
        }
      }
    } catch (err) {
      console.error('Error in fetchCurrentAcademicYear:', err);
      setError('Failed to load academic year data.');
    } finally {
      setLoadingAcademicYear(false);
    }
  };

  const fetchStudents = async () => {
    try {
      setError(null);
      setLoading(true);

      // Ensure we have a valid academic year ID before proceeding
      if (!currentAcademicYearId) {
        setError('No active academic year found. Please contact the administrator.');
        setLoading(false);
        return;
      }

      // Get students with their fee status
      let query = supabase
        .from('students')
        .select(`
          id,
          admission_number,
          student_name,
          class_id,
          class:class_id(name),
          registration_type,
          status,
          village_id,
          has_school_bus,
          bus_start_date
        `)
        .eq('status', 'active');

      // Add search filter if query exists
      if (searchQuery) {
        query = query.or(`admission_number.ilike.%${searchQuery}%,student_name.ilike.%${searchQuery}%`);
      }

      const { data: studentsData, error: studentsError } = await query;

      if (studentsError) throw studentsError;

      if (!studentsData || studentsData.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      // Get fee status for each student
      const processedStudents = await Promise.all(studentsData.map(async (student) => {
        try {
          // Get student fee status
          const { data: feeStatus, error: feeError } = await supabase.rpc(
            'get_student_fee_status',
            { 
              p_student_id: student.id,
              p_academic_year_id: currentAcademicYearId
            }
          );

          if (feeError) throw feeError;

          // Determine payment status
          let status = 'pending';
          if (feeStatus.total_pending <= 0) {
            status = 'paid';
          } else if (feeStatus.total_paid > 0) {
            status = 'partial';
          }

          return {
            id: student.id,
            name: student.student_name,
            admissionNumber: student.admission_number,
            class: student.class?.name || '',
            class_id: student.class_id,
            status,
            pending: `₹${feeStatus.total_pending.toLocaleString('en-IN')}`,
            pendingAmount: feeStatus.total_pending, // Raw number for sorting
            totalFees: feeStatus.total_fees,
            totalPaid: feeStatus.total_paid,
            registrationType: student.registration_type,
            has_school_bus: student.has_school_bus,
            village_id: student.village_id,
            bus_start_date: student.bus_start_date
          };
        } catch (err) {
          console.error(`Error processing student ${student.id}:`, err);
          return {
            id: student.id,
            name: student.student_name,
            admissionNumber: student.admission_number,
            class: student.class?.name || '',
            class_id: student.class_id,
            status: 'error',
            pending: 'Error',
            pendingAmount: 0,
            totalFees: 0,
            totalPaid: 0,
            registrationType: student.registration_type,
            has_school_bus: student.has_school_bus,
            village_id: student.village_id,
            bus_start_date: student.bus_start_date
          };
        }
      }));

      // Sort by pending amount (highest first)
      processedStudents.sort((a, b) => b.pendingAmount - a.pendingAmount);

      setStudents(processedStudents);
    } catch (err: any) {
      console.error('Error fetching students:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentPayments = async (studentId: string) => {
    try {
      setLoadingPayments(true);
      
      const { data, error } = await supabase
        .from('fee_payments')
        .select(`
          *,
          manual_payment_allocation(*),
          payment_allocation(*),
          created_by_user:created_by(name)
        `)
        .eq('student_id', studentId)
        .order('payment_date', { ascending: false });
        
      if (error) throw error;
      
      setStudentPayments(data || []);
    } catch (err: any) {
      console.error('Error fetching student payments:', err);
      // Don't set error state to avoid disrupting the main UI
    } finally {
      setLoadingPayments(false);
    }
  };

  const handlePaymentSubmit = async (paymentData: any) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get student details
      const student = students[selectedStudent!];
      
      // Show success message
      toast.success('Payment recorded successfully');
      
      // Get allocation data
      const busAmount = paymentData.manual_payment_allocation?.[0]?.bus_fee_amount || 0;
      const schoolAmount = paymentData.manual_payment_allocation?.[0]?.school_fee_amount || 0;
      
      // Create receipt data from the payment data returned by the form
      const receipt = {
        receiptNumber: paymentData.receipt_number,
        date: new Date(paymentData.payment_date).toLocaleDateString('en-IN'),
        student: {
          name: student.name,
          admissionNumber: student.admissionNumber,
          class: (student.class || '').split('-')[0] || '',
          section: (student.class || '').split('-')[1] || '',
        },
        busAmount: busAmount,
        schoolAmount: schoolAmount,
        total: paymentData.amount_paid,
        paymentMethod: paymentData.payment_method,
        transactionId: paymentData.transaction_id,
        collectedBy: user.name
      };

      setReceiptData(receipt);
      setShowReceipt(true);
      
      // Refresh student list and payments
      await fetchStudents();
      if (selectedStudent !== null) {
        await fetchStudentPayments(student.id);
      }
    } catch (err: any) {
      console.error('Error processing payment:', err);
      toast.error(err.message || 'Failed to process payment. Please try again.');
    }
  };

  const handleEditPayment = (payment: any) => {
    setSelectedPayment(payment);
    setShowEditPayment(true);
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('Are you sure you want to delete this payment? This action cannot be undone.')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('fee_payments')
        .delete()
        .eq('id', paymentId);
        
      if (error) throw error;
      
      toast.success('Payment deleted successfully');
      
      // Refresh student list and payments
      await fetchStudents();
      if (selectedStudent !== null) {
        await fetchStudentPayments(students[selectedStudent].id);
      }
    } catch (err: any) {
      console.error('Error deleting payment:', err);
      toast.error(err.message || 'Failed to delete payment');
    }
  };

  const handleViewReceipt = async (paymentId: string) => {
    try {
      const { data, error } = await supabase
        .from('fee_payments')
        .select(`
          *,
          student:student_id(
            id,
            student_name,
            admission_number,
            class:class_id(name),
            section
          ),
          manual_payment_allocation(*),
          payment_allocation(*),
          created_by_user:created_by(name)
        `)
        .eq('id', paymentId)
        .single();

      if (error) throw error;

      // Get allocation data
      const busAmount = data.manual_payment_allocation?.[0]?.bus_fee_amount || 
                       data.payment_allocation?.[0]?.bus_fee_amount || 
                       data.metadata?.bus_fee_amount || 0;
                       
      const schoolAmount = data.manual_payment_allocation?.[0]?.school_fee_amount || 
                          data.payment_allocation?.[0]?.school_fee_amount || 
                          data.metadata?.school_fee_amount || 0;

      // Format receipt data with defensive checks
      const className = data.student?.class?.name || '';
      const receipt = {
        receiptNumber: data.receipt_number,
        date: new Date(data.payment_date).toLocaleDateString('en-IN'),
        student: {
          name: data.student?.student_name || '',
          admissionNumber: data.student?.admission_number || '',
          class: className.split('-')[0] || '',
          section: data.student?.section || className.split('-')[1] || '',
        },
        busAmount: busAmount,
        schoolAmount: schoolAmount,
        total: data.amount_paid,
        paymentMethod: data.payment_method,
        transactionId: data.transaction_id,
        collectedBy: data.created_by_user?.name || 'System'
      };

      setReceiptData(receipt);
      setShowReceipt(true);
    } catch (err: any) {
      console.error('Error fetching receipt:', err);
      toast.error(err.message || 'Failed to load receipt');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1>Fee Collection</h1>
        <div className="flex gap-2">
          <button
            className="btn btn-outline btn-md inline-flex items-center"
            onClick={() => setShowDailyCollection(true)}
          >
            <FileText className="mr-2 h-4 w-4" />
            Daily Collection
          </button>
          <button className="btn btn-outline btn-md inline-flex items-center">
            <Download className="mr-2 h-4 w-4" />
            Export
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student Search Panel */}
        <div className="lg:col-span-1 bg-card rounded-lg shadow overflow-hidden">
          <div className="bg-primary text-primary-foreground p-4">
            <h2 className="text-xl font-semibold">Search Student</h2>
          </div>
          
          <div className="p-4">
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <input
                type="text"
                placeholder="Search by admission number or name"
                className="input pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Students</h3>
              <button className="btn btn-ghost btn-sm inline-flex items-center text-xs">
                <Filter className="h-3 w-3 mr-1" />
                Filter
              </button>
            </div>

            {error ? (
              <div className="text-center py-4 text-error">
                {error}
              </div>
            ) : loading || loadingAcademicYear ? (
              <div className="text-center py-4 text-muted-foreground">
                Loading students...
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No students found
              </div>
            ) : (
              <StudentList
                students={students}
                selectedStudent={selectedStudent}
                onSelectStudent={setSelectedStudent}
              />
            )}
          </div>
        </div>
        
        {/* Fee Collection Form */}
        <div className="lg:col-span-2 bg-card rounded-lg shadow overflow-hidden">
          <div className="bg-primary text-primary-foreground p-4">
            <h2 className="text-xl font-semibold">Fee Collection Details</h2>
          </div>
          
          {selectedStudent !== null && students[selectedStudent] ? (
            <div className="p-4">
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
                <div>
                  <h3 className="text-lg font-medium">{students[selectedStudent].name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {students[selectedStudent].admissionNumber} | {students[selectedStudent].class}
                  </p>
                </div>
                {students[selectedStudent].status !== 'paid' && (
                  <div className="self-end sm:self-auto">
                    <span className="inline-block px-3 py-1 bg-warning/10 text-warning rounded-full text-sm font-medium">
                      Pending: {students[selectedStudent].pending}
                    </span>
                  </div>
                )}
              </div>
              
              <FeePaymentForm
                onSubmit={handlePaymentSubmit}
                onCancel={() => setSelectedStudent(null)}
                studentId={students[selectedStudent].id}
                registrationType={students[selectedStudent].registrationType}
                academicYearId={currentAcademicYearId || undefined}
              />

              {/* Student Payment History */}
              {studentPayments.length > 0 && (
                <div className="mt-8 pt-6 border-t">
                  <h3 className="text-lg font-medium mb-4">Payment History</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="px-4 py-2 text-left">Receipt No.</th>
                          <th className="px-4 py-2 text-left">Date</th>
                          <th className="px-4 py-2 text-right">Amount</th>
                          <th className="px-4 py-2 text-left">Method</th>
                          <th className="px-4 py-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentPayments.map((payment) => {
                          // Get allocation data
                          const busAmount = payment.manual_payment_allocation?.[0]?.bus_fee_amount || 
                                          payment.payment_allocation?.[0]?.bus_fee_amount || 
                                          payment.metadata?.bus_fee_amount || 0;
                                          
                          const schoolAmount = payment.manual_payment_allocation?.[0]?.school_fee_amount || 
                                              payment.payment_allocation?.[0]?.school_fee_amount || 
                                              payment.metadata?.school_fee_amount || 0;
                          
                          return (
                            <tr key={payment.id} className="border-b hover:bg-muted/50">
                              <td className="px-4 py-2 font-medium">{payment.receipt_number}</td>
                              <td className="px-4 py-2">{new Date(payment.payment_date).toLocaleDateString()}</td>
                              <td className="px-4 py-2 text-right">₹{parseFloat(payment.amount_paid).toLocaleString('en-IN')}</td>
                              <td className="px-4 py-2 capitalize">{payment.payment_method}</td>
                              <td className="px-4 py-2 text-right">
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => handleViewReceipt(payment.id)}
                                    className="p-1 hover:bg-muted rounded-md text-primary"
                                    title="View Receipt"
                                  >
                                    <FileText className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleEditPayment(payment)}
                                    className="p-1 hover:bg-muted rounded-md"
                                    title="Edit Payment"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeletePayment(payment.id)}
                                    className="p-1 hover:bg-muted rounded-md text-error"
                                    title="Delete Payment"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <ArrowRight className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">Select a Student</h3>
              <p className="text-muted-foreground">
                Select a student from the left panel to collect fees
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Receipt Modal */}
      {showReceipt && receiptData && (
        <PaymentReceipt
          receipt={receiptData}
          onClose={() => {
            setShowReceipt(false);
            setReceiptData(null);
          }}
        />
      )}

      {/* Daily Collection Report Modal */}
      {showDailyCollection && (
        <DailyCollectionReport
          onClose={() => setShowDailyCollection(false)}
        />
      )}

      {/* Edit Payment Modal */}
      {showEditPayment && selectedPayment && (
        <EditPaymentModal
          payment={selectedPayment}
          onClose={() => {
            setShowEditPayment(false);
            setSelectedPayment(null);
          }}
          onUpdate={() => {
            // Refresh student list and payments
            fetchStudents();
            if (selectedStudent !== null) {
              fetchStudentPayments(students[selectedStudent].id);
            }
          }}
        />
      )}
    </div>
  );
};

export default FeeCollection;