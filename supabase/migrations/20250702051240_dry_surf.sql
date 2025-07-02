-- Add metadata column to fee_payments if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fee_payments' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE fee_payments ADD COLUMN metadata JSONB DEFAULT '{}'::JSONB;
  END IF;
END $$;

-- Drop the existing function and trigger
DROP TRIGGER IF EXISTS tr_allocate_payment ON fee_payments;
DROP FUNCTION IF EXISTS allocate_payment CASCADE;

-- Create a new version with equal split option
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
  v_split_equally BOOLEAN := false;
  v_has_school_bus BOOLEAN;
  v_village_id UUID;
BEGIN
  -- Get student ID and payment details
  v_student_id := NEW.student_id;
  v_payment_amount := NEW.amount_paid;
  v_academic_year_id := NEW.academic_year_id;
  
  -- Check if this payment should be split equally (from metadata)
  BEGIN
    v_split_equally := (NEW.metadata->>'split_equally')::BOOLEAN;
  EXCEPTION WHEN OTHERS THEN
    v_split_equally := false;
  END;
  
  -- Get academic year start date
  SELECT start_date INTO v_academic_year_start_date
  FROM academic_years
  WHERE id = v_academic_year_id;
  
  -- Get student details including bus_start_date
  SELECT bus_start_date, has_school_bus, village_id 
  INTO v_bus_start_date, v_has_school_bus, v_village_id
  FROM students
  WHERE id = v_student_id;
  
  -- If bus_start_date is NULL but student has bus, use academic year start date
  IF v_bus_start_date IS NULL AND v_has_school_bus THEN
    v_bus_start_date := v_academic_year_start_date;
  END IF;
  
  -- Calculate months passed for school fees (from academic year start)
  v_months_passed_school := calculate_months_between(v_academic_year_start_date, v_current_date);
  
  -- Calculate months passed for bus fees (from bus start date)
  IF v_bus_start_date IS NOT NULL THEN
    v_months_passed_bus := calculate_months_between(v_bus_start_date, v_current_date);
  ELSE
    v_months_passed_bus := 0;
  END IF;
  
  -- Calculate total bus fees
  IF v_has_school_bus AND v_village_id IS NOT NULL THEN
    SELECT COALESCE(bfs.fee_amount::NUMERIC * v_months_passed_bus, 0)
    INTO v_total_bus_fees
    FROM bus_fee_structure bfs
    WHERE bfs.village_id = v_village_id
      AND bfs.academic_year_id = v_academic_year_id
      AND bfs.is_active = true;
  END IF;
  
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
  RAISE NOTICE 'Student ID: %, Payment Amount: %, Split Equally: %, Total Bus Fees: %, Paid Bus Fees: %, Pending Bus Fees: %, Total School Fees: %, Paid School Fees: %, Pending School Fees: %',
    v_student_id, v_payment_amount, v_split_equally, v_total_bus_fees, v_paid_bus_fees, v_pending_bus_fees, v_total_school_fees, v_paid_school_fees, v_pending_school_fees;
  
  -- Allocate payment based on split option
  IF v_split_equally THEN
    -- Split payment equally between bus and school fees
    v_bus_allocation := ROUND((v_payment_amount / 2)::NUMERIC, 2);
    v_school_allocation := v_payment_amount - v_bus_allocation; -- Ensure exact total
    
    -- If bus allocation exceeds pending bus fees, reallocate excess to school fees
    IF v_bus_allocation > v_pending_bus_fees THEN
      v_school_allocation := v_school_allocation + (v_bus_allocation - v_pending_bus_fees);
      v_bus_allocation := v_pending_bus_fees;
    END IF;
    
    -- If school allocation exceeds pending school fees, reallocate excess to bus fees
    IF v_school_allocation > v_pending_school_fees THEN
      v_bus_allocation := v_bus_allocation + (v_school_allocation - v_pending_school_fees);
      v_school_allocation := v_pending_school_fees;
    END IF;
  ELSE
    -- Standard allocation: bus fees first, then school fees
    IF v_payment_amount <= v_pending_bus_fees THEN
      -- If payment amount is less than or equal to pending bus fees, allocate all to bus fees
      v_bus_allocation := v_payment_amount;
      v_school_allocation := 0;
    ELSE
      -- If payment amount is more than pending bus fees, allocate remaining to school fees
      v_bus_allocation := v_pending_bus_fees;
      v_school_allocation := LEAST(v_payment_amount - v_pending_bus_fees, v_pending_school_fees);
    END IF;
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

-- Create a new RPC function for fee payment insertion with equal split option
CREATE OR REPLACE FUNCTION insert_fee_payment_v3(
  p_student_id uuid,
  p_amount_paid numeric,
  p_payment_date date,
  p_payment_method payment_method,
  p_receipt_number text,
  p_notes text,
  p_created_by uuid,
  p_academic_year_id uuid,
  p_split_equally boolean DEFAULT false
) 
RETURNS jsonb 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  v_payment_id uuid;
  v_result jsonb;
BEGIN
  -- Insert into fee_payments table with metadata for split option
  INSERT INTO fee_payments (
    student_id,
    amount_paid,
    payment_date,
    payment_method,
    receipt_number,
    notes,
    created_by,
    academic_year_id,
    metadata,
    created_at,
    updated_at
  ) VALUES (
    p_student_id,
    p_amount_paid,
    p_payment_date,
    p_payment_method,
    p_receipt_number,
    p_notes,
    p_created_by,
    p_academic_year_id,
    jsonb_build_object('split_equally', p_split_equally),
    NOW(),
    NOW()
  ) RETURNING id INTO v_payment_id;
  
  -- The allocate_payment trigger will handle the payment allocation
  
  -- Return the payment ID and success status
  v_result := jsonb_build_object(
    'payment_id', v_payment_id,
    'success', true
  );
  
  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION insert_fee_payment_v3 TO authenticated;

-- Create a function to recalculate a specific payment allocation
CREATE OR REPLACE FUNCTION recalculate_payment_allocation(p_payment_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  payment_record RECORD;
BEGIN
  -- Get the payment record
  SELECT * INTO payment_record
  FROM fee_payments
  WHERE id = p_payment_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;
  
  -- Delete existing allocation for this payment
  DELETE FROM payment_allocation
  WHERE payment_id = p_payment_id;
  
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
      metadata,
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
      payment_record.metadata,
      payment_record.created_at,
      payment_record.updated_at
    )
    RETURNING id
  )
  -- Delete the temporary record
  DELETE FROM fee_payments
  WHERE id IN (SELECT id FROM temp_payment);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION recalculate_payment_allocation TO authenticated;

-- Update the recalculate all function to handle equal splits
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
        metadata,
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
        COALESCE(payment_record.metadata, '{}'::jsonb),
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION recalculate_all_payment_allocations TO authenticated;