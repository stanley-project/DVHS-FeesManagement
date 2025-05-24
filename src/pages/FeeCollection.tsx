import { useState, useEffect } from 'react';
import { Search, ArrowRight, Filter, Download, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import StudentList from '../components/students/StudentList';
import FeePaymentForm from '../components/fees/FeePaymentForm';
import PaymentReceipt from '../components/fees/PaymentReceipt';
import DailyCollectionReport from '../components/fees/DailyCollectionReport';

const FeeCollection = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showDailyCollection, setShowDailyCollection] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<any>(null);
  
  useEffect(() => {
    fetchStudents();
  }, [searchQuery]);

  const fetchStudents = async () => {
    try {
      setError(null);
      setLoading(true);

      // Get current academic year
      const { data: currentYear, error: yearError } = await supabase
        .from('academic_years')
        .select('id')
        .eq('is_current', true)
        .single();

      if (yearError) throw yearError;

      // Get students with their fee status
      let query = supabase
        .from('students')
        .select(`
          id,
          admission_number,
          student_name,
          class:class_id(name),
          registration_type,
          status,
          fee_payments(amount_paid)
        `)
        .eq('status', 'active');

      // Add search filter if query exists
      if (searchQuery) {
        query = query.or(`admission_number.ilike.%${searchQuery}%,student_name.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Process students data
      const processedStudents = data.map(student => {
        const totalPaid = student.fee_payments?.reduce((sum: number, payment: any) => 
          sum + (payment.amount_paid || 0), 0) || 0;

        // In a real app, get total fee from fee structure
        const totalFee = 45000; // Mock total fee

        return {
          id: student.id,
          name: student.student_name,
          admissionNumber: student.admission_number,
          class: student.class?.name,
          status: totalPaid >= totalFee ? 'paid' : totalPaid > 0 ? 'partial' : 'pending',
          pending: totalPaid >= totalFee ? '₹0' : `₹${(totalFee - totalPaid).toLocaleString('en-IN')}`,
          registrationType: student.registration_type
        };
      });

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
      // Get student details
      const student = students[selectedStudent!];
      
      // Create receipt data
      const receipt = {
        receiptNumber: paymentData.receipt_number,
        date: new Date().toLocaleDateString('en-IN'),
        student: {
          name: student.name,
          admissionNumber: student.admissionNumber,
          class: student.class?.split('-')[0] || '',
          section: student.class?.split('-')[1] || '',
        },
        payments: [{
          feeType: 'Fee Payment',
          amount: paymentData.amount_paid.toLocaleString('en-IN')
        }],
        total: paymentData.amount_paid.toLocaleString('en-IN'),
        paymentMethod: paymentData.payment_method,
        transactionId: paymentData.transaction_id,
        collectedBy: 'Admin User' // In real app, get from auth context
      };

      setReceiptData(receipt);
      setShowReceipt(true);
      
      // Refresh student list
      await fetchStudents();
    } catch (err: any) {
      console.error('Error processing payment:', err);
      alert('Failed to process payment. Please try again.');
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
                placeholder="Search by ID, name or class"
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