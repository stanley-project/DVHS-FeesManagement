import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: { ...corsHeaders },
      status: 204,
    });
  }

  try {
    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get the user from the request
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    // Get the role from the user's metadata
    const role = user.app_metadata.role;

    // Get the current academic year
    const { data: academicYear, error: yearError } = await supabaseClient
      .from('academic_years')
      .select('id, year_name')
      .eq('is_current', true)
      .single();

    if (yearError) {
      throw new Error(`Failed to fetch academic year: ${yearError.message}`);
    }

    // Get active students count
    const { count: activeStudents, error: studentsError } = await supabaseClient
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    if (studentsError) {
      throw new Error(`Failed to fetch students: ${studentsError.message}`);
    }

    // Get dates for filtering
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    // Get all payments in a single query
    const { data: allPayments, error: paymentsError } = await supabaseClient
      .from('fee_payments')
      .select('amount_paid, payment_date, payment_method');

    if (paymentsError) {
      throw new Error(`Failed to fetch payments: ${paymentsError.message}`);
    }

    // Process payments for different time periods
    const dailyPayments = allPayments.filter(p => p.payment_date === today);
    const monthlyPayments = allPayments.filter(p => p.payment_date >= firstDayOfMonth);

    const dailyCollection = dailyPayments.reduce((sum, payment) => 
      sum + parseFloat(payment.amount_paid), 0);
    
    const monthlyCollection = monthlyPayments.reduce((sum, payment) => 
      sum + parseFloat(payment.amount_paid), 0);
    
    const yearlyCollection = allPayments.reduce((sum, payment) => 
      sum + parseFloat(payment.amount_paid), 0);

    // Get class-wise defaulters data
    let defaultersData = [];
    if (role === 'administrator') {
      const { data: classes, error: classesError } = await supabaseClient
        .from('classes')
        .select(`
          id, 
          name,
          teacher:teacher_id(name)
        `)
        .eq('academic_year_id', academicYear.id);

      if (classesError) {
        throw new Error(`Failed to fetch classes: ${classesError.message}`);
      }

      // For each class, get defaulter count and outstanding balance
      const defaultersPromises = classes.map(async (cls) => {
        // Get students in this class
        const { data: students, error: studentsError } = await supabaseClient
          .from('students')
          .select('id')
          .eq('class_id', cls.id)
          .eq('status', 'active');
        
        if (studentsError) {
          throw new Error(`Failed to fetch students for class ${cls.name}: ${studentsError.message}`);
        }
        
        // Count students with outstanding fees
        let defaulterCount = 0;
        let outstandingBalance = 0;
        
        for (const student of students || []) {
          // Get fee payments for this student
          const { data: payments, error: paymentsError } = await supabaseClient
            .from('fee_payments')
            .select('amount_paid')
            .eq('student_id', student.id);
          
          if (paymentsError) {
            throw new Error(`Failed to fetch payments for student ${student.id}: ${paymentsError.message}`);
          }
          
          // Get fee structure for this student's class
          const { data: feeStructure, error: feeError } = await supabaseClient
            .from('fee_structure')
            .select('amount')
            .eq('class_id', cls.id)
            .eq('academic_year_id', academicYear.id);
          
          if (feeError) {
            throw new Error(`Failed to fetch fee structure for class ${cls.name}: ${feeError.message}`);
          }
          
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
      
      defaultersData = await Promise.all(defaultersPromises);
      defaultersData = defaultersData.filter(d => d.defaulterCount > 0);
    }

    // Prepare response based on user role
    let responseData = {
      academicYear: academicYear.year_name,
      activeStudents,
      dailyCollection,
      monthlyCollection,
      yearlyCollection,
      defaultersData: role === 'administrator' ? defaultersData : [],
      // Mock growth data - would be calculated from historical data
      yearGrowth: 12,
      monthGrowth: 8,
      dailyGrowth: 15,
      studentGrowth: 3
    };

    // Return the data
    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});