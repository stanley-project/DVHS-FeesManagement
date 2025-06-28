/*
  # Fix Payment Allocation Trigger

  This migration fixes the ambiguity in the allocate_payment trigger function
  by properly qualifying all column references with table aliases.
  
  1. Changes:
    - Drop and recreate the allocate_payment function with proper column qualification
    - Ensure all references to academic_year_id are fully qualified
    - Fix the payment allocation logic to avoid ambiguity
*/

-- Drop the existing trigger function
DROP FUNCTION IF EXISTS allocate_payment CASCADE;

-- Create a new version with proper column qualification
CREATE OR REPLACE FUNCTION allocate_payment()
RETURNS TRIGGER AS $$
DECLARE
  student_id UUID;
  pending_bus_fees NUMERIC := 0;
  pending_school_fees NUMERIC := 0;
  payment_amount NUMERIC;
  bus_allocation NUMERIC := 0;
  school_allocation NUMERIC := 0;
  current_academic_year_id UUID;
  academic_year_start_date DATE;
  current_date DATE := CURRENT_DATE;
  months_passed INTEGER;
BEGIN
  -- Get student ID from the payment
  student_id := NEW.student_id;
  payment_amount := NEW.amount_paid;
  current_academic_year_id := NEW.academic_year_id;
  
  -- Get academic year start date
  SELECT start_date INTO academic_year_start_date
  FROM academic_years
  WHERE id = current_academic_year_id;
  
  -- Calculate months passed since academic year start
  months_passed := 
    (EXTRACT(YEAR FROM current_date) - EXTRACT(YEAR FROM academic_year_start_date)) * 12 +
    (EXTRACT(MONTH FROM current_date) - EXTRACT(MONTH FROM academic_year_start_date)) + 
    CASE WHEN EXTRACT(DAY FROM current_date) >= EXTRACT(DAY FROM academic_year_start_date) THEN 0 ELSE -1 END + 1;
  
  -- Calculate pending bus fees
  SELECT 
    GREATEST(0, 
      CASE WHEN s.has_school_bus AND s.village_id IS NOT NULL THEN
        COALESCE((
          SELECT bfs.fee_amount::NUMERIC * months_passed
          FROM bus_fee_structure bfs
          WHERE bfs.village_id = s.village_id
            AND bfs.academic_year_id = current_academic_year_id
            AND bfs.is_active = true
        ), 0)
      ELSE 0 END - 
      COALESCE((
        SELECT SUM(pa.bus_fee_amount::NUMERIC)
        FROM payment_allocation pa
        JOIN fee_payments fp ON pa.payment_id = fp.id
        WHERE pa.student_id = student_id
      ), 0)
    )
  INTO pending_bus_fees
  FROM students s
  WHERE s.id = student_id;
  
  -- Calculate pending school fees
  WITH student_school_fees AS (
    SELECT 
      COALESCE(SUM(
        CASE 
          WHEN fs.is_recurring_monthly THEN fs.amount::NUMERIC * months_passed
          ELSE fs.amount::NUMERIC
        END
      ), 0) AS total_fees
    FROM fee_structure fs
    JOIN students s ON fs.class_id = s.class_id
    WHERE s.id = student_id
      AND fs.academic_year_id = current_academic_year_id
      AND (NOT fs.applicable_to_new_students_only OR s.registration_type = 'new')
  ),
  paid_school_fees AS (
    SELECT COALESCE(SUM(pa.school_fee_amount::NUMERIC), 0) AS total_paid
    FROM payment_allocation pa
    JOIN fee_payments fp ON pa.payment_id = fp.id
    WHERE pa.student_id = student_id
  )
  SELECT GREATEST(0, ssf.total_fees - psf.total_paid)
  INTO pending_school_fees
  FROM student_school_fees ssf, paid_school_fees psf;
  
  -- Allocate payment to bus fees first, then school fees
  IF payment_amount <= pending_bus_fees THEN
    bus_allocation := payment_amount;
    school_allocation := 0;
  ELSE
    bus_allocation := pending_bus_fees;
    school_allocation := LEAST(payment_amount - pending_bus_fees, pending_school_fees);
  END IF;
  
  -- Insert payment allocation
  INSERT INTO payment_allocation (
    payment_id,
    student_id,
    bus_fee_amount,
    school_fee_amount,
    allocation_date
  ) VALUES (
    NEW.id,
    student_id,
    bus_allocation,
    school_allocation,
    CURRENT_DATE
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS tr_allocate_payment ON fee_payments;
CREATE TRIGGER tr_allocate_payment
  AFTER INSERT ON fee_payments
  FOR EACH ROW
  EXECUTE FUNCTION allocate_payment();

-- Create a helper function to get current academic year ID
CREATE OR REPLACE FUNCTION get_current_academic_year_id()
RETURNS UUID AS $$
DECLARE
  current_year_id UUID;
BEGIN
  SELECT id INTO current_year_id
  FROM academic_years
  WHERE is_current = true
  LIMIT 1;
  
  RETURN current_year_id;
END;
$$ LANGUAGE plpgsql;