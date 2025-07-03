import { useState, useEffect, useMemo, useRef, Suspense, lazy } from 'react';
import { Search, ArrowRight, Filter, Download, FileText, Edit, Trash2, Loader2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import debounce from 'lodash/debounce';
import { toast } from 'react-hot-toast';
import { supabase, handleApiError, isAuthError } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Student, PaymentHistoryItem, ReceiptData } from '../types/fee';
import FeePaymentForm from '../components/fees/FeePaymentForm';
import { StudentListSkeleton, FeePaymentFormSkeleton, PaymentHistorySkeleton } from '../components/Skeletons';
import ErrorBoundary from '../components/ErrorBoundary';
import { useCurrentAcademicYear, useAcademicYearRefresher } from '../hooks/useCurrentAcademicYear';

// Lazy load modals for better performance
const PaymentReceipt = lazy(() => import('../components/fees/PaymentReceipt'));
const DailyCollectionReport = lazy(() => import('../components/fees/DailyCollectionReport'));
const EditPaymentModal = lazy(() => import('../components/fees/EditPaymentModal'));

const FeeCollection = () => {
  const { user, handleError } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showDailyCollection, setShowDailyCollection] = useState(false);
  const [showEditPayment, setShowEditPayment] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentHistoryItem | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const queryClient = useQueryClient();
  const parentRef = useRef<HTMLDivElement>(null);
  
  // Use the academic year hook
  const { 
    data: currentAcademicYear, 
    isLoading: loadingAcademicYear, 
    error: academicYearError 
  } = useCurrentAcademicYear();
  
  // Set up automatic refreshing
  useAcademicYearRefresher();
  
  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce((value: string) => {
      setDebouncedSearchQuery(value);
    }, 300),
    []
  );

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    debouncedSearch(e.target.value);
  };

  // Fetch students with React Query
  const { data: students, isLoading: loadingStudents, error: studentsError, refetch: refetchStudents } = useQuery({
    queryKey: ['students', debouncedSearchQuery, currentAcademicYear?.id],
    queryFn: async () => {
      if (!currentAcademicYear?.id) return [];
      
      try {
        // Get students with their fee status
        let query = supabase
          .from('students')
          .select(`
            id,
            admission_number,
            student_name,
            class_id,
            class:class_id(id, name),
            registration_type,
            status,
            village_id,
            has_school_bus,
            bus_start_date
          `)
          .eq('status', 'active');

        // Add search filter if query exists
        if (debouncedSearchQuery) {
          query = query.or(`admission_number.ilike.%${debouncedSearchQuery}%,student_name.ilike.%${debouncedSearchQuery}%`);
        }

        const { data: studentsData, error: studentsError } = await query;

        if (studentsError) {
          if (isAuthError(studentsError)) {
            handleError(studentsError);
            return [];
          }
          throw studentsError;
        }

        if (!studentsData || studentsData.length === 0) {
          return [];
        }

        // Calculate fee status for each student
        const processedStudents = await Promise.all(studentsData.map(async (student) => {
          try {
            // Get student fee status
            const { data: feeStatus, error: feeError } = await supabase.rpc(
              'get_student_fee_status',
              { 
                p_student_id: student.id,
                p_academic_year_id: currentAcademicYear.id
              }
            );

            if (feeError) {
              if (isAuthError(feeError)) {
                handleError(feeError);
                return null;
              }
              throw feeError;
            }

            // Determine payment status
            let status: 'paid' | 'partial' | 'pending' = 'pending';
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
              pendingAmount: feeStatus.total_pending,
              totalFees: feeStatus.total_fees,
              totalPaid: feeStatus.total_paid,
              registrationType: student.registration_type,
              has_school_bus: student.has_school_bus,
              village_id: student.village_id,
              bus_start_date: student.bus_start_date
            } as Student;
          } catch (err) {
            console.error(`Error processing student ${student.id}:`, err);
            
            // Don't throw here, just return a placeholder with error status
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
            } as Student;
          }
        }));

        // Filter out null values (from auth errors)
        const validStudents = processedStudents.filter(s => s !== null) as Student[];

        // Sort by pending amount (highest first)
        validStudents.sort((a, b) => b.pendingAmount - a.pendingAmount);

        return validStudents;
      } catch (err) {
        console.error('Error fetching students:', err);
        handleApiError(err, () => refetchStudents());
        throw err;
      }
    },
    enabled: !!currentAcademicYear?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on auth errors, but retry up to 3 times for other errors
      if (isAuthError(error)) return false;
      return failureCount < 3;
    }
  });

  // Fetch student payments
  const { data: studentPayments, isLoading: loadingPayments, refetch: refetchPayments } = useQuery({
    queryKey: ['payments', selectedStudentId],
    queryFn: async () => {
      if (!selectedStudentId) return [];
      
      try {
        const { data, error } = await supabase
          .from('fee_payments')
          .select(`
            *,
            manual_payment_allocation(*),
            payment_allocation(*),
            created_by_user:created_by(name)
          `)
          .eq('student_id', selectedStudentId)
          .order('payment_date', { ascending: false });
          
        if (error) {
          if (isAuthError(error)) {
            handleError(error);
            return [];
          }
          throw error;
        }
        
        return data as PaymentHistoryItem[];
      } catch (err) {
        console.error('Error fetching student payments:', err);
        handleApiError(err, () => refetchPayments());
        throw err;
      }
    },
    enabled: !!selectedStudentId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on auth errors, but retry up to 3 times for other errors
      if (isAuthError(error)) return false;
      return failureCount < 3;
    }
  });

  // Virtual list setup
  const virtualizer = useVirtualizer({
    count: students?.length ?? 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  });

  const selectedStudent = useMemo(() => {
    if (!selectedStudentId || !students) return null;
    return students.find(s => s.id === selectedStudentId) || null;
  }, [selectedStudentId, students]);

  const handlePaymentSubmit = async (paymentData: any) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

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
          name: selectedStudent?.name || '',
          admissionNumber: selectedStudent?.admissionNumber || '',
          class: (selectedStudent?.class || '').split('-')[0] || '',
          section: (selectedStudent?.class || '').split('-')[1] || '',
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
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['payments', selectedStudentId] });
    } catch (err: any) {
      console.error('Error processing payment:', err);
      handleApiError(err);
    }
  };

  const handleEditPayment = (payment: PaymentHistoryItem) => {
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
        
      if (error) {
        if (isAuthError(error)) {
          handleError(error);
          return;
        }
        throw error;
      }
      
      toast.success('Payment deleted successfully');
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['payments', selectedStudentId] });
    } catch (err: any) {
      console.error('Error deleting payment:', err);
      handleApiError(err);
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

      if (error) {
        if (isAuthError(error)) {
          handleError(error);
          return;
        }
        throw error;
      }

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
      handleApiError(err);
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
                className="input pl-10 w-full"
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Students</h3>
              <button className="btn btn-ghost btn-sm inline-flex items-center text-xs">
                <Filter className="h-3 w-3 mr-1" />
                Filter
              </button>
            </div>

            <ErrorBoundary onError={(error) => handleApiError(error, () => refetchStudents())}>
              {loadingAcademicYear ? (
                <div className="text-center py-4 text-muted-foreground">
                  Loading academic year...
                </div>
              ) : academicYearError ? (
                <div className="text-center py-4 text-error">
                  No active academic year found. Please contact the administrator.
                </div>
              ) : loadingStudents ? (
                <StudentListSkeleton />
              ) : studentsError ? (
                <div className="text-center py-4 text-error">
                  Error loading students. Please try again.
                  <button 
                    onClick={() => refetchStudents()}
                    className="block mx-auto mt-2 text-primary underline"
                  >
                    Retry
                  </button>
                </div>
              ) : students && students.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No students found
                </div>
              ) : (
                <div 
                  ref={parentRef} 
                  className="h-[calc(100vh-300px)] min-h-[400px] overflow-y-auto pr-1 custom-scrollbar"
                >
                  <div
                    style={{
                      height: `${virtualizer.getTotalSize()}px`,
                      width: '100%',
                      position: 'relative',
                    }}
                  >
                    {virtualizer.getVirtualItems().map((virtualRow) => {
                      const student = students?.[virtualRow.index];
                      if (!student) return null;

                      return (
                        <div
                          key={student.id}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: `${virtualRow.size}px`,
                            transform: `translateY(${virtualRow.start}px)`,
                          }}
                          className={`py-3 px-2 hover:bg-muted rounded-md cursor-pointer transition-colors ${
                            selectedStudentId === student.id ? 'bg-muted' : ''
                          }`}
                          onClick={() => setSelectedStudentId(student.id)}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{student.name}</p>
                              <p className="text-xs text-muted-foreground">{student.admissionNumber} | {student.class}</p>
                            </div>
                            <ArrowRight className={`h-4 w-4 transition-opacity ${selectedStudentId === student.id ? 'opacity-100 text-primary' : 'opacity-0'}`} />
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
                              <p className="text-xs text-muted-foreground">Pending: {student.pending}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </ErrorBoundary>
          </div>
        </div>
        
        {/* Fee Collection Form */}
        <div className="lg:col-span-2 bg-card rounded-lg shadow overflow-hidden">
          <div className="bg-primary text-primary-foreground p-4">
            <h2 className="text-xl font-semibold">Fee Collection Details</h2>
          </div>
          
          <ErrorBoundary onError={(error) => handleApiError(error)}>
            {selectedStudentId && selectedStudent ? (
              <div className="p-4">
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
                  <div>
                    <h3 className="text-lg font-medium">{selectedStudent.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedStudent.admissionNumber} | {selectedStudent.class}
                    </p>
                  </div>
                  {selectedStudent.status !== 'paid' && (
                    <div className="self-end sm:self-auto">
                      <span className="inline-block px-3 py-1 bg-warning/10 text-warning rounded-full text-sm font-medium">
                        Pending: {selectedStudent.pending}
                      </span>
                    </div>
                  )}
                </div>
                
                <FeePaymentForm
                  onSubmit={handlePaymentSubmit}
                  onCancel={() => setSelectedStudentId(null)}
                  studentId={selectedStudent.id}
                  registrationType={selectedStudent.registrationType}
                  academicYearId={currentAcademicYear?.id}
                />

                {/* Student Payment History */}
                {loadingPayments ? (
                  <PaymentHistorySkeleton />
                ) : studentPayments && studentPayments.length > 0 ? (
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
                                <td className="px-4 py-2 text-right">₹{parseFloat(payment.amount_paid.toString()).toLocaleString('en-IN')}</td>
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
                ) : null}
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
          </ErrorBoundary>
        </div>
      </div>

      {/* Payment Receipt Modal */}
      {showReceipt && receiptData && (
        <Suspense fallback={<div className="fixed inset-0 bg-background/80 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>}>
          <PaymentReceipt
            receipt={receiptData}
            onClose={() => {
              setShowReceipt(false);
              setReceiptData(null);
            }}
          />
        </Suspense>
      )}

      {/* Daily Collection Report Modal */}
      {showDailyCollection && (
        <Suspense fallback={<div className="fixed inset-0 bg-background/80 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>}>
          <DailyCollectionReport
            onClose={() => setShowDailyCollection(false)}
          />
        </Suspense>
      )}

      {/* Edit Payment Modal */}
      {showEditPayment && selectedPayment && (
        <Suspense fallback={<div className="fixed inset-0 bg-background/80 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>}>
          <EditPaymentModal
            payment={selectedPayment}
            onClose={() => {
              setShowEditPayment(false);
              setSelectedPayment(null);
            }}
            onUpdate={() => {
              // Invalidate queries to refresh data
              queryClient.invalidateQueries({ queryKey: ['students'] });
              queryClient.invalidateQueries({ queryKey: ['payments', selectedStudentId] });
            }}
          />
        </Suspense>
      )}
    </div>
  );
};

export default FeeCollection;