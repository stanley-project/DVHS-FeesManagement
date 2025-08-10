/*
  # Fix Class Defaulters Function

  This migration fixes the get_class_defaulters function to return data in the format
  expected by the frontend DefaultersTable component.
  
  1. Changes
    - Drop the existing function that returns incorrect column structure
    - Create a new function that returns the exact columns needed by the frontend:
      * class (string)
      * teacher (string)
      * defaulterCount (integer)
      * outstandingBalance (string - formatted currency)
    - Fix the query to properly handle teacher names and format currency values
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS get_class_defaulters(uuid);

-- Create the corrected function with proper column names matching frontend expectations
CREATE OR REPLACE FUNCTION get_class_defaulters(academic_year_id uuid)
RETURNS TABLE (
  class text,
  teacher text,
  defaulterCount bigint,
  outstandingBalance text
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH class_students AS (
    SELECT 
      c.id as class_id,
      c.name as class_name,
      u.name as teacher_name,
      COUNT(s.id) as total_students
    FROM classes c
    LEFT JOIN users u ON c.teacher_id = u.id
    LEFT JOIN students s ON s.class_id = c.id AND s.status = 'active'
    WHERE c.academic_year_id = $1
    GROUP BY c.id, c.name, u.name
  ),
  student_payments AS (
    SELECT 
      s.class_id,
      s.id as student_id,
      COALESCE(SUM(fp.amount_paid), 0) as total_paid
    FROM students s
    LEFT JOIN fee_payments fp ON fp.student_id = s.id
    WHERE s.status = 'active'
    GROUP BY s.class_id, s.id
  ),
  student_fees AS (
    SELECT 
      fs.class_id,
      SUM(fs.amount) as class_fee_amount
    FROM fee_structure fs
    WHERE fs.academic_year_id = $1
    GROUP BY fs.class_id
  ),
  defaulters_summary AS (
    SELECT 
      cs.class_id,
      cs.class_name as class,
      COALESCE(cs.teacher_name, 'Unassigned') as teacher,
      COUNT(sp.student_id) FILTER (WHERE sp.total_paid < sf.class_fee_amount) as defaulterCount,
      SUM(GREATEST(0, sf.class_fee_amount - sp.total_paid)) as total_outstanding
    FROM class_students cs
    JOIN student_fees sf ON cs.class_id = sf.class_id
    JOIN student_payments sp ON cs.class_id = sp.class_id
    GROUP BY cs.class_id, cs.class_name, cs.teacher_name
    HAVING COUNT(sp.student_id) FILTER (WHERE sp.total_paid < sf.class_fee_amount) > 0
  )
  SELECT 
    ds.class,
    ds.teacher,
    ds.defaulterCount,
    TO_CHAR(ds.total_outstanding, 'FM999,999,999,999') as outstandingBalance
  FROM defaulters_summary ds
  ORDER BY ds.defaulterCount DESC;
END;
$$;