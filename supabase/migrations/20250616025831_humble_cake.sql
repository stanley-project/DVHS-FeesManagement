/*
  # Fix Class Defaulters Function

  This migration fixes the get_class_defaulters function to properly return
  defaulter count and outstanding balance data for the Admin Dashboard.
  
  1. Changes
    - Drop the existing function that has issues with column ambiguity
    - Create a new version with proper column qualification and data formatting
    - Ensure the function returns data in the exact format expected by the frontend
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS get_class_defaulters(uuid);

-- Create the corrected function with proper column names and data
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
      COALESCE((
        SELECT SUM(fs.amount::numeric)
        FROM fee_structure fs
        WHERE fs.class_id = s.class_id 
        AND fs.academic_year_id = $1
      ), 0) as total_fees,
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
      cd.class_name,
      cd.teacher_name,
      COUNT(sd.student_id) FILTER (WHERE sd.total_fees > sd.total_paid) as defaulter_count,
      SUM(GREATEST(0, sd.total_fees - sd.total_paid)) as outstanding_amount
    FROM class_data cd
    LEFT JOIN student_data sd ON cd.class_id = sd.class_id
    GROUP BY cd.class_id, cd.class_name, cd.teacher_name
    HAVING COUNT(sd.student_id) FILTER (WHERE sd.total_fees > sd.total_paid) > 0
  )
  SELECT 
    cs.class_name as class,
    cs.teacher_name as teacher,
    cs.defaulter_count::integer as "defaulterCount",
    TO_CHAR(cs.outstanding_amount, 'FM999,999,999')::text as "outstandingBalance"
  FROM class_summary cs
  ORDER BY cs.defaulter_count DESC;
END;
$$;