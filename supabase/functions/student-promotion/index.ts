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

    const { transitionId } = await req.json();

    // Get transition details
    const { data: transition, error: transitionError } = await supabase
      .from('academic_year_transitions')
      .select('*, from_year:from_year_id(*), to_year:to_year_id(*)')
      .eq('id', transitionId)
      .single();

    if (transitionError) throw transitionError;

    // Update transition status
    await supabase
      .from('academic_year_transitions')
      .update({ status: 'in_progress' })
      .eq('id', transitionId);

    // Get all students from current year
    const { data: students, error: studentsError } = await supabase
      .from('student_academic_history')
      .select(`
        *,
        student:student_id(*),
        class:class_id(*)
      `)
      .eq('academic_year_id', transition.from_year.id)
      .eq('is_active_in_year', true);

    if (studentsError) throw studentsError;

    let promoted = 0;
    let retained = 0;
    let transferred = 0;

    // Process each student
    for (const student of students) {
      // Get next class based on current class
      const { data: nextClass } = await supabase
        .from('classes')
        .select('*')
        .eq('academic_year_id', transition.to_year.id)
        .eq('name', getNextClassName(student.class.name))
        .single();

      // Determine promotion status (mock logic - in real app, use actual criteria)
      const promotionStatus = 'promoted'; // This would be based on grades, attendance, etc.

      // Create promotion history record
      await supabase
        .from('student_promotion_history')
        .insert({
          student_id: student.student_id,
          academic_year_id: transition.from_year.id,
          from_class_id: student.class_id,
          to_class_id: nextClass.id,
          promotion_status: promotionStatus,
          promotion_date: new Date().toISOString(),
          created_by: transition.created_by
        });

      // Create new academic history record for next year
      await supabase
        .from('student_academic_history')
        .insert({
          student_id: student.student_id,
          academic_year_id: transition.to_year.id,
          class_id: nextClass.id,
          section: student.section,
          promotion_status: promotionStatus,
          registration_date_for_year: new Date().toISOString(),
          is_active_in_year: true
        });

      // Update counters
      if (promotionStatus === 'promoted') promoted++;
      else if (promotionStatus === 'retained') retained++;
      else if (promotionStatus === 'transferred_out') transferred++;
    }

    // Update transition record with final counts
    await supabase
      .from('academic_year_transitions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        total_students: students.length,
        promoted_students: promoted,
        retained_students: retained,
        transferred_students: transferred
      })
      .eq('id', transitionId);

    // Update academic years
    await supabase
      .from('academic_years')
      .update({
        transition_status: 'completed',
        transition_date: new Date().toISOString(),
        is_current: false
      })
      .eq('id', transition.from_year.id);

    await supabase
      .from('academic_years')
      .update({
        is_current: true
      })
      .eq('id', transition.to_year.id);

    return new Response(
      JSON.stringify({ success: true }),
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

function getNextClassName(currentClass: string): string {
  const classNumber = parseInt(currentClass);
  return (classNumber + 1).toString();
}