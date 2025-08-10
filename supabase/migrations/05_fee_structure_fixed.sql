/*
  # Fee Structure Module

  This consolidated migration establishes the fee structure schema including:
  
  1. Core Tables
    - fee_types: Different types of fees
    - fee_structure: Fee structure for each class
    - fee_structure_history: Tracks changes to fee structures
    - fee_structure_templates: Stores templates for quick setup
  
  2. Relationships
    - Links to classes, academic years, and villages
    - Tracking of fee structure changes
  
  3. Security
    - RLS policies for all fee structure tables
    - Access control based on user roles

  Consolidated from:
  - 20250517153653_icy_cell.sql (fee_types and fee_structure tables)
  - 20250522102945_quick_sound.sql (fee_types and fee_structure modifications)
  - 20250522164151_billowing_pebble.sql (fee structure enhancements)
*/

-- Create fee_types table
CREATE TABLE IF NOT EXISTS fee_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  frequency fee_frequency NOT NULL,
  category fee_category DEFAULT 'school',
  is_monthly boolean DEFAULT false,
  is_for_new_students_only boolean DEFAULT false,
  effective_from date,
  effective_to date,
  last_updated_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create fee_structure table
CREATE TABLE IF NOT EXISTS fee_structure (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES classes(id) NOT NULL,
  fee_type_id uuid REFERENCES fee_types(id) NOT NULL,
  amount decimal(10,2) NOT NULL,
  academic_year_id uuid REFERENCES academic_years(id) NOT NULL,
  due_date date NOT NULL,
  village_id uuid REFERENCES villages(id),
  applicable_to_new_students_only boolean DEFAULT false,
  is_recurring_monthly boolean DEFAULT false,
  last_updated_by uuid REFERENCES users(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(class_id, fee_type_id, academic_year_id)
);

-- Create fee structure history table
CREATE TABLE IF NOT EXISTS fee_structure_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_structure_id uuid REFERENCES fee_structure(id),
  previous_amount numeric(10,2),
  new_amount numeric(10,2) NOT NULL,
  change_date timestamptz DEFAULT now(),
  changed_by uuid REFERENCES users(id),
  reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create fee structure templates table
CREATE TABLE IF NOT EXISTS fee_structure_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  fee_types jsonb NOT NULL,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_fee_structure_class_id ON fee_structure(class_id);
CREATE INDEX IF NOT EXISTS idx_fee_structure_village_id ON fee_structure(village_id);
CREATE INDEX IF NOT EXISTS idx_fee_structure_history_fee_structure ON fee_structure_history(fee_structure_id);
CREATE INDEX IF NOT EXISTS idx_fee_structure_templates_name ON fee_structure_templates(name);

-- Enable Row Level Security
ALTER TABLE fee_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_structure ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_structure_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_structure_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for fee_types table
DROP POLICY IF EXISTS "All authenticated users can view fee types" ON fee_types;
CREATE POLICY "All authenticated users can view fee types"
  ON fee_types
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Administrators can manage fee types" ON fee_types;
CREATE POLICY "Administrators can manage fee types"
  ON fee_types
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'administrator');

-- Create policies for fee_structure table
DROP POLICY IF EXISTS "All authenticated users can view fee structure" ON fee_structure;
CREATE POLICY "All authenticated users can view fee structure"
  ON fee_structure
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Administrators can manage fee structure" ON fee_structure;
CREATE POLICY "Administrators can manage fee structure"
  ON fee_structure
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'administrator');

-- Create policies for fee_structure_history
DROP POLICY IF EXISTS "Administrators can manage fee structure history" ON fee_structure_history;
CREATE POLICY "Administrators can manage fee structure history"
  ON fee_structure_history
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view fee structure history" ON fee_structure_history;
CREATE POLICY "All authenticated users can view fee structure history"
  ON fee_structure_history
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policies for fee_structure_templates
DROP POLICY IF EXISTS "Administrators can manage fee structure templates" ON fee_structure_templates;
CREATE POLICY "Administrators can manage fee structure templates"
  ON fee_structure_templates
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view fee structure templates" ON fee_structure_templates;
CREATE POLICY "All authenticated users can view fee structure templates"
  ON fee_structure_templates
  FOR SELECT
  TO authenticated
  USING (true);

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_fee_types_updated_at ON fee_types;
CREATE TRIGGER update_fee_types_updated_at
    BEFORE UPDATE ON fee_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_fee_structure_updated_at ON fee_structure;
CREATE TRIGGER update_fee_structure_updated_at
    BEFORE UPDATE ON fee_structure
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_fee_structure_history_updated_at ON fee_structure_history;
CREATE TRIGGER update_fee_structure_history_updated_at
  BEFORE UPDATE ON fee_structure_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_fee_structure_templates_updated_at ON fee_structure_templates;
CREATE TRIGGER update_fee_structure_templates_updated_at
  BEFORE UPDATE ON fee_structure_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to track fee structure changes
CREATE OR REPLACE FUNCTION track_fee_structure_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.amount != NEW.amount) THEN
    INSERT INTO fee_structure_history (
      fee_structure_id,
      previous_amount,
      new_amount,
      changed_by,
      reason
    ) VALUES (
      NEW.id,
      OLD.amount,
      NEW.amount,
      NEW.last_updated_by,
      NEW.notes
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for fee structure changes
DROP TRIGGER IF EXISTS track_fee_structure_changes_trigger ON fee_structure;
CREATE TRIGGER track_fee_structure_changes_trigger
  AFTER UPDATE ON fee_structure
  FOR EACH ROW
  EXECUTE FUNCTION track_fee_structure_changes();
