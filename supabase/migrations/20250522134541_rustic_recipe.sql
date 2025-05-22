/*
  # Academic Year Management and Student Promotion System

  1. New Tables
    - `academic_year_transitions` - Tracks academic year transitions and promotions
    - `student_promotion_history` - Detailed history of student promotions
    - `academic_year_settings` - Configuration for academic years

  2. Changes
    - Add new columns to `academic_years` table
    - Add new columns to `students` table
    - Add new columns to `fee_structure` table

  3. Security
    - Enable RLS on new tables
    - Add policies for administrators and accountants
*/

-- Add new columns to academic_years table
ALTER TABLE academic_years
  ADD COLUMN IF NOT EXISTS transition_status text CHECK (transition_status IN ('pending', 'in_progress', 'completed')) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS transition_date timestamptz,
  ADD COLUMN IF NOT EXISTS previous_year_id uuid REFERENCES academic_years(id),
  ADD COLUMN IF NOT EXISTS next_year_id uuid REFERENCES academic_years(id);

-- Create academic year transitions table
CREATE TABLE IF NOT EXISTS academic_year_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_year_id uuid NOT NULL REFERENCES academic_years(id),
  to_year_id uuid NOT NULL REFERENCES academic_years(id),
  status text CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')) DEFAULT 'pending',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  total_students integer DEFAULT 0,
  promoted_students integer DEFAULT 0,
  retained_students integer DEFAULT 0,
  transferred_students integer DEFAULT 0,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create student promotion history table
CREATE TABLE IF NOT EXISTS student_promotion_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id),
  academic_year_id uuid NOT NULL REFERENCES academic_years(id),
  from_class_id uuid NOT NULL REFERENCES classes(id),
  to_class_id uuid NOT NULL REFERENCES classes(id),
  promotion_status promotion_status NOT NULL,
  promotion_date date NOT NULL,
  remarks text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create academic year settings table
CREATE TABLE IF NOT EXISTS academic_year_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id uuid NOT NULL REFERENCES academic_years(id),
  setting_key text NOT NULL,
  setting_value jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (academic_year_id, setting_key)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_academic_year_transitions_from_year ON academic_year_transitions(from_year_id);
CREATE INDEX IF NOT EXISTS idx_academic_year_transitions_to_year ON academic_year_transitions(to_year_id);
CREATE INDEX IF NOT EXISTS idx_student_promotion_history_student ON student_promotion_history(student_id);
CREATE INDEX IF NOT EXISTS idx_student_promotion_history_academic_year ON student_promotion_history(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_academic_year_settings_year ON academic_year_settings(academic_year_id);

-- Enable RLS
ALTER TABLE academic_year_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_promotion_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_year_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for academic_year_transitions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Administrators can manage academic year transitions' AND polrelid = 'academic_year_transitions'::regclass) THEN
        CREATE POLICY "Administrators can manage academic year transitions"
        ON academic_year_transitions
        FOR ALL
        TO authenticated
        USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'All authenticated users can view academic year transitions' AND polrelid = 'academic_year_transitions'::regclass) THEN
        CREATE POLICY "All authenticated users can view academic year transitions"
        ON academic_year_transitions
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;
END$$;

-- Create policies for student_promotion_history
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Administrators and accountants can manage student promotion history' AND polrelid = 'student_promotion_history'::regclass) THEN
        CREATE POLICY "Administrators and accountants can manage student promotion history"
        ON student_promotion_history
        FOR ALL
        TO authenticated
        USING ((auth.jwt() ->> 'role'::text) = ANY (ARRAY['administrator'::text, 'accountant'::text]));
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'All authenticated users can view student promotion history' AND polrelid = 'student_promotion_history'::regclass) THEN
        CREATE POLICY "All authenticated users can view student promotion history"
        ON student_promotion_history
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;
END$$;

-- Create policies for academic_year_settings
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Administrators can manage academic year settings' AND polrelid = 'academic_year_settings'::regclass) THEN
        CREATE POLICY "Administrators can manage academic year settings"
        ON academic_year_settings
        FOR ALL
        TO authenticated
        USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'All authenticated users can view academic year settings' AND polrelid = 'academic_year_settings'::regclass) THEN
        CREATE POLICY "All authenticated users can view academic year settings"
        ON academic_year_settings
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;
END$$;

-- Create triggers for updated_at columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_academic_year_transitions_updated_at' AND tgrelid = 'academic_year_transitions'::regclass) THEN
        CREATE TRIGGER update_academic_year_transitions_updated_at
        BEFORE UPDATE ON academic_year_transitions
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_student_promotion_history_updated_at' AND tgrelid = 'student_promotion_history'::regclass) THEN
        CREATE TRIGGER update_student_promotion_history_updated_at
        BEFORE UPDATE ON student_promotion_history
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_academic_year_settings_updated_at' AND tgrelid = 'academic_year_settings'::regclass) THEN
        CREATE TRIGGER update_academic_year_settings_updated_at
        BEFORE UPDATE ON academic_year_settings
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END$$;