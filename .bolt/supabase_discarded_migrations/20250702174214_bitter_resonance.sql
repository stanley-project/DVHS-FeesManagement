/*
  # Fix Monthly School Fee Calculation

  1. Changes
     - Modify the get_student_fee_status function to correctly calculate monthly school fees
     - Add a debug flag to help troubleshoot fee calculations
     - Fix the calculation of monthly fees for non-recurring fees
*/

-- Update the get_student_fee_status function to fix monthly fee calculation
CREATE OR REPLACE FUNCTION get_student_fee_status(
  p_student_id UUID,
  p_academic_year_id UUID,
  p_debug BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_student RECORD;
  v_academic_year_start_date DATE;
  v_current_date DATE := CURRENT_DATE;
  v_months_passed_school INTEGER;
  v_months_passed_bus INTEGER;
  v_total_bus_fees NUMERIC := 0;
  v_total_school_fees NUMERIC := 0;
  v_paid_bus_fees NUMERIC := 0;
  v_paid_school_fees NUMERIC := 0;
  v_monthly_bus_fee NUMERIC := 0;
  v_monthly_school_fee NUMERIC := 0;
  v_recurring_school_fees NUMERIC := 0;
  v_one_time_school_fees NUMERIC := 0;
  v_fee_record RECORD;
  v_debug_info JSONB := '{}';
BEGIN
  -- Get student details
  SELECT * INTO v_student
  FROM students
  WHERE id = p_student_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student not found';
  END IF;
  
  -- Get academic year start date
  SELECT start_date INTO v_academic_year_start_date
  FROM academic_years
  WHERE id = p_academic_year_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Academic year not found';
  END IF;
  
  -- Calculate months passed for school fees
  v_months_passed_school := EXTRACT(YEAR FROM v_current_date) * 12 + EXTRACT(MONTH FROM v_current_date) - 
                           (EXTRACT(YEAR FROM v_academic_year_start_date) * 12 + EXTRACT(MONTH FROM v_academic_year_start_date)) + 1;
  
  -- Calculate months passed for bus fees
  IF v_student.bus_start_date IS NOT NULL THEN
    v_months_passed_bus := EXTRACT(YEAR FROM v_current_date) * 12 + EXTRACT(MONTH FROM v_current_date) - 
                          (EXTRACT(YEAR FROM v_student.bus_start_date) * 12 + EXTRACT(MONTH FROM v_student.bus_start_date)) + 1;
  ELSE
    v_months_passed_bus := CASE WHEN v_student.has_school_bus THEN v_months_passed_school ELSE 0 END;
  END IF;
  
  -- Get monthly bus fee if applicable
  IF v_student.has_school_bus AND v_student.village_id IS NOT NULL THEN
    SELECT COALESCE(bfs.fee_amount::NUMERIC, 0)
    INTO v_monthly_bus_fee
    FROM bus_fee_structure bfs
    WHERE bfs.village_id = v_student.village_id
      AND bfs.academic_year_id = p_academic_year_id
      AND bfs.is_active = true;
  END IF;
  
  -- Calculate total bus fees
  v_total_bus_fees := v_monthly_bus_fee * v_months_passed_bus;
  
  -- Get school fees - separate recurring and one-time fees
  FOR v_fee_record IN
    SELECT 
      fs.amount::NUMERIC as fee_amount,
      fs.is_recurring_monthly,
      ft.name as fee_type_name
    FROM fee_structure fs
    JOIN fee_types ft ON fs.fee_type_id = ft.id
    WHERE fs.class_id = v_student.class_id
      AND fs.academic_year_id = p_academic_year_id
      AND ft.category = 'school'
      AND (NOT fs.applicable_to_new_students_only OR v_student.registration_type = 'new')
  LOOP
    IF v_fee_record.is_recurring_monthly THEN
      -- Add to recurring fees
      v_recurring_school_fees := v_recurring_school_fees + v_fee_record.fee_amount;
      -- Add to total fees (monthly fee * months passed)
      v_total_school_fees := v_total_school_fees + (v_fee_record.fee_amount * v_months_passed_school);
    ELSE
      -- Add to one-time fees
      v_one_time_school_fees := v_one_time_school_fees + v_fee_record.fee_amount;
      -- Add directly to total fees (one-time fee is charged in full)
      v_total_school_fees := v_total_school_fees + v_fee_record.fee_amount;
    END IF;
    
    -- Add debug info if requested
    IF p_debug THEN
      v_debug_info := v_debug_info || jsonb_build_object(
        v_fee_record.fee_type_name, jsonb_build_object(
          'amount', v_fee_record.fee_amount,
          'is_recurring', v_fee_record.is_recurring_monthly
        )
      );
    END IF;
  END LOOP;
  
  -- Calculate monthly school fee (recurring fees + one-time fees distributed over the academic year)
  v_monthly_school_fee := v_recurring_school_fees;
  
  -- Calculate already paid bus and school fees from manual allocations
  SELECT 
    COALESCE(SUM(mpa.bus_fee_amount::NUMERIC), 0),
    COALESCE(SUM(mpa.school_fee_amount::NUMERIC), 0)
  INTO 
    v_paid_bus_fees,
    v_paid_school_fees
  FROM manual_payment_allocation mpa
  JOIN fee_payments fp ON mpa.payment_id = fp.id
  WHERE mpa.student_id = p_student_id
    AND fp.academic_year_id = p_academic_year_id;
  
  -- If no manual allocations, try payment_allocation table
  IF v_paid_bus_fees = 0 AND v_paid_school_fees = 0 THEN
    SELECT 
      COALESCE(SUM(pa.bus_fee_amount::NUMERIC), 0),
      COALESCE(SUM(pa.school_fee_amount::NUMERIC), 0)
    INTO 
      v_paid_bus_fees,
      v_paid_school_fees
    FROM payment_allocation pa
    JOIN fee_payments fp ON pa.payment_id = fp.id
    WHERE pa.student_id = p_student_id
      AND fp.academic_year_id = p_academic_year_id;
  END IF;
  
  -- Build result JSON
  v_result := jsonb_build_object(
    'student_id', p_student_id,
    'academic_year_id', p_academic_year_id,
    'total_bus_fees', v_total_bus_fees,
    'total_school_fees', v_total_school_fees,
    'total_fees', v_total_bus_fees + v_total_school_fees,
    'paid_bus_fees', v_paid_bus_fees,
    'paid_school_fees', v_paid_school_fees,
    'total_paid', v_paid_bus_fees + v_paid_school_fees,
    'pending_bus_fees', GREATEST(0, v_total_bus_fees - v_paid_bus_fees),
    'pending_school_fees', GREATEST(0, v_total_school_fees - v_paid_school_fees),
    'total_pending', GREATEST(0, v_total_bus_fees + v_total_school_fees - v_paid_bus_fees - v_paid_school_fees),
    'monthly_bus_fee', v_monthly_bus_fee,
    'monthly_school_fee', v_monthly_school_fee,
    'months_passed_school', v_months_passed_school,
    'months_passed_bus', v_months_passed_bus,
    'recurring_school_fees', v_recurring_school_fees,
    'one_time_school_fees', v_one_time_school_fees
  );
  
  -- Add debug info if requested
  IF p_debug THEN
    v_result := v_result || jsonb_build_object('debug', v_debug_info);
  END IF;
  
  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_student_fee_status TO authenticated;