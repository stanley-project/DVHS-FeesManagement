import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface AccountantDashboardStats {
  todayCollection: number;
  pendingPayments: number;
  monthlyCollection: number;
  currentAcademicYear: string;
  todayCollections: any[];
  pendingStudents: any[];
}

export function useAccountantDashboardStats() {
  const [stats, setStats] = useState<AccountantDashboardStats>({
    todayCollection: 0,
    pendingPayments: 0,
    monthlyCollection: 0,
    currentAcademicYear: '',
    todayCollections: [],
    pendingStudents: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAccountantStats = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get current academic year
        const { data: academicYear, error: yearError } = await supabase
          .from('academic_years')
          .select('id, year_name')
          .eq('is_current', true)
          .single();
        
        if (yearError) throw yearError;
        
        // Get today's date in ISO format
        const today = new Date().toISOString().split('T')[0];
        const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        
        // Get today's collections with student details in a single query
        const { data: todayPayments, error: todayError } = await supabase
          .from('fee_payments')
          .select(`
            id,
            receipt_number,
            amount_paid,
            payment_date,
            created_at,
            student:student_id(
              id,
              student_name,
              admission_number,
              class:class_id(name)
            )
          `)
          .eq('payment_date', today)
          .order('created_at', { ascending: false });
        
        if (todayError) throw todayError;
        
        // Calculate today's total collection
        const todayTotal = todayPayments?.reduce((sum, payment) => 
          sum + parseFloat(payment.amount_paid), 0) || 0;
        
        // Get monthly collection in a single query
        const { data: monthlyPayments, error: monthlyError } = await supabase
          .from('fee_payments')
          .select('amount_paid')
          .gte('payment_date', firstDayOfMonth);
        
        if (monthlyError) throw monthlyError;
        
        const monthlyTotal = monthlyPayments?.reduce((sum, payment) => 
          sum + parseFloat(payment.amount_paid), 0) || 0;
        
        // Get pending payments data in a single query
        const { data: pendingData, error: pendingError } = await supabase.rpc(
          'get_pending_payments',
          { academic_year_id: academicYear.id, limit_count: 3 }
        );
        
        if (pendingError) {
          console.error('Error fetching pending payments:', pendingError);
          // Continue execution even if this specific query fails
        }
        
        setStats({
          todayCollection: todayTotal,
          pendingPayments: pendingData?.length || 0,
          monthlyCollection: monthlyTotal,
          currentAcademicYear: academicYear.year_name,
          todayCollections: todayPayments?.slice(0, 5).map(payment => ({
            receiptId: payment.receipt_number,
            studentName: payment.student?.student_name || 'Unknown',
            class: payment.student?.class?.name || 'N/A',
            amount: parseFloat(payment.amount_paid),
            time: new Date(payment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          })) || [],
          pendingStudents: pendingData || []
        });
        
      } catch (err: any) {
        console.error('Error fetching accountant dashboard data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAccountantStats();
  }, []);

  return { stats, loading, error };
}