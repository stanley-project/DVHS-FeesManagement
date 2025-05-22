/*
  # Add Village-based Registration and Fee Management

  1. New Tables
    - villages: Store village information and distance from school
    - bus_fee_structure: Village-specific bus fee configuration

  2. Updates to Existing Tables
    - students: Add village and bus information
    - fee_types: Add categorization and applicability rules
    - fee_structure: Add village-specific and student type rules

  3. Security
    - Enable RLS on new tables
    - Update existing policies to handle new fields
*/

-- Create new enum types
CREATE TYPE registration_type AS ENUM ('new', 'continuing');
CREATE TYPE fee_category AS ENUM ('admission', 'school', 'bus');

-- Create villages table
CREATE TABLE IF NOT EXISTS villages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  distance_from_school decimal(5,2) NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create bus_fee_structure table
CREATE TABLE IF NOT EXISTS bus_fee_structure (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  village_id uuid REFERENCES villages(id) NOT NULL,
  fee_amount decimal(10,2) NOT NULL,
  academic_year_id uuid REFERENCES academic_years(id) NOT NULL,
  effective_from_date date NOT NULL,
  effective_to_date date NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT bus_fee_date_check CHECK (effective_to_date > effective_from_date),
  UNIQUE(village_id, academic_year_id)
);

-- Update students table
ALTER TABLE students
ADD COLUMN village_id uuid REFERENCES villages(id),
ADD COLUMN has_school_bus boolean DEFAULT false,
ADD COLUMN registration_type registration_type NOT NULL DEFAULT 'new';

-- Update fee_types table
ALTER TABLE fee_types
ADD COLUMN category fee_category NOT NULL DEFAULT 'school',
ADD COLUMN is_monthly boolean DEFAULT false,
ADD COLUMN is_for_new_students_only boolean DEFAULT false;

-- Update fee_structure table
ALTER TABLE fee_structure
ADD COLUMN village_id uuid REFERENCES villages(id),
ADD COLUMN applicable_to_new_students_only boolean DEFAULT false,
ADD COLUMN is_recurring_monthly boolean DEFAULT false;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_students_village_id ON students(village_id);
CREATE INDEX IF NOT EXISTS idx_bus_fee_structure_village_id ON bus_fee_structure(village_id);
CREATE INDEX IF NOT EXISTS idx_fee_structure_village_id ON fee_structure(village_id);
CREATE INDEX IF NOT EXISTS idx_villages_name ON villages(name);
CREATE INDEX IF NOT EXISTS idx_bus_fee_structure_academic_year ON bus_fee_structure(academic_year_id);

-- Enable RLS on new tables
ALTER TABLE villages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_fee_structure ENABLE ROW LEVEL SECURITY;

-- Create policies for villages table
CREATE POLICY "All authenticated users can view villages"
  ON villages
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Administrators can manage villages"
  ON villages
  USING (auth.jwt() ->> 'role' = 'administrator');

-- Create policies for bus_fee_structure table
CREATE POLICY "All authenticated users can view bus fee structure"
  ON bus_fee_structure
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Administrators can manage bus fee structure"
  ON bus_fee_structure
  USING (auth.jwt() ->> 'role' = 'administrator');

-- Create triggers for updated_at
CREATE TRIGGER update_villages_updated_at
    BEFORE UPDATE ON villages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bus_fee_structure_updated_at
    BEFORE UPDATE ON bus_fee_structure
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();