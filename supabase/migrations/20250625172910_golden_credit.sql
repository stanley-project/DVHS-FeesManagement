/*
  # Update Analytics Functions

  This migration updates the analytics functions to remove admission fee references
  and ensure calculations only include school and bus fees.
  
  1. Changes
    - Update get_analytics_dashboard_data function
    - Update get_class_defaulters function
    - Update get_pending_payments function
    - Update get_class_fee_status function
*/

-- Update get_analytics_dashboard_data function
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
BEGIN
  -- Get total students
  SELECT COUNT(*) INTO total_students
  FROM students
  WHERE status = 'active';
  
  -- Calculate total expected fees (school and bus fees only)
  SELECT COALESCE(SUM(fs.amount::NUMERIC), 0) INTO total_expected_fees
  FROM fee_structure fs
  JOIN classes c ON fs.class_id = c.id
  WHERE c.academic_year_id = get_analytics_dashboard_data.academic_year_id;
  
  -- Add bus fees to total expected fees
  total_expected_fees := total_expected_fees + (
    SELECT COALESCE(SUM(bfs.fee_amount::NUMERIC), 0)
    FROM bus_fee_structure bfs
    JOIN students s ON bfs.village_id = s.village_id
    WHERE bfs.academic_year_id = get_analytics_dashboard_data.academic_year_id
      AND s.has_school_bus = true
      AND s.status = 'active'
  );
  
  -- Calculate total collected fees
  SELECT COALESCE(SUM(fp.amount_paid::NUMERIC), 0) INTO total_collected_fees
  FROM fee_payments fp;
  
  -- Count defaulters
  SELECT COUNT(DISTINCT s.id) INTO defaulter_count
  FROM students s
  JOIN classes c ON s.class_id = c.id
  LEFT JOIN (
    SELECT 
      student_id, 
      SUM(amount_paid::NUMERIC) AS total_paid
    FROM fee_payments
    GROUP BY student_id
  ) fp ON s.id = fp.student_id
  LEFT JOIN (
    SELECT 
      class_id, 
      SUM(amount::NUMERIC) AS total_fees
    FROM fee_structure
    WHERE academic_year_id = get_analytics_dashboard_data.academic_year_id
    GROUP BY class_id
  ) fs ON s.class_id = fs.class_id
  WHERE 
    s.status = 'active'
    AND c.academic_year_id = get_analytics_dashboard_data.academic_year_id
    AND (COALESCE(fp.total_paid, 0) < COALESCE(fs.total_fees, 0));
  
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
      COALESCE(SUM(fs.amount::NUMERIC), 0) AS school_fees,
      CASE WHEN s.has_school_bus AND s.village_id IS NOT NULL THEN
        COALESCE((
          SELECT fee_amount
          FROM bus_fee_structure
          WHERE village_id = s.village_id
            AND academic_year_id = get_analytics_dashboard_data.academic_year_id
            AND is_active = true
        ), 0)
      ELSE 0 END AS bus_fees
    FROM 
      students s
      JOIN classes c ON s.class_id = c.id
      LEFT JOIN fee_structure fs ON s.class_id = fs.class_id AND fs.academic_year_id = get_analytics_dashboard_data.academic_year_id
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

-- Update get_class_defaulters function
CREATE OR REPLACE FUNCTION get_class_defaulters(academic_year_id uuid)
RETURNS TABLE (
  class text,
  teacher text,
  "defaulterCount" bigint,
  "outstandingBalance" text
) 
LANGUAGE plpgsql
AS $$
BEGIN
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
      -- Calculate school fees
      COALESCE((
        SELECT SUM(fs.amount::numeric)
        FROM fee_structure fs
        WHERE fs.class_id = s.class_id 
        AND fs.academic_year_id = $1
      ), 0) as school_fees,
      -- Calculate bus fees
      CASE WHEN s.has_school_bus AND s.village_id IS NOT NULL THEN
        COALESCE((
          SELECT bfs.fee_amount::numeric
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
    WHERE s.status = 'active'
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

-- Update get_class_fee_status function
CREATE OR REPLACE FUNCTION get_class_fee_status(class_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  academic_year_id UUID;
  student_record RECORD;
  total_students INTEGER := 0;
  paid_count INTEGER := 0;
  partial_count INTEGER := 0;
  pending_count INTEGER := 0;
  pending_students JSON := '[]';
  student_fees NUMERIC;
  student_paid NUMERIC;
  pending_array JSON[];
BEGIN
  -- Get academic year ID
  SELECT c.academic_year_id INTO academic_year_id
  FROM classes c
  WHERE c.id = class_id;
  
  -- Initialize pending array
  pending_array := ARRAY[]::JSON[];
  
  -- For each student in the class
  FOR student_record IN 
    SELECT s.id, s.student_name, s.admission_number, s.has_school_bus, s.village_id
    FROM students s
    WHERE s.class_id = class_id AND s.status = 'active'
  LOOP
    total_students := total_students + 1;
    
    -- Calculate school fees
    SELECT COALESCE(SUM(amount::NUMERIC), 0) INTO student_fees
    FROM fee_structure
    WHERE class_id = class_id AND academic_year_id = academic_year_id;
    
    -- Add bus fees if applicable
    IF student_record.has_school_bus AND student_record.village_id IS NOT NULL THEN
      student_fees := student_fees + COALESCE((
        SELECT fee_amount::NUMERIC
        FROM bus_fee_structure
        WHERE village_id = student_record.village_id
          AND academic_year_id = academic_year_id
          AND is_active = true
      ), 0);
    END IF;
    
    -- Calculate paid amount
    SELECT COALESCE(SUM(amount_paid::NUMERIC), 0) INTO student_paid
    FROM fee_payments
    WHERE student_id = student_record.id;
    
    -- Determine fee status
    IF student_paid >= student_fees THEN
      paid_count := paid_count + 1;
    ELSIF student_paid > 0 THEN
      partial_count := partial_count + 1;
      
      -- Add to pending students if significant amount pending
      IF (student_fees - student_paid) > 5000 THEN
        pending_array := array_append(
          pending_array, 
          json_build_object(
            'id', student_record.id,
            'name', student_record.student_name,
            'admissionNumber', student_record.admission_number,
            'outstandingAmount', student_fees - student_paid,
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
          'outstandingAmount', student_fees,
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

-- Update get_pending_payments function
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
BEGIN
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
    -- Calculate school fees
    SELECT COALESCE(SUM(amount::NUMERIC), 0) INTO school_fees
    FROM fee_structure
    WHERE class_id = student_record.class_id AND academic_year_id = academic_year_id;
    
    -- Calculate bus fees if applicable
    IF student_record.has_school_bus AND student_record.village_id IS NOT NULL THEN
      SELECT COALESCE(fee_amount::NUMERIC, 0) INTO bus_fees
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