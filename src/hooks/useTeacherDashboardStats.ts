import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface TeacherDashboardStats {
  className: string;
  classStrength: number;
  feeStatus: {
    paid: number;
    partial: number;
    pending: number;
  };
  pendingStudents: any[];
  feeSchedule: any[];
}

export function useTeacherDashboardStats(userId: string) {
  const [stats, setStats] = useState<TeacherDashboardStats>({
    className: '',
    classStrength: 0,
    feeStatus: {
      paid: 0,
      partial: 0,
      pending: 0
    },
    pendingStudents: [],
    feeSchedule: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeacherStats = async () => {
      if (!userId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Get current academic year and teacher's class in a single query
        const { data: academicData, error: academicError } = await supabase.rpc(
          'get_teacher_class_data',
          { teacher_id: userId }
        );
        
        if (academicError) throw academicError;
        
        if (!academicData || !academicData.class_id) {
          setStats({
            className: 'No Class Assigned',
            classStrength: 0,
            feeStatus: { paid: 0, partial: 0, pending: 0 },
            pendingStudents: [],
            feeSchedule: []
          });
          return;
        }
        
        // Get student fee status for this class in a single query
        const { data: feeStatusData, error: feeStatusError } = await supabase.rpc(
          'get_class_fee_status',
          { class_id: academicData.class_id }
        );
        
        if (feeStatusError) throw feeStatusError;
        
        // Get fee schedule
        const { data: feeTypes, error: feeTypesError } = await supabase
          .from('fee_types')
          .select('*')
          .eq('category', 'school')
          .limit(3);
        
        if (feeTypesError) throw feeTypesError;
        
        // Create fee schedule based on fee types
        const feeSchedule = feeTypes?.map((feeType, index) => {
          const dueDate = new Date();
          dueDate.setMonth(dueDate.getMonth() + index * 3);
          
          return {
            term: `Term ${index + 1}`,
            dueDate: dueDate.toLocaleDateString(),
            amount: '₹15,000',
            status: index === 0 ? 'Completed' : index === 1 ? 'Upcoming' : 'Pending'
          };
        }) || [];
        
        setStats({
          className: academicData.class_name || 'Unknown Class',
          classStrength: feeStatusData?.total_students || 0,
          feeStatus: {
            paid: feeStatusData?.paid_count || 0,
            partial: feeStatusData?.partial_count || 0,
            pending: feeStatusData?.pending_count || 0
          },
          pendingStudents: feeStatusData?.pending_students || [],
          feeSchedule
        });
        
      } catch (err: any) {
        console.error('Error fetching teacher dashboard data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTeacherStats();
  }, [userId]);

  return { stats, loading, error };
}