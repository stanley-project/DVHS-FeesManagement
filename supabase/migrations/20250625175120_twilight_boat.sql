/*
  # Simplify Fee Structure Module

  This migration simplifies the fee structure module by:
  
  1. Removing the 'admission' category from fee_types
  2. Dropping the admission_fee_settings and admission_fee_history tables
  3. Setting all school fees to be monthly recurring by default
  4. Updating database functions to handle monthly fees correctly
  5. Removing unused columns from fee_structure table
*/

-- Remove 'admission' from fee_category enum type
ALTER TYPE fee_category DROP ATTRIBUTE admission;

-- Drop admission fee tables
DROP TABLE IF EXISTS admission_fee_history;
DROP TABLE IF EXISTS admission_fee_settings;

-- Remove unused columns from fee_structure table
ALTER TABLE fee_structure 
  DROP COLUMN IF EXISTS notes,
  DROP COLUMN IF EXISTS last_updated_by,
  DROP COLUMN IF EXISTS applicable_to_new_students_only;

-- Set all school fees to be monthly recurring
UPDATE fee_structure
SET is_recurring_monthly = true
WHERE id IN (
  SELECT fs.id
  FROM fee_structure fs
  JOIN fee_types ft ON fs.fee_type_id = ft.id
  WHERE ft.category = 'school'
);

-- Update bus_fee_structure to ensure it's treated as monthly
COMMENT ON TABLE bus_fee_structure IS 'Bus fee structure with monthly recurring fees';

-- Delete any fee types with 'admission' category
DELETE FROM fee_types WHERE category = 'admission';

-- Update get_analytics_dashboard_data function to handle monthly fees
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
  months_passed INTEGER;
BEGIN
  -- Get total students
  SELECT COUNT(*) INTO total_students
  FROM students
  WHERE status = 'active';
  
  -- Get academic year start date
  SELECT start_date INTO academic_year_start_date
  FROM academic_years
  WHERE id = academic_year_id;
  
  -- Calculate months passed since academic year start
  months_passed := 
    (EXTRACT(YEAR FROM current_date) - EXTRACT(YEAR FROM academic_year_start_date)) * 12 +
    (EXTRACT(MONTH FROM current_date) - EXTRACT(MONTH FROM academic_year_start_date)) + 
    CASE WHEN EXTRACT(DAY FROM current_date) >= EXTRACT(DAY FROM academic_year_start_date) THEN 0 ELSE -1 END + 1;
  
  -- Calculate total expected fees (school and bus fees only)
  -- For school fees, multiply by months passed if is_recurring_monthly is true
  WITH school_fee_calculation AS (
    SELECT 
      s.id AS student_id,
      SUM(
        CASE 
          WHEN fs.is_recurring_monthly THEN fs.amount::NUMERIC * months_passed
          ELSE fs.amount::NUMERIC
        END
      ) AS total_school_fees
    FROM 
      students s
      JOIN classes c ON s.class_id = c.id
      JOIN fee_structure fs ON fs.class_id = c.id AND fs.academic_year_id = academic_year_id
    WHERE 
      s.status = 'active'
      AND c.academic_year_id = academic_year_id
    GROUP BY 
      s.id
  ),
  bus_fee_calculation AS (
    SELECT 
      s.id AS student_id,
      CASE 
        WHEN s.has_school_bus AND s.village_id IS NOT NULL THEN
          COALESCE((
            SELECT bfs.fee_amount::NUMERIC * months_passed
            FROM bus_fee_structure bfs
            WHERE bfs.village_id = s.village_id
              AND bfs.academic_year_id = academic_year_id
              AND bfs.is_active = true
          ), 0)
        ELSE 0
      END AS total_bus_fees
    FROM 
      students s
    WHERE 
      s.status = 'active'
  )
  SELECT 
    COALESCE(SUM(sfc.total_school_fees), 0) + COALESCE(SUM(bfc.total_bus_fees), 0)
  INTO 
    total_expected_fees
  FROM 
    school_fee_calculation sfc
    JOIN bus_fee_calculation bfc ON sfc.student_id = bfc.student_id;
  
  -- Calculate total collected fees
  SELECT COALESCE(SUM(fp.amount_paid::NUMERIC), 0) INTO total_collected_fees
  FROM fee_payments fp;
  
  -- Count defaulters
  WITH student_fees AS (
    SELECT 
      s.id AS student_id,
      SUM(
        CASE 
          WHEN fs.is_recurring_monthly THEN fs.amount::NUMERIC * months_passed
          ELSE fs.amount::NUMERIC
        END
      ) AS total_school_fees,
      CASE 
        WHEN s.has_school_bus AND s.village_id IS NOT NULL THEN
          COALESCE((
            SELECT bfs.fee_amount::NUMERIC * months_passed
            FROM bus_fee_structure bfs
            WHERE bfs.village_id = s.village_id
              AND bfs.academic_year_id = academic_year_id
              AND bfs.is_active = true
          ), 0)
        ELSE 0
      END AS total_bus_fees
    FROM 
      students s
      JOIN classes c ON s.class_id = c.id
      LEFT JOIN fee_structure fs ON fs.class_id = c.id 
                               AND fs.academic_year_id = academic_year_id
    WHERE 
      s.status = 'active'
    GROUP BY 
      s.id, s.has_school_bus, s.village_id
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
  SELECT 
    COUNT(*)
  INTO 
    defaulter_count
  FROM 
    student_fees sf
    LEFT JOIN student_payments sp ON sf.student_id = sp.student_id
  WHERE 
    (sf.total_school_fees + sf.total_bus_fees) > COALESCE(sp.total_paid, 0);
  
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
      SUM(
        CASE 
          WHEN fs.is_recurring_monthly THEN fs.amount::NUMERIC * months_passed
          ELSE fs.amount::NUMERIC
        END
      ) AS school_fees,
      CASE 
        WHEN s.has_school_bus AND s.village_id IS NOT NULL THEN
          COALESCE((
            SELECT bfs.fee_amount::NUMERIC * months_passed
            FROM bus_fee_structure bfs
            WHERE bfs.village_id = s.village_id
              AND bfs.academic_year_id = academic_year_id
              AND bfs.is_active = true
          ), 0)
        ELSE 0
      END AS bus_fees
    FROM 
      students s
      JOIN classes c ON s.class_id = c.id
      LEFT JOIN fee_structure fs ON fs.class_id = c.id 
                               AND fs.academic_year_id = academic_year_id
    WHERE 
      s.status = 'active'
    GROUP BY 
      s.id, s.student_name, s.admission_number, c.name, s.has_school_bus, s.village_id
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

-- Update get_class_fee_status function to handle monthly fees
CREATE OR REPLACE FUNCTION get_class_fee_status(class_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  academic_year_id UUID;
  academic_year_start_date DATE;
  current_date DATE := CURRENT_DATE;
  months_passed INTEGER;
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
  
  -- Calculate months passed since academic year start
  months_passed := 
    (EXTRACT(YEAR FROM current_date) - EXTRACT(YEAR FROM academic_year_start_date)) * 12 +
    (EXTRACT(MONTH FROM current_date) - EXTRACT(MONTH FROM academic_year_start_date)) + 
    CASE WHEN EXTRACT(DAY FROM current_date) >= EXTRACT(DAY FROM academic_year_start_date) THEN 0 ELSE -1 END + 1;
  
  -- Initialize pending array
  pending_array := ARRAY[]::JSON[];
  
  -- For each student in the class
  FOR student_record IN 
    SELECT s.id, s.student_name, s.admission_number, s.has_school_bus, s.village_id
    FROM students s
    WHERE s.class_id = class_id AND s.status = 'active'
  LOOP
    total_students := total_students + 1;
    
    -- Calculate school fees with monthly recurring
    SELECT COALESCE(SUM(
      CASE 
        WHEN fs.is_recurring_monthly THEN fs.amount::NUMERIC * months_passed
        ELSE fs.amount::NUMERIC
      END
    ), 0) INTO student_school_fees
    FROM fee_structure fs
    WHERE fs.class_id = class_id 
      AND fs.academic_year_id = academic_year_id;
    
    -- Add bus fees if applicable
    IF student_record.has_school_bus AND student_record.village_id IS NOT NULL THEN
      SELECT COALESCE(fee_amount::NUMERIC * months_passed, 0) INTO student_bus_fees
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

-- Update get_pending_payments function to handle monthly fees
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
  months_passed INTEGER;
BEGIN
  -- Get academic year start date
  SELECT start_date INTO academic_year_start_date
  FROM academic_years
  WHERE id = academic_year_id;
  
  -- Calculate months passed since academic year start
  months_passed := 
    (EXTRACT(YEAR FROM current_date) - EXTRACT(YEAR FROM academic_year_start_date)) * 12 +
    (EXTRACT(MONTH FROM current_date) - EXTRACT(MONTH FROM academic_year_start_date)) + 
    CASE WHEN EXTRACT(DAY FROM current_date) >= EXTRACT(DAY FROM academic_year_start_date) THEN 0 ELSE -1 END + 1;

  -- For each active student
  FOR student_record IN 
    SELECT 
      s.id, 
      s.student_name AS name, 
      s.admission_number AS admissionNumber,
      c.name AS class,
      s.class_id,
      s.has_school_bus,
      s.village_id
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
        WHEN fs.is_recurring_monthly THEN fs.amount::NUMERIC * months_passed
        ELSE fs.amount::NUMERIC
      END
    ), 0) INTO school_fees
    FROM fee_structure fs
    WHERE fs.class_id = student_record.class_id 
      AND fs.academic_year_id = academic_year_id;
    
    -- Calculate bus fees if applicable
    IF student_record.has_school_bus AND student_record.village_id IS NOT NULL THEN
      SELECT COALESCE(fee_amount::NUMERIC * months_passed, 0) INTO bus_fees
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

-- Create a function to create fee payments with proper RLS bypass
CREATE OR REPLACE FUNCTION create_fee_payment(payment_data JSONB)
RETURNS JSONB AS $$
DECLARE
  payment_id UUID;
  result JSONB;
BEGIN
  -- Insert the payment
  INSERT INTO fee_payments (
    student_id,
    amount_paid,
    payment_date,
    payment_method,
    transaction_id,
    receipt_number,
    notes,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    (payment_data->>'student_id')::UUID,
    (payment_data->>'amount_paid')::NUMERIC,
    (payment_data->>'payment_date')::DATE,
    (payment_data->>'payment_method')::payment_method,
    payment_data->>'transaction_id',
    payment_data->>'receipt_number',
    payment_data->>'notes',
    (payment_data->>'created_by')::UUID,
    COALESCE((payment_data->>'created_at')::TIMESTAMPTZ, NOW()),
    COALESCE((payment_data->>'updated_at')::TIMESTAMPTZ, NOW())
  )
  RETURNING id INTO payment_id;
  
  -- Get the complete payment with allocation
  SELECT 
    jsonb_build_object(
      'id', p.id,
      'student_id', p.student_id,
      'amount_paid', p.amount_paid,
      'payment_date', p.payment_date,
      'payment_method', p.payment_method,
      'transaction_id', p.transaction_id,
      'receipt_number', p.receipt_number,
      'notes', p.notes,
      'created_by', p.created_by,
      'created_at', p.created_at,
      'updated_at', p.updated_at,
      'payment_allocation', COALESCE(
        (
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
          WHERE pa.payment_id = p.id
        ),
        '[]'::jsonb
      )
    ) INTO result
  FROM fee_payments p
  WHERE p.id = payment_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;