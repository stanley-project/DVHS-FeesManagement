import { useState, useEffect } from 'react';
import { BarChart3, Users, CircleDollarSign, School } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import SearchInput from '../../components/shared/SearchInput';
import StatCard from '../../components/dashboard/StatCard';
import QuickAccess from '../../components/dashboard/QuickAccess';
import DefaultersTable from '../../components/dashboard/DefaultersTable';
import { supabase } from '../../lib/supabase';

const AdminDashboard = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dashboardStats, setDashboardStats] = useState({
    yearCollection: 0,
    monthCollection: 0,
    dailyCollection: 0,
    activeStudents: 0,
    yearGrowth: 0,
    monthGrowth: 0,
    dailyGrowth: 0,
    studentGrowth: 0
  });
  const [defaultersData, setDefaultersData] = useState([]);
  const [currentAcademicYear, setCurrentAcademicYear] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch dashboard statistics
  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        
        // Get current academic year
        const { data: academicYear, error: yearError } = await supabase
          .from('academic_years')
          .select('id, year_name')
          .eq('is_current', true)
          .single();
        
        if (yearError) throw yearError;
        setCurrentAcademicYear(academicYear.year_name);
        
        // Get active students count
        const { count: activeStudents, error: studentsError } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');
        
        if (studentsError) throw studentsError;
        
        // Get fee collection statistics
        const today = new Date().toISOString().split('T')[0];
        const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        
        // Daily collection
        const { data: dailyPayments, error: dailyError } = await supabase
          .from('fee_payments')
          .select('amount_paid')
          .eq('payment_date', today);
        
        if (dailyError) throw dailyError;
        
        const dailyCollection = dailyPayments?.reduce((sum, payment) => 
          sum + parseFloat(payment.amount_paid), 0) || 0;
        
        // Monthly collection
        const { data: monthlyPayments, error: monthlyError } = await supabase
          .from('fee_payments')
          .select('amount_paid')
          .gte('payment_date', firstDayOfMonth);
        
        if (monthlyError) throw monthlyError;
        
        const monthlyCollection = monthlyPayments?.reduce((sum, payment) => 
          sum + parseFloat(payment.amount_paid), 0) || 0;
        
        // Yearly collection (academic year)
        const { data: yearlyPayments, error: yearlyError } = await supabase
          .from('fee_payments')
          .select('amount_paid, payment_date');
        
        if (yearlyError) throw yearlyError;
        
        const yearlyCollection = yearlyPayments?.reduce((sum, payment) => 
          sum + parseFloat(payment.amount_paid), 0) || 0;
        
        // Calculate growth percentages (mock for now, would need historical data)
        // In a real implementation, you would compare with previous periods
        
        setDashboardStats({
          yearCollection: yearlyCollection,
          monthCollection: monthlyCollection,
          dailyCollection: dailyCollection,
          activeStudents: activeStudents || 0,
          yearGrowth: 12,
          monthGrowth: 8,
          dailyGrowth: 15,
          studentGrowth: 3
        });
        
        // Fetch defaulters data
        const { data: classes, error: classesError } = await supabase
          .from('classes')
          .select(`
            id, 
            name,
            teacher:teacher_id(name)
          `)
          .eq('academic_year_id', academicYear.id);
        
        if (classesError) throw classesError;
        
        // For each class, get defaulter count and outstanding balance
        const defaultersPromises = classes.map(async (cls) => {
          // Get students in this class
          const { data: students, error: studentsError } = await supabase
            .from('students')
            .select('id')
            .eq('class_id', cls.id)
            .eq('status', 'active');
          
          if (studentsError) throw studentsError;
          
          // Count students with outstanding fees
          let defaulterCount = 0;
          let outstandingBalance = 0;
          
          for (const student of students || []) {
            // Get fee payments for this student
            const { data: payments, error: paymentsError } = await supabase
              .from('fee_payments')
              .select('amount_paid')
              .eq('student_id', student.id);
            
            if (paymentsError) throw paymentsError;
            
            // Get fee structure for this student's class
            const { data: feeStructure, error: feeError } = await supabase
              .from('fee_structure')
              .select('amount')
              .eq('class_id', cls.id)
              .eq('academic_year_id', academicYear.id);
            
            if (feeError) throw feeError;
            
            // Calculate total fees and paid amount
            const totalFees = feeStructure?.reduce((sum, fee) => 
              sum + parseFloat(fee.amount), 0) || 0;
            
            const paidAmount = payments?.reduce((sum, payment) => 
              sum + parseFloat(payment.amount_paid), 0) || 0;
            
            // If outstanding balance, count as defaulter
            if (totalFees > paidAmount) {
              defaulterCount++;
              outstandingBalance += (totalFees - paidAmount);
            }
          }
          
          return {
            class: cls.name,
            teacher: cls.teacher?.name || 'Unassigned',
            defaulterCount,
            outstandingBalance: outstandingBalance.toLocaleString('en-IN')
          };
        });
        
        const defaultersResults = await Promise.all(defaultersPromises);
        setDefaultersData(defaultersResults.filter(d => d.defaulterCount > 0));
        
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardStats();
  }, []);

  // Statistics for the dashboard
  const statistics = [
    { 
      title: `Academic Year Collection (${currentAcademicYear})`,
      value: `₹${dashboardStats.yearCollection.toLocaleString('en-IN')}`,
      change: `+${dashboardStats.yearGrowth}%`,
      isPositive: true,
      icon: CircleDollarSign,
      color: 'bg-blue-100 text-blue-600',
    },
    { 
      title: `Monthly Collection (${new Date().toLocaleString('default', { month: 'short' })}-${new Date().getFullYear()})`,
      value: `₹${dashboardStats.monthCollection.toLocaleString('en-IN')}`,
      change: `+${dashboardStats.monthGrowth}%`,
      isPositive: true,
      icon: CircleDollarSign,
      color: 'bg-green-100 text-green-600',
    },
    { 
      title: `Daily Collection (${new Date().toLocaleDateString()})`,
      value: `₹${dashboardStats.dailyCollection.toLocaleString('en-IN')}`,
      change: `+${dashboardStats.dailyGrowth}%`,
      isPositive: true, 
      icon: CircleDollarSign,
      color: 'bg-yellow-100 text-yellow-600',
    },
    { 
      title: 'Total Active Students',
      value: dashboardStats.activeStudents.toLocaleString(),
      change: `+${dashboardStats.studentGrowth}%`,
      isPositive: true,
      icon: Users,
      color: 'bg-purple-100 text-purple-600',
    },
  ];

  // Quick access buttons
  const quickAccess = [
    { title: 'Student Registration', path: '/student-registration' },
    { title: 'Fee Collection', path: '/fee-collection' },
    { title: 'Fee Structure', path: '/fee-structure' },
    { title: 'Reports', path: '/reports' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader title="Admin Dashboard">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Current Term:</span>
          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
            {currentAcademicYear || 'Loading...'}
          </span>
        </div>
      </PageHeader>

      <div className="w-full max-w-xl">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search student name..."
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <span className="ml-2 text-muted-foreground">Loading dashboard data...</span>
        </div>
      ) : error ? (
        <div className="bg-error/10 border border-error/30 text-error rounded-md p-4">
          Error loading dashboard data: {error}
        </div>
      ) : (
        <>
          {/* Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
            {statistics.map((stat, index) => (
              <StatCard key={index} {...stat} />
            ))}
          </div>

          {/* Quick Access */}
          <QuickAccess items={quickAccess} />

          {/* Defaulters Table */}
          <DefaultersTable data={defaultersData} />
        </>
      )}
    </div>
  );
};

export default AdminDashboard;