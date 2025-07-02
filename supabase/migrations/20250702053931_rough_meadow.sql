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

-- Create a new version with proportional split option
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
  v_current_date DATE := CURRENT_DATE;
  v_months_passed_school INTEGER;
  v_months_passed_bus INTEGER;
  v_total_bus_fees NUMERIC := 0;
  v_total_school_fees NUMERIC := 0;
  v_paid_bus_fees NUMERIC := 0;
  v_paid_school_fees NUMERIC := 0;
  v_split_type TEXT := 'standard';
  v_student_record RECORD;
  v_total_monthly_due NUMERIC := 0;
  v_monthly_bus_fee NUMERIC := 0;
  v_monthly_school_fee NUMERIC := 0;
  v_bus_ratio NUMERIC := 0;
  v_school_ratio NUMERIC := 0;
  v_payment_period TEXT := 'current';
  v_payment_months INTEGER := 1;
  v_remaining_payment NUMERIC := 0;
BEGIN
  -- Get student ID and payment details
  v_student_id := NEW.student_id;
  v_payment_amount := NEW.amount_paid;
  v_academic_year_id := NEW.academic_year_id;
  v_remaining_payment := v_payment_amount;
  
  -- Check metadata for split type and payment period
  BEGIN
    v_split_type := COALESCE(NEW.metadata->>'split_type', 'standard');
    v_payment_period := COALESCE(NEW.metadata->>'payment_period', 'current');
    v_payment_months := COALESCE((NEW.metadata->>'payment_months')::INTEGER, 1);
  EXCEPTION WHEN OTHERS THEN
    v_split_type := 'standard';
    v_payment_period := 'current';
    v_payment_months := 1;
  END;
  
  -- Get academic year start date
  SELECT start_date INTO v_academic_year_start_date
  FROM academic_years
  WHERE id = v_academic_year_id;
  
  -- Get student details
  SELECT * INTO v_student_record
  FROM students
  WHERE id = v_student_id;
  
  -- Calculate months passed for school fees (from academic year start)
  v_months_passed_school := calculate_months_between(v_academic_year_start_date, v_current_date);
  
  -- Calculate months passed for bus fees (from bus start date)
  IF v_student_record.bus_start_date IS NOT NULL THEN
    v_months_passed_bus := calculate_months_between(v_student_record.bus_start_date, v_current_date);
  ELSE
    v_months_passed_bus := v_student_record.has_school_bus ? v_months_passed_school : 0;
  END IF;
  
  -- Get monthly bus fee if applicable
  IF v_student_record.has_school_bus AND v_student_record.village_id IS NOT NULL THEN
    SELECT COALESCE(bfs.fee_amount::NUMERIC, 0)
    INTO v_monthly_bus_fee
    FROM bus_fee_structure bfs
    WHERE bfs.village_id = v_student_record.village_id
      AND bfs.academic_year_id = v_academic_year_id
      AND bfs.is_active = true;
  END IF;
  
  -- Get monthly school fee
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN fs.is_recurring_monthly THEN fs.amount::NUMERIC
        ELSE fs.amount::NUMERIC / v_months_passed_school
      END
    ), 0)
  INTO v_monthly_school_fee
  FROM fee_structure fs
  WHERE fs.class_id = v_student_record.class_id
    AND fs.academic_year_id = v_academic_year_id
    AND (NOT fs.applicable_to_new_students_only OR v_student_record.registration_type = 'new');
  
  -- Calculate total monthly due
  v_total_monthly_due := v_monthly_bus_fee + v_monthly_school_fee;
  
  -- Calculate fee ratios
  IF v_total_monthly_due > 0 THEN
    v_bus_ratio := v_monthly_bus_fee / v_total_monthly_due;
    v_school_ratio := v_monthly_school_fee / v_total_monthly_due;
  ELSE
    v_bus_ratio := 0;
    v_school_ratio := 1; -- Default to school fees if no monthly due
  END IF;
  
  -- Calculate total fees
  v_total_bus_fees := v_monthly_bus_fee * v_months_passed_bus;
  v_total_school_fees := v_monthly_school_fee * v_months_passed_school;
  
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
  RAISE NOTICE 'Student ID: %, Payment Amount: %, Split Type: %, Monthly Bus Fee: %, Monthly School Fee: %, Bus Ratio: %, School Ratio: %',
    v_student_id, v_payment_amount, v_split_type, v_monthly_bus_fee, v_monthly_school_fee, v_bus_ratio, v_school_ratio;
  
  -- Allocate payment based on split type
  IF v_split_type = 'proportional' THEN
    -- Proportional split based on monthly fee ratios
    v_bus_allocation := ROUND(v_payment_amount * v_bus_ratio, 2);
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
  ELSIF v_split_type = 'equal' THEN
    -- Equal split between bus and school fees
    v_bus_allocation := ROUND(v_payment_amount / 2, 2);
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
      v_bus_allocation := v_payment_amount;
      v_school_allocation := 0;
    ELSE
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

-- Create a new RPC function for fee payment insertion with proportional split option
CREATE OR REPLACE FUNCTION insert_fee_payment_v4(
  p_student_id uuid,
  p_amount_paid numeric,
  p_payment_date date,
  p_payment_method payment_method,
  p_receipt_number text,
  p_notes text,
  p_created_by uuid,
  p_academic_year_id uuid,
  p_split_type text DEFAULT 'standard',
  p_payment_period text DEFAULT 'current',
  p_payment_months integer DEFAULT 1
) 
RETURNS jsonb 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  v_payment_id uuid;
  v_result jsonb;
BEGIN
  -- Insert into fee_payments table with metadata for split options
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
    jsonb_build_object(
      'split_type', p_split_type,
      'payment_period', p_payment_period,
      'payment_months', p_payment_months
    ),
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
GRANT EXECUTE ON FUNCTION insert_fee_payment_v4 TO authenticated;

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

-- Update the recalculate all function to handle proportional splits
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