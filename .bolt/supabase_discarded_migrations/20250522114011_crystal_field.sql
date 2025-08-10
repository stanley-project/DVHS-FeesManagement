/*
  # Village-based Registration and Fee Management

  1. New Tables
    - `villages`: Stores village information and distance from school
    - `student_academic_history`: Tracks student academic progression
    - `bus_fee_structure`: Manages village-specific bus fees

  2. Table Modifications
    - `students`: Added village and bus service fields
    - `fee_types`: Added categorization and fee type flags
    - `fee_structure`: Added village-specific and student type fields

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
  ADD COLUMN IF NOT EXISTS first_registration_year date,
  ADD COLUMN IF NOT EXISTS current_academic_year_id uuid REFERENCES academic_years(id),
  ADD COLUMN IF NOT EXISTS previous_academic_year_id uuid REFERENCES academic_years(id),
  ADD COLUMN IF NOT EXISTS is_continuing_student boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS rejoined_date date;

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
CREATE POLICY "Administrators can manage villages"
  ON villages
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

CREATE POLICY "All authenticated users can view villages"
  ON villages
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policies for Student Academic History
CREATE POLICY "Administrators and accountants can manage student academic history"
  ON student_academic_history
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'role'::text) = ANY (ARRAY['administrator'::text, 'accountant'::text]));

CREATE POLICY "All authenticated users can view student academic history"
  ON student_academic_history
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policies for Bus Fee Structure
CREATE POLICY "Administrators can manage bus fee structure"
  ON bus_fee_structure
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

CREATE POLICY "All authenticated users can view bus fee structure"
  ON bus_fee_structure
  FOR SELECT
  TO authenticated
  USING (true);

-- Create triggers for updated_at columns
CREATE TRIGGER IF NOT EXISTS update_villages_updated_at
  BEFORE UPDATE ON villages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_student_academic_history_updated_at
  BEFORE UPDATE ON student_academic_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_bus_fee_structure_updated_at
  BEFORE UPDATE ON bus_fee_structure
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();