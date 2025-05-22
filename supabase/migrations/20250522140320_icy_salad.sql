/*
  # Student Registration and Village Management System

  1. New Tables
    - villages: Stores village information for bus fee calculation
    - student_academic_history: Tracks student's academic journey
    - bus_fee_structure: Manages bus fees for different villages

  2. Changes
    - Added new columns to students table for village and bus service
    - Added new columns to fee_types and fee_structure for better fee management
    - Added indexes for performance optimization

  3. Security
    - Enabled RLS on all new tables
    - Added policies for administrators and authenticated users
*/

-- Create new enum if not exists
DO $$ BEGIN
  CREATE TYPE promotion_status AS ENUM ('promoted', 'retained', 'transferred_out', 'dropped_out');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create Villages table
CREATE TABLE IF NOT EXISTS villages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  distance_from_school numeric(5,2) NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_villages_name ON villages USING btree (name);

-- Create Student Academic History table
CREATE TABLE IF NOT EXISTS student_academic_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id),
  academic_year_id uuid NOT NULL REFERENCES academic_years(id),
  class_id uuid NOT NULL REFERENCES classes(id),
  section text NOT NULL,
  promotion_status promotion_status,
  is_active_in_year boolean DEFAULT true,
  registration_date_for_year date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_academic_history_student ON student_academic_history(student_id);
CREATE INDEX IF NOT EXISTS idx_student_academic_history_academic_year ON student_academic_history(academic_year_id);

-- Create Bus Fee Structure table
CREATE TABLE IF NOT EXISTS bus_fee_structure (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  village_id uuid NOT NULL REFERENCES villages(id),
  fee_amount numeric(10,2) NOT NULL,
  academic_year_id uuid NOT NULL REFERENCES academic_years(id),
  effective_from_date date NOT NULL,
  effective_to_date date NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT bus_fee_date_check CHECK (effective_to_date > effective_from_date)
);

CREATE INDEX IF NOT EXISTS idx_bus_fee_structure_village_id ON bus_fee_structure(village_id);
CREATE INDEX IF NOT EXISTS idx_bus_fee_structure_academic_year ON bus_fee_structure(academic_year_id);
CREATE UNIQUE INDEX IF NOT EXISTS bus_fee_structure_village_id_academic_year_id_key ON bus_fee_structure(village_id, academic_year_id);

-- Modify Students table
ALTER TABLE students 
  ADD COLUMN IF NOT EXISTS village_id uuid REFERENCES villages(id),
  ADD COLUMN IF NOT EXISTS has_school_bus boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS registration_type registration_type DEFAULT 'new';

CREATE INDEX IF NOT EXISTS idx_students_village_id ON students(village_id);

-- Modify Fee Types table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fee_category') THEN
    CREATE TYPE fee_category AS ENUM ('admission', 'school', 'bus');
  END IF;
END $$;

ALTER TABLE fee_types
  ADD COLUMN IF NOT EXISTS category fee_category DEFAULT 'school',
  ADD COLUMN IF NOT EXISTS is_monthly boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_for_new_students_only boolean DEFAULT false;

-- Modify Fee Structure table
ALTER TABLE fee_structure
  ADD COLUMN IF NOT EXISTS village_id uuid REFERENCES villages(id),
  ADD COLUMN IF NOT EXISTS applicable_to_new_students_only boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_recurring_monthly boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_fee_structure_village_id ON fee_structure(village_id);

-- Enable RLS on new tables
ALTER TABLE villages ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_academic_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_fee_structure ENABLE ROW LEVEL SECURITY;

-- Create policies for Villages
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Administrators can manage villages' AND polrelid = 'villages'::regclass) THEN
        CREATE POLICY "Administrators can manage villages" ON villages FOR ALL TO authenticated USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'All authenticated users can view villages' AND polrelid = 'villages'::regclass) THEN
        CREATE POLICY "All authenticated users can view villages" ON villages FOR SELECT TO authenticated USING (true);
    END IF;
END$$;

-- Create policies for Student Academic History
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Administrators and accountants can manage student academic history' AND polrelid = 'student_academic_history'::regclass) THEN
        CREATE POLICY "Administrators and accountants can manage student academic history" ON student_academic_history FOR ALL TO authenticated USING ((auth.jwt() ->> 'role'::text) = ANY (ARRAY['administrator'::text, 'accountant'::text]));
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'All authenticated users can view student academic history' AND polrelid = 'student_academic_history'::regclass) THEN
        CREATE POLICY "All authenticated users can view student academic history" ON student_academic_history FOR SELECT TO authenticated USING (true);
    END IF;
END$$;

-- Create policies for Bus Fee Structure
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Administrators can manage bus fee structure' AND polrelid = 'bus_fee_structure'::regclass) THEN
        CREATE POLICY "Administrators can manage bus fee structure" ON bus_fee_structure FOR ALL TO authenticated USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'All authenticated users can view bus fee structure' AND polrelid = 'bus_fee_structure'::regclass) THEN
        CREATE POLICY "All authenticated users can view bus fee structure" ON bus_fee_structure FOR SELECT TO authenticated USING (true);
    END IF;
END$$;

-- Create triggers for updated_at columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_villages_updated_at' AND tgrelid = 'villages'::regclass) THEN
        CREATE TRIGGER update_villages_updated_at
        BEFORE UPDATE ON villages
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_student_academic_history_updated_at' AND tgrelid = 'student_academic_history'::regclass) THEN
        CREATE TRIGGER update_student_academic_history_updated_at
        BEFORE UPDATE ON student_academic_history
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_bus_fee_structure_updated_at' AND tgrelid = 'bus_fee_structure'::regclass) THEN
        CREATE TRIGGER update_bus_fee_structure_updated_at
        BEFORE UPDATE ON bus_fee_structure
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END$$;