-- Fix the payment_allocation table to properly handle student_id references

-- First, ensure we have the payment_allocation table
CREATE TABLE IF NOT EXISTS payment_allocation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid REFERENCES fee_payments(id) ON DELETE CASCADE,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  bus_fee_amount numeric(10,2) DEFAULT 0,
  school_fee_amount numeric(10,2) DEFAULT 0,
  allocation_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_payment_allocation_updated_at ON payment_allocation;
CREATE TRIGGER update_payment_allocation_updated_at
  BEFORE UPDATE ON payment_allocation
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Drop the existing allocate_payment function and trigger
DROP TRIGGER IF EXISTS tr_allocate_payment ON fee_payments;
DROP FUNCTION IF EXISTS allocate_payment CASCADE;

-- Create a new version with proper column qualification
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
  v_months_passed INTEGER;
BEGIN
  -- Get student ID from the payment
  v_student_id := NEW.student_id;
  v_payment_amount := NEW.amount_paid;
  v_academic_year_id := NEW.academic_year_id;
  
  -- Get academic year start date
  SELECT start_date INTO v_academic_year_start_date
  FROM academic_years
  WHERE id = v_academic_year_id;
  
  -- Calculate months passed since academic year start
  v_months_passed := 
    (EXTRACT(YEAR FROM v_current_date) - EXTRACT(YEAR FROM v_academic_year_start_date)) * 12 +
    (EXTRACT(MONTH FROM v_current_date) - EXTRACT(MONTH FROM v_academic_year_start_date)) + 
    CASE WHEN EXTRACT(DAY FROM v_current_date) >= EXTRACT(DAY FROM v_academic_year_start_date) THEN 0 ELSE -1 END + 1;
  
  -- Calculate pending bus fees
  SELECT 
    GREATEST(0, 
      CASE WHEN s.has_school_bus AND s.village_id IS NOT NULL THEN
        COALESCE((
          SELECT bfs.fee_amount::NUMERIC * v_months_passed
          FROM bus_fee_structure bfs
          WHERE bfs.village_id = s.village_id
            AND bfs.academic_year_id = v_academic_year_id
            AND bfs.is_active = true
        ), 0)
      ELSE 0 END - 
      COALESCE((
        SELECT SUM(pa.bus_fee_amount::NUMERIC)
        FROM payment_allocation pa
        WHERE pa.student_id = v_student_id
      ), 0)
    )
  INTO v_pending_bus_fees
  FROM students s
  WHERE s.id = v_student_id;
  
  -- Calculate pending school fees
  WITH student_school_fees AS (
    SELECT 
      COALESCE(SUM(
        CASE 
          WHEN fs.is_recurring_monthly THEN fs.amount::NUMERIC * v_months_passed
          ELSE fs.amount::NUMERIC
        END
      ), 0) AS total_fees
    FROM fee_structure fs
    JOIN students s ON fs.class_id = s.class_id
    WHERE s.id = v_student_id
      AND fs.academic_year_id = v_academic_year_id
      AND (NOT fs.applicable_to_new_students_only OR s.registration_type = 'new')
  ),
  paid_school_fees AS (
    SELECT COALESCE(SUM(pa.school_fee_amount::NUMERIC), 0) AS total_paid
    FROM payment_allocation pa
    WHERE pa.student_id = v_student_id
  )
  SELECT GREATEST(0, ssf.total_fees - psf.total_paid)
  INTO v_pending_school_fees
  FROM student_school_fees ssf, paid_school_fees psf;
  
  -- Allocate payment to bus fees first, then school fees
  IF v_payment_amount <= v_pending_bus_fees THEN
    v_bus_allocation := v_payment_amount;
    v_school_allocation := 0;
  ELSE
    v_bus_allocation := v_pending_bus_fees;
    v_school_allocation := LEAST(v_payment_amount - v_pending_bus_fees, v_pending_school_fees);
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

-- Create a new RPC function for fee payment creation
CREATE OR REPLACE FUNCTION create_fee_payment(payment_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment_id uuid;
  v_result jsonb;
BEGIN
  -- Insert the payment with explicit column names
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
    (payment_data->>'student_id')::uuid,
    (payment_data->>'amount_paid')::numeric,
    (payment_data->>'payment_date')::date,
    (payment_data->>'payment_method')::payment_method,
    payment_data->>'receipt_number',
    payment_data->>'notes',
    (payment_data->>'created_by')::uuid,
    (payment_data->>'academic_year_id')::uuid,
    now(),
    now()
  )
  RETURNING id INTO v_payment_id;
  
  -- Wait for the trigger to complete
  PERFORM pg_sleep(0.1);
  
  -- Get the complete payment with allocation
  SELECT jsonb_build_object(
    'id', fp.id,
    'student_id', fp.student_id,
    'amount_paid', fp.amount_paid,
    'payment_date', fp.payment_date,
    'payment_method', fp.payment_method,
    'receipt_number', fp.receipt_number,
    'notes', fp.notes,
    'created_by', fp.created_by,
    'academic_year_id', fp.academic_year_id,
    'created_at', fp.created_at,
    'updated_at', fp.updated_at,
    'payment_allocation', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', pa.id,
          'payment_id', pa.payment_id,
          'student_id', pa.student_id,
          'bus_fee_amount', pa.bus_fee_amount,
          'school_fee_amount', pa.school_fee_amount,
          'allocation_date', pa.allocation_date,
          'created_at', pa.created_at,
          'updated_at', pa.updated_at
        )
      )
      FROM payment_allocation pa
      WHERE pa.payment_id = v_payment_id
    )
  ) INTO v_result
  FROM fee_payments fp
  WHERE fp.id = v_payment_id;
  
  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_fee_payment TO authenticated;