/*
  # Refactor Fee Collection for Manual Fee Input

  1. New Tables
    - `manual_payment_allocation` - Stores manually entered fee allocations
  
  2. Changes
    - Drops automatic allocation trigger and functions
    - Adds new functions for manual payment allocation
  
  3. Security
    - Enables RLS on new tables
    - Adds appropriate policies
*/

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

-- Drop the existing automatic allocation trigger and function
DROP TRIGGER IF EXISTS tr_allocate_payment ON fee_payments;
DROP FUNCTION IF EXISTS allocate_payment CASCADE;

-- Create a new table for manual payment allocations
CREATE TABLE IF NOT EXISTS manual_payment_allocation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES fee_payments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  bus_fee_amount NUMERIC(10,2) DEFAULT 0,
  school_fee_amount NUMERIC(10,2) DEFAULT 0,
  allocation_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create trigger to update updated_at column
CREATE TRIGGER update_manual_payment_allocation_updated_at
BEFORE UPDATE ON manual_payment_allocation
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on the new table
ALTER TABLE manual_payment_allocation ENABLE ROW LEVEL SECURITY;

-- Add policies for the new table
CREATE POLICY "Administrators and accountants can manage manual payment allocations"
  ON manual_payment_allocation
  FOR ALL
  TO authenticated
  USING ((jwt() ->> 'role'::text) = ANY (ARRAY['administrator'::text, 'accountant'::text]))
  WITH CHECK ((jwt() ->> 'role'::text) = ANY (ARRAY['administrator'::text, 'accountant'::text]));

CREATE POLICY "All users can read manual payment allocations"
  ON manual_payment_allocation
  FOR SELECT
  TO authenticated
  USING (true);

-- Create a function to insert a payment with manual allocation
CREATE OR REPLACE FUNCTION insert_manual_fee_payment(
  p_student_id UUID,
  p_amount_paid NUMERIC,
  p_payment_date DATE,
  p_payment_method payment_method,
  p_receipt_number TEXT,
  p_notes TEXT,
  p_created_by UUID,
  p_academic_year_id UUID,
  p_bus_fee_amount NUMERIC DEFAULT 0,
  p_school_fee_amount NUMERIC DEFAULT 0
) 
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  v_payment_id UUID;
  v_result JSONB;
BEGIN
  -- Validate that the sum of allocations equals the total payment
  IF (p_bus_fee_amount + p_school_fee_amount) <> p_amount_paid THEN
    RAISE EXCEPTION 'Sum of fee allocations (%) must equal total payment amount (%)', 
      (p_bus_fee_amount + p_school_fee_amount), p_amount_paid;
  END IF;

  -- Insert into fee_payments table
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
      'manual_allocation', true,
      'bus_fee_amount', p_bus_fee_amount,
      'school_fee_amount', p_school_fee_amount
    ),
    NOW(),
    NOW()
  ) RETURNING id INTO v_payment_id;
  
  -- Insert manual allocation record
  INSERT INTO manual_payment_allocation (
    payment_id,
    student_id,
    bus_fee_amount,
    school_fee_amount,
    allocation_date
  ) VALUES (
    v_payment_id,
    p_student_id,
    p_bus_fee_amount,
    p_school_fee_amount,
    p_payment_date
  );
  
  -- Return the payment ID and success status
  v_result := jsonb_build_object(
    'payment_id', v_payment_id,
    'success', true,
    'bus_fee_amount', p_bus_fee_amount,
    'school_fee_amount', p_school_fee_amount
  );
  
  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION insert_manual_fee_payment TO authenticated;

-- Create a function to update a payment with manual allocation
CREATE OR REPLACE FUNCTION update_manual_fee_payment(
  p_payment_id UUID,
  p_amount_paid NUMERIC,
  p_payment_date DATE,
  p_payment_method payment_method,
  p_notes TEXT,
  p_bus_fee_amount NUMERIC DEFAULT 0,
  p_school_fee_amount NUMERIC DEFAULT 0
) 
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  v_student_id UUID;
BEGIN
  -- Validate that the sum of allocations equals the total payment
  IF (p_bus_fee_amount + p_school_fee_amount) <> p_amount_paid THEN
    RAISE EXCEPTION 'Sum of fee allocations (%) must equal total payment amount (%)', 
      (p_bus_fee_amount + p_school_fee_amount), p_amount_paid;
  END IF;

  -- Get the student ID from the payment
  SELECT student_id INTO v_student_id
  FROM fee_payments
  WHERE id = p_payment_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  -- Update the payment record
  UPDATE fee_payments
  SET 
    amount_paid = p_amount_paid,
    payment_date = p_payment_date,
    payment_method = p_payment_method,
    notes = p_notes,
    metadata = jsonb_build_object(
      'manual_allocation', true,
      'bus_fee_amount', p_bus_fee_amount,
      'school_fee_amount', p_school_fee_amount
    ),
    updated_at = NOW()
  WHERE id = p_payment_id;
  
  -- Delete existing allocation
  DELETE FROM manual_payment_allocation
  WHERE payment_id = p_payment_id;
  
  -- Insert new allocation record
  INSERT INTO manual_payment_allocation (
    payment_id,
    student_id,
    bus_fee_amount,
    school_fee_amount,
    allocation_date
  ) VALUES (
    p_payment_id,
    v_student_id,
    p_bus_fee_amount,
    p_school_fee_amount,
    p_payment_date
  );
  
  RETURN TRUE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_manual_fee_payment TO authenticated;

-- Create a function to get student fee status with manual allocations
CREATE OR REPLACE FUNCTION get_student_fee_status(
  p_student_id UUID,
  p_academic_year_id UUID
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
  WHERE fs.class_id = v_student.class_id
    AND fs.academic_year_id = p_academic_year_id
    AND (NOT fs.applicable_to_new_students_only OR v_student.registration_type = 'new');
  
  -- Calculate total fees
  v_total_bus_fees := v_monthly_bus_fee * v_months_passed_bus;
  v_total_school_fees := v_monthly_school_fee * v_months_passed_school;
  
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
    'monthly_school_fee', v_monthly_school_fee
  );
  
  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_student_fee_status TO authenticated;

-- Migrate existing payment allocations to the new manual system
DO $$
DECLARE
  payment_record RECORD;
  allocation_record RECORD;
BEGIN
  -- For each payment with an allocation, create a manual allocation
  FOR payment_record IN 
    SELECT fp.* 
    FROM fee_payments fp
    JOIN payment_allocation pa ON fp.id = pa.payment_id
  LOOP
    -- Get the allocation for this payment
    SELECT * INTO allocation_record
    FROM payment_allocation
    WHERE payment_id = payment_record.id
    LIMIT 1;
    
    -- Insert into manual_payment_allocation
    INSERT INTO manual_payment_allocation (
      payment_id,
      student_id,
      bus_fee_amount,
      school_fee_amount,
      allocation_date,
      created_at,
      updated_at
    ) VALUES (
      payment_record.id,
      payment_record.student_id,
      allocation_record.bus_fee_amount,
      allocation_record.school_fee_amount,
      payment_record.payment_date,
      payment_record.created_at,
      payment_record.updated_at
    );
    
    -- Update payment metadata
    UPDATE fee_payments
    SET metadata = jsonb_build_object(
      'manual_allocation', true,
      'bus_fee_amount', allocation_record.bus_fee_amount,
      'school_fee_amount', allocation_record.school_fee_amount
    )
    WHERE id = payment_record.id;
  END LOOP;
END;
$$;

-- Create index on manual_payment_allocation
CREATE INDEX IF NOT EXISTS idx_manual_payment_allocation_payment_id ON manual_payment_allocation(payment_id);
CREATE INDEX IF NOT EXISTS idx_manual_payment_allocation_student_id ON manual_payment_allocation(student_id);