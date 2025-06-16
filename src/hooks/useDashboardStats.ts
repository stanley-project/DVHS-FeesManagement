import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface DashboardStats {
  yearCollection: number;
  monthCollection: number;
  dailyCollection: number;
  activeStudents: number;
  yearGrowth: number;
  monthGrowth: number;
  dailyGrowth: number;
  studentGrowth: number;
  defaultersData: {
    class: string;
    teacher: string;
    defaulterCount: number;
    outstandingBalance: string;
  }[];
  currentAcademicYear: string;
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats>({
    yearCollection: 0,
    monthCollection: 0,
    dailyCollection: 0,
    activeStudents: 0,
    yearGrowth: 0,
    monthGrowth: 0,
    dailyGrowth: 0,
    studentGrowth: 0,
    defaultersData: [],
    currentAcademicYear: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get current academic year in a single query
        const { data: academicYear, error: yearError } = await supabase
          .from('academic_years')
          .select('id, year_name')
          .eq('is_current', true)
          .single();
        
        if (yearError) throw yearError;
        
        // Get active students count
        const { count: activeStudents, error: studentsError } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');
        
        if (studentsError) throw studentsError;
        
        // Get dates for filtering
        const today = new Date().toISOString().split('T')[0];
        const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        
        // Get all payments in a single query with date filtering
        const { data: allPayments, error: paymentsError } = await supabase
          .from('fee_payments')
          .select('amount_paid, payment_date, payment_method');
        
        if (paymentsError) throw paymentsError;
        
        // Process payments client-side for different time periods
        const dailyPayments = allPayments?.filter(p => p.payment_date === today) || [];
        const monthlyPayments = allPayments?.filter(p => p.payment_date >= firstDayOfMonth) || [];
        
        const dailyCollection = dailyPayments.reduce((sum, payment) => 
          sum + parseFloat(payment.amount_paid), 0);
        
        const monthlyCollection = monthlyPayments.reduce((sum, payment) => 
          sum + parseFloat(payment.amount_paid), 0);
        
        const yearlyCollection = allPayments?.reduce((sum, payment) => 
          sum + parseFloat(payment.amount_paid), 0) || 0;
        
        // Get class-wise defaulters in a single efficient query
        const { data: defaultersData, error: defaultersError } = await supabase.rpc(
          'get_class_defaulters',
          { academic_year_id: academicYear.id }
        );
        
        if (defaultersError) {
          console.error('Error fetching defaulters:', defaultersError);
          throw new Error(`Error fetching defaulters: ${defaultersError.message}`);
        }
        
        // Set all dashboard stats at once to avoid multiple re-renders
        setStats({
          yearCollection: yearlyCollection,
          monthCollection: monthlyCollection,
          dailyCollection: dailyCollection,
          activeStudents: activeStudents || 0,
          yearGrowth: 12, // Mock growth data - would be calculated from historical data
          monthGrowth: 8,
          dailyGrowth: 15,
          studentGrowth: 3,
          defaultersData: defaultersData || [],
          currentAcademicYear: academicYear.year_name
        });
      } catch (err: any) {
        console.error('Error fetching dashboard stats:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardStats();
  }, []);

  return { stats, loading, error };
}