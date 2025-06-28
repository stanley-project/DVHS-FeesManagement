import { useState, useEffect } from 'react';
import { Search, ArrowRight, Filter, Download, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import StudentList from '../components/students/StudentList';
import FeePaymentForm from '../components/fees/FeePaymentForm';
import PaymentReceipt from '../components/fees/PaymentReceipt';
import DailyCollectionReport from '../components/fees/DailyCollectionReport';

const FeeCollection = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showDailyCollection, setShowDailyCollection] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [currentAcademicYearId, setCurrentAcademicYearId] = useState<string | null>(null);
  const [loadingAcademicYear, setLoadingAcademicYear] = useState(true);
  
  useEffect(() => {
    fetchCurrentAcademicYear();
    fetchStudents();
  }, [searchQuery]);

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
        }
      }
    } catch (err) {
      console.error('Error in fetchCurrentAcademicYear:', err);
    } finally {
      setLoadingAcademicYear(false);
    }
  };

  const fetchStudents = async () => {
    try {
      setError(null);
      setLoading(true);

      // Get current academic year with proper error handling
      const { data: currentYear, error: yearError } = await supabase
        .from('academic_years')
        .select('id')
        .eq('is_current', true)
        .limit(1)
        .single();

      if (yearError) {
        if (yearError.message.includes('JSON object requested, multiple (or no) rows returned')) {
          setError('No active academic year found. Please contact the administrator.');
          setLoading(false);
          return;
        }
        throw yearError;
      }

      if (!currentYear) {
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
          has_school_bus
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

      // Get fee payments for all students - Fixed the select parameter
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
        `);

      if (paymentsError) throw paymentsError;

      // Get fee structure for current academic year
      const { data: feeStructure, error: feeError } = await supabase
        .from('fee_structure')
        .select(`
          class_id,
          amount
        `)
        .eq('academic_year_id', currentYear.id);

      if (feeError) throw feeError;

      // Get bus fees
      const { data: busFees, error: busError } = await supabase
        .from('bus_fee_structure')
        .select(`
          village_id,
          fee_amount
        `)
        .eq('academic_year_id', currentYear.id)
        .eq('is_active', true);

      if (busError) throw busError;

      // Process students data
      const processedStudents = studentsData.map(student => {
        // Calculate total fees
        let totalFees = 0;
        
        // Add school fees - Use student.class_id directly
        const classFees = feeStructure?.filter(fee => fee.class_id === student.class_id) || [];
        const totalSchoolFees = classFees.reduce((sum, fee) => sum + parseFloat(fee.amount), 0);
        totalFees += totalSchoolFees;
        
        // Add bus fees if applicable
        let busFee = 0;
        if (student.has_school_bus && student.village_id) {
          const villageBusFee = busFees?.find(fee => fee.village_id === student.village_id);
          if (villageBusFee) {
            busFee = parseFloat(villageBusFee.fee_amount);
            totalFees += busFee;
          }
        }
        
        // Calculate paid amount
        const studentPayments = payments?.filter(payment => payment.student_id === student.id) || [];
        let totalPaid = 0;
        
        studentPayments.forEach(payment => {
          if (payment.payment_allocation && payment.payment_allocation.length > 0) {
            // Use allocation if available
            const allocation = payment.payment_allocation[0];
            totalPaid += parseFloat(allocation.bus_fee_amount || 0) + parseFloat(allocation.school_fee_amount || 0);
          } else {
            // Fallback to total payment amount
            totalPaid += parseFloat(payment.amount_paid || 0);
          }
        });
        
        // Calculate pending amount
        const pendingAmount = Math.max(0, totalFees - totalPaid);
        
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
          class: student.class?.name,
          class_id: student.class_id, // Use class_id directly
          status,
          pending: `₹${pendingAmount.toLocaleString('en-IN')}`,
          pendingAmount, // Raw number for sorting
          totalFees,
          totalPaid,
          lastPaymentDate,
          registrationType: student.registration_type,
          has_school_bus: student.has_school_bus,
          village_id: student.village_id
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
          class: student.class?.split('-')[0] || '',
          section: student.class?.split('-')[1] || '',
        },
        busAmount: paymentData.payment_allocation?.[0]?.bus_fee_amount || 0,
        schoolAmount: paymentData.payment_allocation?.[0]?.school_fee_amount || 0,
        total: paymentData.amount_paid,
        paymentMethod: paymentData.payment_method,
        transactionId: paymentData.transaction_id,
        collectedBy: user.name
      };

      setReceiptData(receipt);
      setShowReceipt(true);
      
      // Refresh student list
      await fetchStudents();
    } catch (err: any) {
      console.error('Error processing payment:', err);
      toast.error(err.message || 'Failed to process payment. Please try again.');
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
            ) : loading ? (
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
    </div>
  );
};

export default FeeCollection;