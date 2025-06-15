/*
  # Fix ambiguous column reference in get_class_defaulters function

  1. Database Functions
    - Drop and recreate the `get_class_defaulters` function with properly qualified column references
    - Fix ambiguous `academic_year_id` references by using table aliases
    - Ensure the function returns class-wise defaulter information correctly

  2. Function Logic
    - Get students who have outstanding fees for the given academic year
    - Group by class and calculate defaulter counts
    - Return structured data for dashboard display
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS get_class_defaulters(uuid);

-- Create the corrected function with proper column qualification
CREATE OR REPLACE FUNCTION get_class_defaulters(academic_year_id uuid)
RETURNS TABLE (
  class_name text,
  total_students bigint,
  defaulters_count bigint,
  collection_percentage numeric
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH class_students AS (
    SELECT 
      c.name as class_name,
      COUNT(s.id) as total_students
    FROM classes c
    LEFT JOIN students s ON s.class_id = c.id AND s.status = 'active'
    WHERE c.academic_year_id = $1
    GROUP BY c.id, c.name
  ),
  student_payments AS (
    SELECT 
      c.name as class_name,
      s.id as student_id,
      COALESCE(SUM(fp.amount_paid), 0) as total_paid,
      COALESCE(SUM(
        CASE 
          WHEN ft.category = 'school' THEN fs.amount
          WHEN ft.category = 'bus' AND s.has_school_bus THEN bfs.fee_amount
          WHEN ft.category = 'admission' AND s.registration_type = 'new' THEN afs.amount
          ELSE 0
        END
      ), 0) as total_due
    FROM students s
    JOIN classes c ON s.class_id = c.id
    LEFT JOIN fee_payments fp ON fp.student_id = s.id
    LEFT JOIN fee_structure fs ON fs.class_id = c.id AND fs.academic_year_id = c.academic_year_id
    LEFT JOIN fee_types ft ON ft.id = fs.fee_type_id
    LEFT JOIN bus_fee_structure bfs ON bfs.village_id = s.village_id AND bfs.academic_year_id = c.academic_year_id
    LEFT JOIN admission_fee_settings afs ON afs.academic_year_id = c.academic_year_id AND afs.is_active = true
    WHERE c.academic_year_id = $1 AND s.status = 'active'
    GROUP BY c.name, s.id
  ),
  defaulters_summary AS (
    SELECT 
      sp.class_name,
      COUNT(*) as defaulters_count
    FROM student_payments sp
    WHERE sp.total_paid < sp.total_due
    GROUP BY sp.class_name
  )
  SELECT 
    cs.class_name,
    cs.total_students,
    COALESCE(ds.defaulters_count, 0) as defaulters_count,
    CASE 
      WHEN cs.total_students > 0 THEN 
        ROUND(((cs.total_students - COALESCE(ds.defaulters_count, 0))::numeric / cs.total_students::numeric) * 100, 2)
      ELSE 0
    END as collection_percentage
  FROM class_students cs
  LEFT JOIN defaulters_summary ds ON cs.class_name = ds.class_name
  ORDER BY cs.class_name;
END;
$$;