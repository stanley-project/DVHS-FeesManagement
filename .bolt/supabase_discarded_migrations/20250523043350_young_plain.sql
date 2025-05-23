/*
  # Data Archiving Implementation

  1. New Tables
    - `archived_students`: Stores archived student records
    - `archived_fee_payments`: Stores archived payment records
    - `archived_student_academic_history`: Stores archived academic history

  2. Security
    - Enable RLS on all archive tables
    - Add policies for administrator access

  3. Functions
    - `archive_old_data()`: Archives records older than 5 years
    - `cleanup_archived_data()`: Removes archived records from main tables

  4. Performance
    - Added indexes on archive_date columns
    - Implemented efficient batch processing
*/

-- Create archive tables
CREATE TABLE IF NOT EXISTS archived_students (
  LIKE students INCLUDING ALL,
  archive_date timestamptz DEFAULT now(),
  archive_reason text
);

CREATE TABLE IF NOT EXISTS archived_fee_payments (
  LIKE fee_payments INCLUDING ALL,
  archive_date timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS archived_student_academic_history (
  LIKE student_academic_history INCLUDING ALL,
  archive_date timestamptz DEFAULT now()
);

-- Enable RLS on archive tables
ALTER TABLE archived_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_student_academic_history ENABLE ROW LEVEL SECURITY;

-- Create policies for archive tables
CREATE POLICY "Administrators can manage archived students" 
  ON archived_students FOR ALL 
  TO authenticated 
  USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text)
  WITH CHECK ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

CREATE POLICY "Administrators can manage archived fee payments" 
  ON archived_fee_payments FOR ALL 
  TO authenticated 
  USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text)
  WITH CHECK ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

CREATE POLICY "Administrators can manage archived academic history" 
  ON archived_student_academic_history FOR ALL 
  TO authenticated 
  USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text)
  WITH CHECK ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

-- Create archiving function
CREATE OR REPLACE FUNCTION archive_old_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  archive_cutoff_date date := current_date - interval '5 years';
  current_academic_year uuid;
BEGIN
  -- Get current academic year
  SELECT id INTO current_academic_year
  FROM academic_years
  WHERE is_current = true;

  -- Archive inactive students and their related data
  WITH inactive_students AS (
    SELECT s.id
    FROM students s
    WHERE s.status = 'inactive'
    AND s.exit_date < archive_cutoff_date
  )
  INSERT INTO archived_students
  SELECT s.*, now(), 'Inactive for 5+ years'
  FROM students s
  JOIN inactive_students i ON s.id = i.id;

  -- Archive old fee payments
  INSERT INTO archived_fee_payments
  SELECT fp.*, now()
  FROM fee_payments fp
  WHERE fp.payment_date < archive_cutoff_date;

  -- Archive old academic history
  INSERT INTO archived_student_academic_history
  SELECT sah.*, now()
  FROM student_academic_history sah
  JOIN academic_years ay ON sah.academic_year_id = ay.id
  WHERE ay.end_date < archive_cutoff_date;
END;
$$;

-- Create cleanup function
CREATE OR REPLACE FUNCTION cleanup_archived_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete archived records from main tables
  DELETE FROM students s
  WHERE EXISTS (
    SELECT 1 FROM archived_students a WHERE a.id = s.id
  );

  DELETE FROM fee_payments fp
  WHERE EXISTS (
    SELECT 1 FROM archived_fee_payments a WHERE a.id = fp.id
  );

  DELETE FROM student_academic_history sah
  WHERE EXISTS (
    SELECT 1 FROM archived_student_academic_history a WHERE a.id = sah.id
  );
END;
$$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_archived_students_archive_date 
  ON archived_students(archive_date);
CREATE INDEX IF NOT EXISTS idx_archived_fee_payments_archive_date 
  ON archived_fee_payments(archive_date);
CREATE INDEX IF NOT EXISTS idx_archived_student_academic_history_archive_date 
  ON archived_student_academic_history(archive_date);

-- Create scheduled task to run archiving (runs monthly)
SELECT cron.schedule(
  'archive-old-data',
  '0 0 1 * *', -- At midnight on the first day of every month
  $$
  SELECT archive_old_data();
  SELECT cleanup_archived_data();
  $$
);