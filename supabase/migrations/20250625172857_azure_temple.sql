/*
  # Update Payment Allocation Function

  This migration updates the allocate_payment function to remove admission fee references
  and ensure payments are properly allocated between school and bus fees.
  
  1. Changes
    - Remove admission fee allocation logic
    - Ensure payments are allocated to bus fees first, then school fees
    - Update trigger to maintain the same behavior
*/

-- Drop the existing function and recreate it
DROP FUNCTION IF EXISTS allocate_payment();

-- Create the updated function without admission fee logic
CREATE OR REPLACE FUNCTION allocate_payment()
RETURNS TRIGGER AS $$
DECLARE
  student_record RECORD;
  academic_year_id UUID;
  total_bus_fees NUMERIC := 0;
  total_school_fees NUMERIC := 0;
  paid_bus_fees NUMERIC := 0;
  paid_school_fees NUMERIC := 0;
  pending_bus_fees NUMERIC := 0;
  pending_school_fees NUMERIC := 0;
  payment_amount NUMERIC := NEW.amount_paid;
  bus_allocation NUMERIC := 0;
  school_allocation NUMERIC := 0;
BEGIN
  -- Get student details
  SELECT * INTO student_record
  FROM students
  WHERE id = NEW.student_id;
  
  -- Get current academic year
  SELECT id INTO academic_year_id
  FROM academic_years
  WHERE is_current = true;
  
  -- Calculate bus fees if applicable
  IF student_record.has_school_bus AND student_record.village_id IS NOT NULL THEN
    SELECT COALESCE(fee_amount, 0) INTO total_bus_fees
    FROM bus_fee_structure
    WHERE village_id = student_record.village_id
      AND academic_year_id = academic_year_id
      AND is_active = true;
  END IF;
  
  -- Calculate school fees
  SELECT COALESCE(SUM(amount), 0) INTO total_school_fees
  FROM fee_structure
  WHERE class_id = student_record.class_id
    AND academic_year_id = academic_year_id;
  
  -- Get previously paid amounts
  SELECT 
    COALESCE(SUM(pa.bus_fee_amount), 0),
    COALESCE(SUM(pa.school_fee_amount), 0)
  INTO 
    paid_bus_fees,
    paid_school_fees
  FROM fee_payments fp
  JOIN payment_allocation pa ON fp.id = pa.payment_id
  WHERE fp.student_id = NEW.student_id
    AND fp.id != NEW.id;
  
  -- Calculate pending amounts
  pending_bus_fees := GREATEST(0, total_bus_fees - paid_bus_fees);
  pending_school_fees := GREATEST(0, total_school_fees - paid_school_fees);
  
  -- Allocate payment - bus fees first, then school fees
  IF pending_bus_fees > 0 THEN
    bus_allocation := LEAST(payment_amount, pending_bus_fees);
    payment_amount := payment_amount - bus_allocation;
  END IF;
  
  IF payment_amount > 0 AND pending_school_fees > 0 THEN
    school_allocation := LEAST(payment_amount, pending_school_fees);
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
    NEW.student_id,
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