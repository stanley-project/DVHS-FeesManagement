import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { FeeStatus } from '../types/fees';

export function useFeeCalculations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const calculateStudentFeeStatus = useCallback(async (studentId: string): Promise<FeeStatus | null> => {
    try {
      setLoading(true);
      setError(null);

      // Get current academic year
      const { data: academicYear, error: yearError } = await supabase
        .from('academic_years')
        .select('id')
        .eq('is_current', true)
        .single();

      if (yearError) throw yearError;

      // Get student details
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('class_id, village_id, has_school_bus, registration_type')
        .eq('id', studentId)
        .single();

      if (studentError) throw studentError;

      // Calculate total fees
      let totalFees = 0;
      let busFees = 0;
      let schoolFees = 0;

      // Get school fees
      const { data: feeStructure, error: feeError } = await supabase
        .from('fee_structure')
        .select(`
          amount,
          applicable_to_new_students_only
        `)
        .eq('academic_year_id', academicYear.id)
        .eq('class_id', student.class_id);

      if (!feeError && feeStructure) {
        // Filter fees based on registration type
        const applicableFees = feeStructure.filter(fee => 
          student.registration_type === 'new' || !fee.applicable_to_new_students_only
        );
        
        schoolFees = applicableFees.reduce((sum, fee) => sum + parseFloat(fee.amount), 0);
        totalFees += schoolFees;
      }

      // Get bus fees if applicable
      if (student.has_school_bus && student.village_id) {
        const { data: busFee, error: busError } = await supabase
          .from('bus_fee_structure')
          .select('fee_amount')
          .eq('village_id', student.village_id)
          .eq('academic_year_id', academicYear.id)
          .eq('is_active', true)
          .maybeSingle();

        if (!busError && busFee) {
          busFees = parseFloat(busFee.fee_amount);
          totalFees += busFees;
        }
      }

      // Get paid amounts
      const { data: payments, error: paymentsError } = await supabase
        .from('fee_payments')
        .select(`
          amount_paid,
          payment_date,
          payment_allocation (
            bus_fee_amount,
            school_fee_amount
          )
        `)
        .eq('student_id', studentId);

      if (paymentsError) throw paymentsError;

      let totalPaid = 0;
      let lastPaymentDate = null;

      if (payments && payments.length > 0) {
        payments.forEach(payment => {
          if (payment.payment_allocation && payment.payment_allocation.length > 0) {
            const allocation = payment.payment_allocation[0];
            totalPaid += parseFloat(allocation.bus_fee_amount || 0) + parseFloat(allocation.school_fee_amount || 0);
          } else {
            totalPaid += parseFloat(payment.amount_paid || 0);
          }
        });

        // Get last payment date
        const sortedPayments = [...payments].sort((a, b) => 
          new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
        );
        lastPaymentDate = sortedPayments[0].payment_date;
      }

      // Calculate outstanding amount
      const outstanding = Math.max(0, totalFees - totalPaid);

      // Determine status
      let status: 'paid' | 'partial' | 'pending' = 'pending';
      if (totalPaid >= totalFees) {
        status = 'paid';
      } else if (totalPaid > 0) {
        status = 'partial';
      }

      return {
        student_id: studentId,
        total_fees: totalFees,
        total_paid: totalPaid,
        outstanding,
        last_payment_date: lastPaymentDate,
        status
      };
    } catch (err) {
      console.error('Error calculating fee status:', err);
      setError(err instanceof Error ? err : new Error('Failed to calculate fee status'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const calculateClassFeeStatus = useCallback(async (classId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Get all students in the class
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id')
        .eq('class_id', classId)
        .eq('status', 'active');

      if (studentsError) throw studentsError;

      // Calculate fee status for each student
      const feeStatuses = await Promise.all(
        students.map(student => calculateStudentFeeStatus(student.id))
      );

      // Filter out null values
      const validStatuses = feeStatuses.filter(status => status !== null) as FeeStatus[];

      // Calculate summary
      const totalStudents = validStatuses.length;
      const totalFees = validStatuses.reduce((sum, status) => sum + status.total_fees, 0);
      const totalPaid = validStatuses.reduce((sum, status) => sum + status.total_paid, 0);
      const totalOutstanding = validStatuses.reduce((sum, status) => sum + status.outstanding, 0);
      const paidCount = validStatuses.filter(status => status.status === 'paid').length;
      const partialCount = validStatuses.filter(status => status.status === 'partial').length;
      const pendingCount = validStatuses.filter(status => status.status === 'pending').length;

      return {
        class_id: classId,
        total_students: totalStudents,
        total_fees: totalFees,
        total_paid: totalPaid,
        total_outstanding: totalOutstanding,
        paid_count: paidCount,
        partial_count: partialCount,
        pending_count: pendingCount,
        collection_percentage: totalFees > 0 ? (totalPaid / totalFees) * 100 : 0
      };
    } catch (err) {
      console.error('Error calculating class fee status:', err);
      setError(err instanceof Error ? err : new Error('Failed to calculate class fee status'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [calculateStudentFeeStatus]);

  return {
    loading,
    error,
    calculateStudentFeeStatus,
    calculateClassFeeStatus
  };
}