-- Fix the fee calculation system to properly handle monthly recurring fees

-- First, ensure all school fees are set to monthly recurring
UPDATE fee_structure
SET is_recurring_monthly = true
WHERE id IN (
  SELECT fs.id
  FROM fee_structure fs
  JOIN fee_types ft ON fs.fee_type_id = ft.id
  WHERE ft.category = 'school'
);

-- Update fee_structure table to add applicable_to_new_students_only column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'fee_structure' AND column_name = 'applicable_to_new_students_only'
  ) THEN
    ALTER TABLE fee_structure ADD COLUMN applicable_to_new_students_only BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Create or replace the allocate_payment function to properly handle fee allocation
CREATE OR REPLACE FUNCTION allocate_payment()
RETURNS TRIGGER AS $$
DECLARE
  student_id UUID;
  pending_bus_fees NUMERIC := 0;
  pending_school_fees NUMERIC := 0;
  payment_amount NUMERIC;
  bus_allocation NUMERIC := 0;
  school_allocation NUMERIC := 0;
  academic_year_id UUID;
  academic_year_start_date DATE;
  current_date DATE := CURRENT_DATE;
  months_passed INTEGER;
BEGIN
  -- Get student ID from the payment
  student_id := NEW.student_id;
  payment_amount := NEW.amount_paid;
  
  -- Get current academic year and start date
  SELECT id, start_date INTO academic_year_id, academic_year_start_date
  FROM academic_years
  WHERE is_current = true;
  
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
            AND bfs.academic_year_id = academic_year_id
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
      AND fs.academic_year_id = academic_year_id
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

-- Fix due dates in fee_structure to align with academic year
UPDATE fee_structure fs
SET due_date = (
  SELECT ay.start_date
  FROM academic_years ay
  WHERE ay.id = fs.academic_year_id
)
WHERE due_date < (
  SELECT ay.start_date
  FROM academic_years ay
  WHERE ay.id = fs.academic_year_id
);

-- Create a function to get the correct due date based on academic year
CREATE OR REPLACE FUNCTION get_next_due_date(academic_year_id UUID)
RETURNS DATE AS $$
DECLARE
  academic_year_start DATE;
BEGIN
  -- Get the academic year start date
  SELECT start_date INTO academic_year_start
  FROM academic_years
  WHERE id = academic_year_id;
  
  -- Return the start date of the academic year
  RETURN academic_year_start;
END;
$$ LANGUAGE plpgsql;