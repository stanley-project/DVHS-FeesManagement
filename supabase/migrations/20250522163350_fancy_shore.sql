/*
  # Enhanced Student Registration Schema

  1. New Tables
    - `student_registration_history`
      - Tracks student registration history across academic years
      - Records registration type, dates, and status changes

  2. Changes
    - Add new columns to `students` table for enhanced registration tracking
    - Add constraints and indexes for data integrity
    - Update RLS policies

  3. Security
    - Enable RLS on new tables
    - Add policies for administrators and accountants
*/

-- Create registration history table
CREATE TABLE IF NOT EXISTS student_registration_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id),
  academic_year_id uuid NOT NULL REFERENCES academic_years(id),
  registration_type registration_type NOT NULL,
  registration_date date NOT NULL,
  previous_status student_status,
  new_status student_status NOT NULL,
  reason text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_student_registration_history_student 
ON student_registration_history(student_id);
CREATE INDEX IF NOT EXISTS idx_student_registration_history_academic_year 
ON student_registration_history(academic_year_id);

-- Enable RLS
ALTER TABLE student_registration_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Administrators and accountants can manage registration history"
ON student_registration_history
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = ANY (ARRAY['administrator', 'accountant'])
)
WITH CHECK (
  auth.jwt() ->> 'role' = ANY (ARRAY['administrator', 'accountant'])
);

CREATE POLICY "All authenticated users can view registration history"
ON student_registration_history
FOR SELECT
TO authenticated
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_student_registration_history_updated_at
BEFORE UPDATE ON student_registration_history
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add new columns to students table
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS last_registration_date date,
  ADD COLUMN IF NOT EXISTS last_registration_type registration_type,
  ADD COLUMN IF NOT EXISTS previous_admission_number text,
  ADD COLUMN IF NOT EXISTS rejoining_reason text;

-- Create function to update student registration history
CREATE OR REPLACE FUNCTION update_student_registration_history()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR 
      OLD.status != NEW.status OR 
      OLD.registration_type != NEW.registration_type) THEN
    INSERT INTO student_registration_history (
      student_id,
      academic_year_id,
      registration_type,
      registration_date,
      previous_status,
      new_status,
      reason,
      created_by
    ) VALUES (
      NEW.id,
      (SELECT id FROM academic_years WHERE is_current = true),
      NEW.registration_type,
      COALESCE(NEW.last_registration_date, CURRENT_DATE),
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
      NEW.status,
      NEW.rejoining_reason,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for student registration history
CREATE TRIGGER track_student_registration_changes
AFTER INSERT OR UPDATE ON students
FOR EACH ROW
EXECUTE FUNCTION update_student_registration_history();