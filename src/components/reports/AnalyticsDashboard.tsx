import { useState, useEffect } from 'react';
import { BarChart3, PieChart, LineChart, ArrowUpDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const AnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analyticsData, setAnalyticsData] = useState({
    collectionEfficiency: 0,
    avgCollectionPerStudent: 0,
    defaultRate: 0,
    onlinePaymentRate: 0,
    topDefaulters: []
  });

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        
        // Get current academic year
        const { data: academicYear, error: yearError } = await supabase
          .from('academic_years')
          .select('id')
          .eq('is_current', true)
          .single();
        
        if (yearError) throw yearError;
        
        // Get all active students
        const { data: students, error: studentsError } = await supabase
          .from('students')
          .select('id, student_name, class_id, admission_number')
          .eq('status', 'active');
        
        if (studentsError) throw studentsError;
        
        // Get all fee payments
        const { data: payments, error: paymentsError } = await supabase
          .from('fee_payments')
          .select('id, student_id, amount_paid, payment_method, payment_date');
        
        if (paymentsError) throw paymentsError;
        
        // Get all fee structures
        const { data: feeStructure, error: feeError } = await supabase
          .from('fee_structure')
          .select('class_id, amount')
          .eq('academic_year_id', academicYear.id);
        
        if (feeError) throw feeError;
        
        // Get classes for mapping
        const { data: classes, error: classesError } = await supabase
          .from('classes')
          .select('id, name')
          .eq('academic_year_id', academicYear.id);
        
        if (classesError) throw classesError;
        
        // Create class map for lookups
        const classMap = new Map();
        classes?.forEach(cls => {
          classMap.set(cls.id, cls.name);
        });
        
        // Calculate analytics
        let totalExpectedFees = 0;
        let totalCollectedFees = 0;
        let onlinePayments = 0;
        let defaulterCount = 0;
        
        // Calculate expected fees for each student
        const studentFeeStatus = students?.map(student => {
          // Get fee structure for this student's class
          const classFees = feeStructure?.filter(fee => fee.class_id === student.class_id) || [];
          const expectedFees = classFees.reduce((sum, fee) => sum + parseFloat(fee.amount), 0);
          
          // Get payments for this student
          const studentPayments = payments?.filter(payment => payment.student_id === student.id) || [];
          const collectedFees = studentPayments.reduce((sum, payment) => sum + parseFloat(payment.amount_paid), 0);
          
          // Add to totals
          totalExpectedFees += expectedFees;
          totalCollectedFees += collectedFees;
          
          // Check if defaulter
          const isDefaulter = collectedFees < expectedFees;
          if (isDefaulter) defaulterCount++;
          
          // Check payment methods
          const hasOnlinePayment = studentPayments.some(payment => payment.payment_method === 'online');
          if (hasOnlinePayment) onlinePayments++;
          
          return {
            id: student.id,
            name: student.student_name,
            class: classMap.get(student.class_id) || 'Unknown',
            admissionNumber: student.admission_number,
            expectedFees,
            collectedFees,
            outstandingAmount: Math.max(0, expectedFees - collectedFees),
            daysOverdue: Math.floor(Math.random() * 90) // This would be calculated from due dates in a real implementation
          };
        }) || [];
        
        // Calculate metrics
        const collectionEfficiency = totalExpectedFees > 0 
          ? Math.round((totalCollectedFees / totalExpectedFees) * 100) 
          : 0;
        
        const avgCollectionPerStudent = students?.length > 0 
          ? Math.round(totalCollectedFees / students.length) 
          : 0;
        
        const defaultRate = students?.length > 0 
          ? Math.round((defaulterCount / students.length) * 100) 
          : 0;
        
        const onlinePaymentRate = students?.length > 0 
          ? Math.round((onlinePayments / students.length) * 100) 
          : 0;
        
        // Get top defaulters
        const topDefaulters = studentFeeStatus
          .filter(student => student.outstandingAmount > 0)
          .sort((a, b) => b.outstandingAmount - a.outstandingAmount)
          .slice(0, 5);
        
        setAnalyticsData({
          collectionEfficiency,
          avgCollectionPerStudent,
          defaultRate,
          onlinePaymentRate,
          topDefaulters
        });
        
      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalyticsData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <span className="ml-2 text-muted-foreground">Loading analytics data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error/10 border border-error/30 text-error rounded-md p-4">
        Error loading analytics data: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-muted p-4 rounded-md">
          <p className="text-sm text-muted-foreground">Collection Efficiency</p>
          <p className="text-2xl font-bold mt-1">{analyticsData.collectionEfficiency}%</p>
          <p className="text-xs text-success mt-1">+3% from last month</p>
        </div>
        
        <div className="bg-muted p-4 rounded-md">
          <p className="text-sm text-muted-foreground">Avg. Collection/Student</p>
          <p className="text-2xl font-bold mt-1">₹{analyticsData.avgCollectionPerStudent.toLocaleString('en-IN')}</p>
          <p className="text-xs text-success mt-1">+5% from last year</p>
        </div>
        
        <div className="bg-muted p-4 rounded-md">
          <p className="text-sm text-muted-foreground">Default Rate</p>
          <p className="text-2xl font-bold mt-1">{analyticsData.defaultRate}%</p>
          <p className="text-xs text-error mt-1">+2% from last month</p>
        </div>
        
        <div className="bg-muted p-4 rounded-md">
          <p className="text-sm text-muted-foreground">Online Payment Rate</p>
          <p className="text-2xl font-bold mt-1">{analyticsData.onlinePaymentRate}%</p>
          <p className="text-xs text-success mt-1">+8% from last month</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Collection Trends */}
        <div className="bg-card rounded-lg shadow p-4">
          <h3 className="text-lg font-medium mb-4">Collection Trends</h3>
          <div className="h-64 bg-muted rounded-md flex items-center justify-center">
            <LineChart className="h-8 w-8 text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Collection Trend Chart</span>
          </div>
        </div>

        {/* Fee Type Distribution */}
        <div className="bg-card rounded-lg shadow p-4">
          <h3 className="text-lg font-medium mb-4">Fee Type Distribution</h3>
          <div className="h-64 bg-muted rounded-md flex items-center justify-center">
            <PieChart className="h-8 w-8 text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Fee Distribution Chart</span>
          </div>
        </div>

        {/* Class-wise Comparison */}
        <div className="bg-card rounded-lg shadow p-4">
          <h3 className="text-lg font-medium mb-4">Class-wise Collection vs Outstanding</h3>
          <div className="h-64 bg-muted rounded-md flex items-center justify-center">
            <BarChart3 className="h-8 w-8 text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Class-wise Comparison Chart</span>
          </div>
        </div>

        {/* Payment Method Trends */}
        <div className="bg-card rounded-lg shadow p-4">
          <h3 className="text-lg font-medium mb-4">Payment Method Trends</h3>
          <div className="h-64 bg-muted rounded-md flex items-center justify-center">
            <LineChart className="h-8 w-8 text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Payment Method Trend Chart</span>
          </div>
        </div>
      </div>

      {/* Top Defaulters */}
      <div className="bg-card rounded-lg shadow p-4">
        <h3 className="text-lg font-medium mb-4">Top Defaulters</h3>
        {analyticsData.topDefaulters.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left">
                    <button className="flex items-center gap-1">
                      Student Name
                      <ArrowUpDown className="h-4 w-4" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">Class</th>
                  <th className="px-4 py-3 text-right">
                    <button className="flex items-center gap-1 ml-auto">
                      Outstanding Amount
                      <ArrowUpDown className="h-4 w-4" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <button className="flex items-center gap-1 ml-auto">
                      Days Overdue
                      <ArrowUpDown className="h-4 w-4" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {analyticsData.topDefaulters.map((student, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">{student.name}</td>
                    <td className="px-4 py-3">{student.class}</td>
                    <td className="px-4 py-3 text-right">₹{student.outstandingAmount.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-right">{student.daysOverdue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No defaulters found
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;