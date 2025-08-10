/*
  # Fix Payment Allocation Function

  This migration fixes the payment allocation function to properly allocate payments
  to bus fees first, then school fees.
  
  1. Issues Fixed:
    - Payments not being allocated to bus fees despite having pending bus fees
    - Incorrect calculation of pending bus and school fees
    - Proper handling of multiple payments for the same student
  
  2. Changes:
    - Completely rewrite the allocate_payment function with improved logic
    - Fix the calculation of pending bus and school fees
    - Ensure bus fees are prioritized in the allocation
*/

-- Drop the existing function and trigger
DROP TRIGGER IF EXISTS tr_allocate_payment ON fee_payments;
DROP FUNCTION IF EXISTS allocate_payment CASCADE;

-- Create a new version with fixed allocation logic
CREATE OR REPLACE FUNCTION allocate_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_student_id UUID;
  v_pending_bus_fees NUMERIC := 0;
  v_pending_school_fees NUMERIC := 0;
  v_payment_amount NUMERIC;
  v_bus_allocation NUMERIC := 0;
  v_school_allocation NUMERIC := 0;
  v_academic_year_id UUID;
  v_academic_year_start_date DATE;
  v_bus_start_date DATE;
  v_current_date DATE := CURRENT_DATE;
  v_months_passed_school INTEGER;
  v_months_passed_bus INTEGER;
  v_total_bus_fees NUMERIC := 0;
  v_total_school_fees NUMERIC := 0;
  v_paid_bus_fees NUMERIC := 0;
  v_paid_school_fees NUMERIC := 0;
BEGIN
  -- Get student ID and payment details
  v_student_id := NEW.student_id;
  v_payment_amount := NEW.amount_paid;
  v_academic_year_id := NEW.academic_year_id;
  
  -- Get academic year start date
  SELECT start_date INTO v_academic_year_start_date
  FROM academic_years
  WHERE id = v_academic_year_id;
  
  -- Get student details including bus_start_date
  SELECT bus_start_date INTO v_bus_start_date
  FROM students
  WHERE id = v_student_id;
  
  -- If bus_start_date is NULL but student has bus, use academic year start date
  IF v_bus_start_date IS NULL THEN
    v_bus_start_date := v_academic_year_start_date;
  END IF;
  
  -- Calculate months passed for school fees (from academic year start)
  v_months_passed_school := calculate_months_between(v_academic_year_start_date, v_current_date);
  
  -- Calculate months passed for bus fees (from bus start date)
  v_months_passed_bus := calculate_months_between(v_bus_start_date, v_current_date);
  
  -- Calculate total bus fees
  SELECT 
    CASE WHEN s.has_school_bus AND s.village_id IS NOT NULL THEN
      COALESCE((
        SELECT bfs.fee_amount::NUMERIC * v_months_passed_bus
        FROM bus_fee_structure bfs
        WHERE bfs.village_id = s.village_id
          AND bfs.academic_year_id = v_academic_year_id
          AND bfs.is_active = true
      ), 0)
    ELSE 0 END
  INTO v_total_bus_fees
  FROM students s
  WHERE s.id = v_student_id;
  
  -- Calculate total school fees
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN fs.is_recurring_monthly THEN fs.amount::NUMERIC * v_months_passed_school
        ELSE fs.amount::NUMERIC
      END
    ), 0)
  INTO v_total_school_fees
  FROM fee_structure fs
  JOIN students s ON fs.class_id = s.class_id
  WHERE s.id = v_student_id
    AND fs.academic_year_id = v_academic_year_id
    AND (NOT fs.applicable_to_new_students_only OR s.registration_type = 'new');
  
  -- Calculate already paid bus and school fees
  SELECT 
    COALESCE(SUM(pa.bus_fee_amount::NUMERIC), 0),
    COALESCE(SUM(pa.school_fee_amount::NUMERIC), 0)
  INTO 
    v_paid_bus_fees,
    v_paid_school_fees
  FROM payment_allocation pa
  WHERE pa.student_id = v_student_id
    AND pa.payment_id != NEW.id; -- Exclude current payment
  
  -- Calculate pending fees
  v_pending_bus_fees := GREATEST(0, v_total_bus_fees - v_paid_bus_fees);
  v_pending_school_fees := GREATEST(0, v_total_school_fees - v_paid_school_fees);
  
  -- Debug logging
  RAISE NOTICE 'Student ID: %, Payment Amount: %, Total Bus Fees: %, Paid Bus Fees: %, Pending Bus Fees: %, Total School Fees: %, Paid School Fees: %, Pending School Fees: %',
    v_student_id, v_payment_amount, v_total_bus_fees, v_paid_bus_fees, v_pending_bus_fees, v_total_school_fees, v_paid_school_fees, v_pending_school_fees;
  
  -- Allocate payment to bus fees first, then school fees
  IF v_payment_amount <= v_pending_bus_fees THEN
    -- If payment amount is less than or equal to pending bus fees, allocate all to bus fees
    v_bus_allocation := v_payment_amount;
    v_school_allocation := 0;
  ELSE
    -- If payment amount is more than pending bus fees, allocate remaining to school fees
    v_bus_allocation := v_pending_bus_fees;
    v_school_allocation := LEAST(v_payment_amount - v_pending_bus_fees, v_pending_school_fees);
  END IF;
  
  -- Debug logging for allocation
  RAISE NOTICE 'Bus Allocation: %, School Allocation: %', v_bus_allocation, v_school_allocation;
  
  -- Insert payment allocation
  INSERT INTO payment_allocation (
    payment_id,
    student_id,
    bus_fee_amount,
    school_fee_amount,
    allocation_date
  ) VALUES (
    NEW.id,
    v_student_id,
    v_bus_allocation,
    v_school_allocation,
    CURRENT_DATE
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER tr_allocate_payment
  AFTER INSERT ON fee_payments
  FOR EACH ROW
  EXECUTE FUNCTION allocate_payment();

-- Create a function to recalculate all payment allocations
CREATE OR REPLACE FUNCTION recalculate_all_payment_allocations()
RETURNS void AS $$
DECLARE
  payment_record RECORD;
BEGIN
  -- Delete all existing payment allocations
  DELETE FROM payment_allocation;
  
  -- For each payment, reinsert it to trigger the allocation function
  FOR payment_record IN 
    SELECT * FROM fee_payments
    ORDER BY payment_date, created_at
  LOOP
    -- Insert a temporary record to trigger the allocation function
    WITH temp_payment AS (
      INSERT INTO fee_payments (
        student_id,
        amount_paid,
        payment_date,
        payment_method,
        receipt_number,
        notes,
        created_by,
        academic_year_id,
        created_at,
        updated_at
      ) VALUES (
        payment_record.student_id,
        payment_record.amount_paid,
        payment_record.payment_date,
        payment_record.payment_method,
        payment_record.receipt_number || '_recalc',
        payment_record.notes,
        payment_record.created_by,
        payment_record.academic_year_id,
        payment_record.created_at,
        payment_record.updated_at
      )
      RETURNING id
    )
    -- Delete the temporary record
    DELETE FROM fee_payments
    WHERE id IN (SELECT id FROM temp_payment);
  END LOOP;
END;
$$ LANGUAGE plpgsql;