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

  // Helper function to calculate months between two dates (inclusive of start month)
  const calculateMonthsBetween = (startDate: Date, endDate: Date): number => {
    return (
      (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      (endDate.getMonth() - startDate.getMonth()) +
      (endDate.getDate() >= startDate.getDate() ? 0 : -1) +
      1 // Add 1 to include the start month
    );
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

      // Get fee payments for all students
      const { data: payments, error: paymentsError } = await supabase
        .from('fee_payments')
        .select(`
          id,
          amount_paid,
          payment_date,
          student_id,
          payment_allocation (
            bus_fee_amount,
            school_fee_amount
          )
        `)
        .eq('academic_year_id', currentAcademicYearId);

      if (paymentsError) throw paymentsError;

      // Get academic year start date
      const { data: academicYearData, error: academicYearError } = await supabase
        .from('academic_years')
        .select('start_date')
        .eq('id', currentAcademicYearId)
        .single();

      if (academicYearError) throw academicYearError;
        
      const academicYearStartDate = new Date(academicYearData.start_date);
      const currentDate = new Date();
      
      // Calculate months passed for school fees
      const monthsPassedSchool = calculateMonthsBetween(academicYearStartDate, currentDate);

      // Get fee structure for current academic year
      const { data: feeStructure, error: feeError } = await supabase
        .from('fee_structure')
        .select(`
          class_id,
          amount,
          is_recurring_monthly,
          fee_type:fee_type_id(category)
        `)
        .eq('academic_year_id', currentAcademicYearId);

      if (feeError) throw feeError;

      // Get bus fees
      const { data: busFees, error: busError } = await supabase
        .from('bus_fee_structure')
        .select(`
          village_id,
          fee_amount
        `)
        .eq('academic_year_id', currentAcademicYearId)
        .eq('is_active', true);

      if (busError) throw busError;

      // Process students data
      const processedStudents = studentsData.map(student => {
        // Calculate total fees
        let totalSchoolFees = 0;
        let totalBusFees = 0;
        
        // Add school fees - Use student.class_id directly
        const classFees = feeStructure?.filter(fee => 
          fee.class_id === student.class_id && 
          fee.fee_type?.category === 'school'
        ) || [];
        
        classFees.forEach(fee => {
          const feeAmount = parseFloat(fee.amount);
          if (fee.is_recurring_monthly) {
            // Monthly fee
            totalSchoolFees += feeAmount * monthsPassedSchool;
          } else {
            // One-time fee
            totalSchoolFees += feeAmount;
          }
        });
        
        // Add bus fees if applicable
        if (student.has_school_bus && student.village_id) {
          const villageBusFee = busFees?.find(fee => fee.village_id === student.village_id);
          if (villageBusFee) {
            // Use bus_start_date if available, otherwise use academic year start date
            const busStartDate = student.bus_start_date 
              ? new Date(student.bus_start_date) 
              : academicYearStartDate;
              
            // Calculate months passed for bus fees
            const monthsPassedBus = calculateMonthsBetween(busStartDate, currentDate);
            
            const monthlyBusFee = parseFloat(villageBusFee.fee_amount);
            totalBusFees = monthlyBusFee * monthsPassedBus;
          }
        }
        
        const totalFees = totalSchoolFees + totalBusFees;
        
        // Calculate paid amount
        const studentPayments = payments?.filter(payment => payment.student_id === student.id) || [];
        let paidBusFees = 0;
        let paidSchoolFees = 0;
        
        studentPayments.forEach(payment => {
          if (payment.payment_allocation && payment.payment_allocation.length > 0) {
            // Use allocation if available
            const allocation = payment.payment_allocation[0];
            paidBusFees += parseFloat(allocation.bus_fee_amount || 0);
            paidSchoolFees += parseFloat(allocation.school_fee_amount || 0);
          } else {
            // Fallback to total payment amount
            paidSchoolFees += parseFloat(payment.amount_paid || 0);
          }
        });
        
        const totalPaid = paidBusFees + paidSchoolFees;
        
        // Calculate pending amount
        const pendingBusFees = Math.max(0, totalBusFees - paidBusFees);
        const pendingSchoolFees = Math.max(0, totalSchoolFees - paidSchoolFees);
        const pendingAmount = pendingBusFees + pendingSchoolFees;
        
        // Determine payment status
        let status = 'pending';
        if (totalPaid >= totalFees) {
          status = 'paid';
        } else if (totalPaid > 0) {
          status = 'partial';
        }
        
        // Get last payment date
        let lastPaymentDate = null;
        if (studentPayments.length > 0) {
          const sortedPayments = [...studentPayments].sort((a, b) => 
            new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
          );
          lastPaymentDate = sortedPayments[0].payment_date;
        }

        return {
          id: student.id,
          name: student.student_name,
          admissionNumber: student.admission_number,
          class: student.class?.name || '',
          class_id: student.class_id,
          status,
          pending: `₹${pendingAmount.toLocaleString('en-IN')}`,
          pendingAmount, // Raw number for sorting
          totalFees,
          totalPaid,
          lastPaymentDate,
          registrationType: student.registration_type,
          has_school_bus: student.has_school_bus,
          village_id: student.village_id,
          bus_start_date: student.bus_start_date
        };
      });

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
        busAmount: paymentData.payment_allocation?.[0]?.bus_fee_amount || 0,
        schoolAmount: paymentData.payment_allocation?.[0]?.school_fee_amount || 0,
        total: paymentData.amount_paid,
        paymentMethod: paymentData.payment_method,
        transactionId: paymentData.transaction_id,
        collectedBy: user.name,
        splitType: paymentData.metadata?.split_type || 'standard',
        paymentPeriod: paymentData.metadata?.payment_period || 'current',
        paymentMonths: paymentData.metadata?.payment_months || 1
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
          payment_allocation(*),
          created_by_user:created_by(name)
        `)
        .eq('id', paymentId)
        .single();

      if (error) throw error;

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
        busAmount: data.payment_allocation?.[0]?.bus_fee_amount || 0,
        schoolAmount: data.payment_allocation?.[0]?.school_fee_amount || 0,
        total: data.amount_paid,
        paymentMethod: data.payment_method,
        transactionId: data.transaction_id,
        collectedBy: data.created_by_user?.name || 'System',
        splitType: data.metadata?.split_type || 'standard',
        paymentPeriod: data.metadata?.payment_period || 'current',
        paymentMonths: data.metadata?.payment_months || 1
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
          
          {selectedStudent !== null ? (
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
                          <th className="px-4 py-2 text-left">Split Type</th>
                          <th className="px-4 py-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentPayments.map((payment) => (
                          <tr key={payment.id} className="border-b hover:bg-muted/50">
                            <td className="px-4 py-2 font-medium">{payment.receipt_number}</td>
                            <td className="px-4 py-2">{new Date(payment.payment_date).toLocaleDateString()}</td>
                            <td className="px-4 py-2 text-right">₹{parseFloat(payment.amount_paid).toLocaleString('en-IN')}</td>
                            <td className="px-4 py-2 capitalize">{payment.payment_method}</td>
                            <td className="px-4 py-2 capitalize">{payment.metadata?.split_type || 'standard'}</td>
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
                        ))}
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