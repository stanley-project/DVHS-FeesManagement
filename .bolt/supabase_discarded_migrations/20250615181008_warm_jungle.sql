/*
  # Create get_class_defaulters function

  1. New Functions
    - `get_class_defaulters(academic_year_id uuid)`
      - Returns class-wise defaulter information
      - Includes class name, teacher name, defaulter count, and outstanding balance
      - Calculates students who have outstanding fees based on fee structure vs payments

  2. Function Details
    - Takes academic_year_id as parameter
    - Joins students, classes, users (teachers), fee_structure, and fee_payments
    - Calculates total fees due vs total payments made per student
    - Groups by class to show defaulter statistics
    - Returns structured data for dashboard display
*/

CREATE OR REPLACE FUNCTION get_class_defaulters(academic_year_id uuid)
RETURNS TABLE (
  class text,
  teacher text,
  defaulter_count integer,
  outstanding_balance numeric
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH student_fees AS (
    -- Calculate total fees due per student for the academic year
    SELECT 
      s.id as student_id,
      s.class_id,
      c.name as class_name,
      u.name as teacher_name,
      COALESCE(SUM(fs.amount), 0) as total_fees_due
    FROM students s
    LEFT JOIN classes c ON s.class_id = c.id
    LEFT JOIN users u ON c.teacher_id = u.id
    LEFT JOIN fee_structure fs ON s.class_id = fs.class_id 
      AND fs.academic_year_id = get_class_defaulters.academic_year_id
    WHERE s.status = 'active'
      AND c.academic_year_id = get_class_defaulters.academic_year_id
    GROUP BY s.id, s.class_id, c.name, u.name
  ),
  student_payments AS (
    -- Calculate total payments made per student
    SELECT 
      pa.student_id,
      COALESCE(SUM(pa.school_fee_amount + pa.bus_fee_amount), 0) as total_paid
    FROM payment_allocation pa
    JOIN fee_payments fp ON pa.payment_id = fp.id
    WHERE fp.payment_date >= (
      SELECT start_date 
      FROM academic_years 
      WHERE id = get_class_defaulters.academic_year_id
    )
    AND fp.payment_date <= (
      SELECT end_date 
      FROM academic_years 
      WHERE id = get_class_defaulters.academic_year_id
    )
    GROUP BY pa.student_id
  ),
  defaulters AS (
    -- Identify students with outstanding balances
    SELECT 
      sf.class_id,
      sf.class_name,
      sf.teacher_name,
      sf.total_fees_due - COALESCE(sp.total_paid, 0) as outstanding
    FROM student_fees sf
    LEFT JOIN student_payments sp ON sf.student_id = sp.student_id
    WHERE sf.total_fees_due > COALESCE(sp.total_paid, 0)
  )
  -- Group by class and return summary
  SELECT 
    COALESCE(d.class_name, 'Unknown Class')::text as class,
    COALESCE(d.teacher_name, 'No Teacher Assigned')::text as teacher,
    COUNT(*)::integer as defaulter_count,
    SUM(d.outstanding)::numeric as outstanding_balance
  FROM defaulters d
  WHERE d.class_id IS NOT NULL
  GROUP BY d.class_name, d.teacher_name
  ORDER BY defaulter_count DESC, outstanding_balance DESC;
END;
$$;