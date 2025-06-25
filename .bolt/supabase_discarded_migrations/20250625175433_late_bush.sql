-- Drop existing functions first to avoid return type errors
DROP FUNCTION IF EXISTS get_class_defaulters(uuid);

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

-- Create new get_class_defaulters function with correct return type
CREATE OR REPLACE FUNCTION get_class_defaulters(academic_year_id uuid)
RETURNS TABLE (
  class text,
  teacher text,
  "defaulterCount" integer,
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