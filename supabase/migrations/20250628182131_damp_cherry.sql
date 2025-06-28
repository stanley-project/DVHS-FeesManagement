/*
  # Add Bus Start Date for Fee Calculation

  This migration adds a bus_start_date column to the students table to track when
  each student started using the bus service. This allows for more accurate bus fee
  calculation based on actual usage period rather than the entire academic year.

  1. Changes:
    - Add bus_start_date column to students table
    - Backfill existing bus users with academic year start date
    - Update fee calculation functions to use bus_start_date
    - Add helper function to calculate months between dates

  2. Benefits:
    - More accurate bus fee calculation
    - Fairer billing for students who start using bus mid-year
    - Better tracking of bus service usage
*/

-- Add bus_start_date column to students table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'bus_start_date'
  ) THEN
    ALTER TABLE students ADD COLUMN bus_start_date DATE;
  END IF;
END $$;

-- Backfill bus_start_date for existing bus users with academic year start date
UPDATE students s
SET bus_start_date = (
  SELECT ay.start_date
  FROM academic_years ay
  WHERE ay.is_current = true
  LIMIT 1
)
WHERE s.has_school_bus = true 
AND s.bus_start_date IS NULL;

-- Create a function to calculate months between dates (inclusive of start month)
CREATE OR REPLACE FUNCTION calculate_months_between(
  start_date DATE,
  end_date DATE
) RETURNS INTEGER AS $$
BEGIN
  RETURN (
    (EXTRACT(YEAR FROM end_date) - EXTRACT(YEAR FROM start_date)) * 12 +
    (EXTRACT(MONTH FROM end_date) - EXTRACT(MONTH FROM start_date)) +
    CASE WHEN EXTRACT(DAY FROM end_date) >= EXTRACT(DAY FROM start_date) THEN 0 ELSE -1 END +
    1  -- Add 1 to include the start month
  );
END;
$$ LANGUAGE plpgsql;

-- Update allocate_payment function to use bus_start_date
DROP FUNCTION IF EXISTS allocate_payment CASCADE;

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
BEGIN
  -- Get student ID from the payment
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
  
  -- Calculate pending bus fees
  SELECT 
    GREATEST(0, 
      CASE WHEN s.has_school_bus AND s.village_id IS NOT NULL THEN
        COALESCE((
          SELECT bfs.fee_amount::NUMERIC * v_months_passed_bus
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
          WHEN fs.is_recurring_monthly THEN fs.amount::NUMERIC * v_months_passed_school
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

-- Update get_analytics_dashboard_data function to use bus_start_date
DROP FUNCTION IF EXISTS get_analytics_dashboard_data(uuid);

CREATE OR REPLACE FUNCTION get_analytics_dashboard_data(academic_year_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  total_expected_fees NUMERIC := 0;
  total_collected_fees NUMERIC := 0;
  total_students INTEGER := 0;
  defaulter_count INTEGER := 0;
  online_payment_count INTEGER := 0;
  top_defaulters JSON;
  academic_year_start_date DATE;
  current_date DATE := CURRENT_DATE;
  months_passed_school INTEGER;
BEGIN
  -- Get total students
  SELECT COUNT(*) INTO total_students
  FROM students
  WHERE status = 'active';
  
  -- Get academic year start date
  SELECT start_date INTO academic_year_start_date
  FROM academic_years
  WHERE id = academic_year_id;
  
  -- Calculate months passed for school fees
  months_passed_school := calculate_months_between(academic_year_start_date, current_date);
  
  -- Calculate total expected fees (school and bus fees)
  WITH student_fees AS (
    SELECT 
      s.id,
      -- School fees
      COALESCE(SUM(
        CASE 
          WHEN fs.is_recurring_monthly THEN fs.amount::NUMERIC * months_passed_school
          ELSE fs.amount::NUMERIC
        END
      ), 0) AS school_fees,
      -- Bus fees (using bus_start_date)
      CASE WHEN s.has_school_bus AND s.village_id IS NOT NULL THEN
        COALESCE((
          SELECT bfs.fee_amount::NUMERIC * calculate_months_between(
            COALESCE(s.bus_start_date, academic_year_start_date), 
            current_date
          )
          FROM bus_fee_structure bfs
          WHERE bfs.village_id = s.village_id
            AND bfs.academic_year_id = get_analytics_dashboard_data.academic_year_id
            AND bfs.is_active = true
        ), 0)
      ELSE 0 END AS bus_fees
    FROM 
      students s
      LEFT JOIN fee_structure fs ON s.class_id = fs.class_id 
                               AND fs.academic_year_id = get_analytics_dashboard_data.academic_year_id
                               AND (NOT fs.applicable_to_new_students_only OR s.registration_type = 'new')
    WHERE 
      s.status = 'active'
    GROUP BY 
      s.id, s.has_school_bus, s.village_id, s.bus_start_date
  )
  SELECT COALESCE(SUM(school_fees + bus_fees), 0) INTO total_expected_fees
  FROM student_fees;
  
  -- Calculate total collected fees
  SELECT COALESCE(SUM(fp.amount_paid::NUMERIC), 0) INTO total_collected_fees
  FROM fee_payments fp;
  
  -- Count defaulters
  WITH student_fees AS (
    SELECT 
      s.id,
      -- School fees
      COALESCE(SUM(
        CASE 
          WHEN fs.is_recurring_monthly THEN fs.amount::NUMERIC * months_passed_school
          ELSE fs.amount::NUMERIC
        END
      ), 0) AS school_fees,
      -- Bus fees (using bus_start_date)
      CASE WHEN s.has_school_bus AND s.village_id IS NOT NULL THEN
        COALESCE((
          SELECT bfs.fee_amount::NUMERIC * calculate_months_between(
            COALESCE(s.bus_start_date, academic_year_start_date), 
            current_date
          )
          FROM bus_fee_structure bfs
          WHERE bfs.village_id = s.village_id
            AND bfs.academic_year_id = get_analytics_dashboard_data.academic_year_id
            AND bfs.is_active = true
        ), 0)
      ELSE 0 END AS bus_fees
    FROM 
      students s
      LEFT JOIN fee_structure fs ON s.class_id = fs.class_id 
                               AND fs.academic_year_id = get_analytics_dashboard_data.academic_year_id
                               AND (NOT fs.applicable_to_new_students_only OR s.registration_type = 'new')
    WHERE 
      s.status = 'active'
    GROUP BY 
      s.id, s.has_school_bus, s.village_id, s.bus_start_date
  ),
  student_payments AS (
    SELECT 
      student_id,
      COALESCE(SUM(amount_paid::NUMERIC), 0) AS total_paid
    FROM 
      fee_payments
    GROUP BY 
      student_id
  )
  SELECT COUNT(*) INTO defaulter_count
  FROM student_fees sf
  LEFT JOIN student_payments sp ON sf.id = sp.student_id
  WHERE (sf.school_fees + sf.bus_fees) > COALESCE(sp.total_paid, 0);
  
  -- Count online payments
  SELECT COUNT(DISTINCT student_id) INTO online_payment_count
  FROM fee_payments
  WHERE payment_method = 'online';
  
  -- Get top defaulters
  WITH student_fees AS (
    SELECT 
      s.id,
      s.student_name,
      s.admission_number,
      c.name AS class_name,
      -- School fees
      COALESCE(SUM(
        CASE 
          WHEN fs.is_recurring_monthly THEN fs.amount::NUMERIC * months_passed_school
          ELSE fs.amount::NUMERIC
        END
      ), 0) AS school_fees,
      -- Bus fees (using bus_start_date)
      CASE WHEN s.has_school_bus AND s.village_id IS NOT NULL THEN
        COALESCE((
          SELECT bfs.fee_amount::NUMERIC * calculate_months_between(
            COALESCE(s.bus_start_date, academic_year_start_date), 
            current_date
          )
          FROM bus_fee_structure bfs
          WHERE bfs.village_id = s.village_id
            AND bfs.academic_year_id = get_analytics_dashboard_data.academic_year_id
            AND bfs.is_active = true
        ), 0)
      ELSE 0 END AS bus_fees
    FROM 
      students s
      JOIN classes c ON s.class_id = c.id
      LEFT JOIN fee_structure fs ON s.class_id = fs.class_id 
                               AND fs.academic_year_id = get_analytics_dashboard_data.academic_year_id
                               AND (NOT fs.applicable_to_new_students_only OR s.registration_type = 'new')
    WHERE 
      s.status = 'active'
    GROUP BY 
      s.id, s.student_name, s.admission_number, c.name, s.has_school_bus, s.village_id, s.bus_start_date
  ),
  student_payments AS (
    SELECT 
      student_id,
      COALESCE(SUM(amount_paid::NUMERIC), 0) AS total_paid
    FROM 
      fee_payments
    GROUP BY 
      student_id
  ),
  defaulters AS (
    SELECT 
      sf.id,
      sf.student_name AS name,
      sf.class_name AS class,
      sf.admission_number AS "admissionNumber",
      (sf.school_fees + sf.bus_fees) - COALESCE(sp.total_paid, 0) AS "outstandingAmount",
      floor(random() * 90)::INTEGER AS "daysOverdue"
    FROM 
      student_fees sf
      LEFT JOIN student_payments sp ON sf.id = sp.student_id
    WHERE 
      (sf.school_fees + sf.bus_fees) > COALESCE(sp.total_paid, 0)
    ORDER BY 
      "outstandingAmount" DESC
    LIMIT 5
  )
  SELECT json_agg(d) INTO top_defaulters
  FROM defaulters d;
  
  -- Calculate metrics
  SELECT json_build_object(
    'collectionEfficiency', CASE WHEN total_expected_fees > 0 THEN 
                              ROUND((total_collected_fees / total_expected_fees) * 100)
                            ELSE 0 END,
    'avgCollectionPerStudent', CASE WHEN total_students > 0 THEN 
                                 ROUND(total_collected_fees / total_students)
                               ELSE 0 END,
    'defaultRate', CASE WHEN total_students > 0 THEN 
                      ROUND((defaulter_count::NUMERIC / total_students) * 100)
                    ELSE 0 END,
    'onlinePaymentRate', CASE WHEN total_students > 0 THEN 
                            ROUND((online_payment_count::NUMERIC / total_students) * 100)
                          ELSE 0 END,
    'topDefaulters', COALESCE(top_defaulters, '[]'::JSON)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Update get_class_defaulters function to use bus_start_date
DROP FUNCTION IF EXISTS get_class_defaulters(uuid);

CREATE OR REPLACE FUNCTION get_class_defaulters(academic_year_id uuid)
RETURNS TABLE (
  class text,
  teacher text,
  "defaulterCount" bigint,
  "outstandingBalance" text
) 
LANGUAGE plpgsql
AS $$
DECLARE
  academic_year_start_date DATE;
  current_date DATE := CURRENT_DATE;
  months_passed_school INTEGER;
BEGIN
  -- Get academic year start date
  SELECT start_date INTO academic_year_start_date
  FROM academic_years
  WHERE id = academic_year_id;
  
  -- Calculate months passed for school fees
  months_passed_school := calculate_months_between(academic_year_start_date, current_date);

  RETURN QUERY
  WITH class_data AS (
    SELECT 
      c.id as class_id,
      c.name as class_name,
      COALESCE(u.name, 'Unassigned') as teacher_name
    FROM classes c
    LEFT JOIN users u ON c.teacher_id = u.id
    WHERE c.academic_year_id = $1
  ),
  student_data AS (
    SELECT 
      s.id as student_id,
      s.class_id,
      -- Calculate school fees with monthly recurring
      COALESCE(SUM(
        CASE 
          WHEN fs.is_recurring_monthly THEN fs.amount::NUMERIC * months_passed_school
          ELSE fs.amount::NUMERIC
        END
      ), 0) as school_fees,
      -- Calculate bus fees with monthly recurring (using bus_start_date)
      CASE WHEN s.has_school_bus AND s.village_id IS NOT NULL THEN
        COALESCE((
          SELECT bfs.fee_amount::NUMERIC * calculate_months_between(
            COALESCE(s.bus_start_date, academic_year_start_date), 
            current_date
          )
          FROM bus_fee_structure bfs
          WHERE bfs.village_id = s.village_id 
          AND bfs.academic_year_id = $1
          AND bfs.is_active = true
        ), 0)
      ELSE 0 END as bus_fees,
      -- Get paid amount
      COALESCE((
        SELECT SUM(fp.amount_paid::numeric)
        FROM fee_payments fp
        WHERE fp.student_id = s.id
      ), 0) as total_paid
    FROM students s
    LEFT JOIN fee_structure fs ON fs.class_id = s.class_id 
                             AND fs.academic_year_id = $1
                             AND (NOT fs.applicable_to_new_students_only OR s.registration_type = 'new')
    WHERE s.status = 'active'
    GROUP BY s.id, s.class_id, s.has_school_bus, s.village_id, s.bus_start_date
  ),
  class_summary AS (
    SELECT 
      cd.class_id,
      cd.class_name,
      cd.teacher_name,
      COUNT(sd.student_id) FILTER (WHERE (sd.school_fees + sd.bus_fees) > sd.total_paid) as defaulter_count,
      SUM(GREATEST(0, (sd.school_fees + sd.bus_fees) - sd.total_paid)) as total_outstanding
    FROM class_data cd
    LEFT JOIN student_data sd ON cd.class_id = sd.class_id
    GROUP BY cd.class_id, cd.class_name, cd.teacher_name
    HAVING COUNT(sd.student_id) FILTER (WHERE (sd.school_fees + sd.bus_fees) > sd.total_paid) > 0
  )
  SELECT 
    cs.class_name as class,
    cs.teacher_name as teacher,
    cs.defaulter_count as "defaulterCount",
    TO_CHAR(cs.total_outstanding, 'FM999,999,999,999') as "outstandingBalance"
  FROM class_summary cs
  ORDER BY cs.defaulter_count DESC;
END;
$$;

-- Update get_class_fee_status function to use bus_start_date
DROP FUNCTION IF EXISTS get_class_fee_status(uuid);

CREATE OR REPLACE FUNCTION get_class_fee_status(class_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  academic_year_id UUID;
  academic_year_start_date DATE;
  current_date DATE := CURRENT_DATE;
  months_passed_school INTEGER;
  student_record RECORD;
  total_students INTEGER := 0;
  paid_count INTEGER := 0;
  partial_count INTEGER := 0;
  pending_count INTEGER := 0;
  pending_students JSON := '[]';
  student_school_fees NUMERIC;
  student_bus_fees NUMERIC;
  student_total_fees NUMERIC;
  student_paid NUMERIC;
  pending_array JSON[];
BEGIN
  -- Get academic year ID and start date
  SELECT ay.id, ay.start_date INTO academic_year_id, academic_year_start_date
  FROM classes c
  JOIN academic_years ay ON c.academic_year_id = ay.id
  WHERE c.id = class_id;
  
  -- Calculate months passed for school fees
  months_passed_school := calculate_months_between(academic_year_start_date, current_date);
  
  -- Initialize pending array
  pending_array := ARRAY[]::JSON[];
  
  -- For each student in the class
  FOR student_record IN 
    SELECT s.id, s.student_name, s.admission_number, s.has_school_bus, s.village_id, s.registration_type, s.bus_start_date
    FROM students s
    WHERE s.class_id = class_id AND s.status = 'active'
  LOOP
    total_students := total_students + 1;
    
    -- Calculate school fees with monthly recurring
    SELECT COALESCE(SUM(
      CASE 
        WHEN fs.is_recurring_monthly THEN fs.amount::NUMERIC * months_passed_school
        ELSE fs.amount::NUMERIC
      END
    ), 0) INTO student_school_fees
    FROM fee_structure fs
    WHERE fs.class_id = class_id 
      AND fs.academic_year_id = academic_year_id
      AND (NOT fs.applicable_to_new_students_only OR student_record.registration_type = 'new');
    
    -- Add bus fees if applicable (using bus_start_date)
    IF student_record.has_school_bus AND student_record.village_id IS NOT NULL THEN
      SELECT COALESCE(fee_amount::NUMERIC * calculate_months_between(
        COALESCE(student_record.bus_start_date, academic_year_start_date), 
        current_date
      ), 0) INTO student_bus_fees
      FROM bus_fee_structure
      WHERE village_id = student_record.village_id
        AND academic_year_id = academic_year_id
        AND is_active = true;
    ELSE
      student_bus_fees := 0;
    END IF;
    
    -- Calculate total fees
    student_total_fees := student_school_fees + student_bus_fees;
    
    -- Calculate paid amount
    SELECT COALESCE(SUM(amount_paid::NUMERIC), 0) INTO student_paid
    FROM fee_payments
    WHERE student_id = student_record.id;
    
    -- Determine fee status
    IF student_paid >= student_total_fees THEN
      paid_count := paid_count + 1;
    ELSIF student_paid > 0 THEN
      partial_count := partial_count + 1;
      
      -- Add to pending students if significant amount pending
      IF (student_total_fees - student_paid) > 5000 THEN
        pending_array := array_append(
          pending_array, 
          json_build_object(
            'id', student_record.id,
            'name', student_record.student_name,
            'admissionNumber', student_record.admission_number,
            'outstandingAmount', student_total_fees - student_paid,
            'dueIn', floor(random() * 7) + 1
          )
        );
      END IF;
    ELSE
      pending_count := pending_count + 1;
      
      -- Add to pending students
      pending_array := array_append(
        pending_array, 
        json_build_object(
          'id', student_record.id,
          'name', student_record.student_name,
          'admissionNumber', student_record.admission_number,
          'outstandingAmount', student_total_fees,
          'dueIn', floor(random() * 7) + 1
        )
      );
    END IF;
  END LOOP;
  
  -- Convert pending array to JSON
  SELECT json_agg(p) INTO pending_students
  FROM (
    SELECT value
    FROM json_array_elements(to_json(pending_array))
    ORDER BY (value->>'dueIn')::INTEGER
    LIMIT 3
  ) p;
  
  -- Build result JSON
  SELECT json_build_object(
    'total_students', total_students,
    'paid_count', paid_count,
    'partial_count', partial_count,
    'pending_count', pending_count,
    'pending_students', COALESCE(pending_students, '[]'::JSON)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Update get_pending_payments function to use bus_start_date
DROP FUNCTION IF EXISTS get_pending_payments(uuid, integer);

CREATE OR REPLACE FUNCTION get_pending_payments(academic_year_id UUID, limit_count INTEGER)
RETURNS TABLE (
  id UUID,
  name TEXT,
  admissionNumber TEXT,
  class TEXT,
  outstandingAmount NUMERIC,
  dueIn INTEGER
) AS $$
DECLARE
  student_record RECORD;
  school_fees NUMERIC;
  bus_fees NUMERIC;
  total_fees NUMERIC;
  paid_amount NUMERIC;
  outstanding NUMERIC;
  academic_year_start_date DATE;
  current_date DATE := CURRENT_DATE;
  months_passed_school INTEGER;
BEGIN
  -- Get academic year start date
  SELECT start_date INTO academic_year_start_date
  FROM academic_years
  WHERE id = academic_year_id;
  
  -- Calculate months passed for school fees
  months_passed_school := calculate_months_between(academic_year_start_date, current_date);

  -- For each active student
  FOR student_record IN 
    SELECT 
      s.id, 
      s.student_name AS name, 
      s.admission_number AS admissionNumber,
      c.name AS class,
      s.class_id,
      s.has_school_bus,
      s.village_id,
      s.registration_type,
      s.bus_start_date
    FROM 
      students s
      JOIN classes c ON s.class_id = c.id
    WHERE 
      s.status = 'active'
      AND c.academic_year_id = academic_year_id
  LOOP
    -- Calculate school fees with monthly recurring
    SELECT COALESCE(SUM(
      CASE 
        WHEN fs.is_recurring_monthly THEN fs.amount::NUMERIC * months_passed_school
        ELSE fs.amount::NUMERIC
      END
    ), 0) INTO school_fees
    FROM fee_structure fs
    WHERE fs.class_id = student_record.class_id 
      AND fs.academic_year_id = academic_year_id
      AND (NOT fs.applicable_to_new_students_only OR student_record.registration_type = 'new');
    
    -- Calculate bus fees if applicable (using bus_start_date)
    IF student_record.has_school_bus AND student_record.village_id IS NOT NULL THEN
      SELECT COALESCE(fee_amount::NUMERIC * calculate_months_between(
        COALESCE(student_record.bus_start_date, academic_year_start_date), 
        current_date
      ), 0) INTO bus_fees
      FROM bus_fee_structure
      WHERE village_id = student_record.village_id
        AND academic_year_id = academic_year_id
        AND is_active = true;
    ELSE
      bus_fees := 0;
    END IF;
    
    -- Calculate total fees
    total_fees := school_fees + bus_fees;
    
    -- Calculate paid amount
    SELECT COALESCE(SUM(amount_paid::NUMERIC), 0) INTO paid_amount
    FROM fee_payments
    WHERE student_id = student_record.id;
    
    -- Calculate outstanding amount
    outstanding := total_fees - paid_amount;
    
    -- If outstanding amount, include in results
    IF outstanding > 0 THEN
      id := student_record.id;
      name := student_record.name;
      admissionNumber := student_record.admissionNumber;
      class := student_record.class;
      outstandingAmount := outstanding;
      dueIn := floor(random() * 7) + 1; -- Mock due days
      
      RETURN NEXT;
      
      -- Limit results if needed
      limit_count := limit_count - 1;
      IF limit_count <= 0 THEN
        RETURN;
      END IF;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;