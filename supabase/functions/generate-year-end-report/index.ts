import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.38.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { academicYearId } = await req.json();

    // Get academic year details
    const { data: academicYear, error: yearError } = await supabase
      .from('academic_years')
      .select('*')
      .eq('id', academicYearId)
      .single();

    if (yearError) throw yearError;

    // Generate various reports
    const reports = {
      studentStats: await getStudentStatistics(supabase, academicYearId),
      feeCollection: await getFeeCollectionReport(supabase, academicYearId),
      promotionSummary: await getPromotionSummary(supabase, academicYearId),
      classWiseReport: await getClassWiseReport(supabase, academicYearId)
    };

    // Save reports to academic_year_settings
    await supabase
      .from('academic_year_settings')
      .insert({
        academic_year_id: academicYearId,
        setting_key: 'year_end_reports',
        setting_value: reports
      });

    return new Response(
      JSON.stringify({ success: true, reports }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function getStudentStatistics(supabase: any, academicYearId: string) {
  const { data, error } = await supabase
    .from('student_academic_history')
    .select(`
      *,
      student:student_id(*),
      class:class_id(*)
    `)
    .eq('academic_year_id', academicYearId);

  if (error) throw error;

  return {
    totalStudents: data.length,
    activeStudents: data.filter(s => s.is_active_in_year).length,
    newAdmissions: data.filter(s => s.student.registration_type === 'new').length,
    withBusService: data.filter(s => s.student.has_school_bus).length
  };
}

async function getFeeCollectionReport(supabase: any, academicYearId: string) {
  const { data, error } = await supabase
    .from('fee_payments')
    .select(`
      *,
      fee_structure:fee_structure_id(*)
    `)
    .eq('academic_year_id', academicYearId);

  if (error) throw error;

  return {
    totalCollection: data.reduce((sum, p) => sum + p.amount_paid, 0),
    onlinePayments: data.filter(p => p.payment_method === 'online').length,
    cashPayments: data.filter(p => p.payment_method === 'cash').length,
    pendingFees: 0 // This would need more complex calculation
  };
}

async function getPromotionSummary(supabase: any, academicYearId: string) {
  const { data, error } = await supabase
    .from('student_promotion_history')
    .select('*')
    .eq('academic_year_id', academicYearId);

  if (error) throw error;

  return {
    totalPromoted: data.filter(p => p.promotion_status === 'promoted').length,
    totalRetained: data.filter(p => p.promotion_status === 'retained').length,
    totalTransferred: data.filter(p => p.promotion_status === 'transferred_out').length,
    totalDropped: data.filter(p => p.promotion_status === 'dropped_out').length
  };
}

async function getClassWiseReport(supabase: any, academicYearId: string) {
  const { data: classes, error } = await supabase
    .from('classes')
    .select(`
      *,
      students:student_academic_history(*)
    `)
    .eq('academic_year_id', academicYearId);

  if (error) throw error;

  return classes.map(cls => ({
    className: cls.name,
    totalStudents: cls.students.length,
    activeStudents: cls.students.filter(s => s.is_active_in_year).length
  }));
}