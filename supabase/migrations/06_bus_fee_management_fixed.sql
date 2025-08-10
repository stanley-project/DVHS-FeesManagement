/*
  # Bus Fee Management Module

  This consolidated migration establishes the bus fee management schema including:
  
  1. Core Tables
    - bus_fee_structure: Village-specific bus fee configuration
    - bus_fee_history: Track historical bus fee changes
    - bus_fee_adjustments: Track individual student bus fee adjustments
  
  2. Relationships
    - Links to villages, students, and academic years
    - Tracking of bus fee changes and adjustments
  
  3. Security
    - RLS policies for all bus fee tables
    - Access control based on user roles

  Consolidated from:
  - 20250522102945_quick_sound.sql
  - 20250522114320_teal_base.sql
  - 20250522140320_icy_salad.sql
  - 20250522151555_black_math.sql
  - 20250522162823_jolly_peak.sql
*/

-- Create bus_fee_structure table
CREATE TABLE IF NOT EXISTS bus_fee_structure (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  village_id uuid NOT NULL REFERENCES villages(id),
  fee_amount numeric(10,2) NOT NULL,
  academic_year_id uuid NOT NULL REFERENCES academic_years(id),
  effective_from_date date NOT NULL,
  effective_to_date date NOT NULL,
  is_active boolean DEFAULT true,
  notes text,
  last_updated_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT bus_fee_date_check CHECK (effective_to_date > effective_from_date)
);

-- Create bus fee history table
CREATE TABLE IF NOT EXISTS bus_fee_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  village_id uuid NOT NULL REFERENCES villages(id),
  previous_amount numeric(10,2),
  new_amount numeric(10,2) NOT NULL,
  change_date timestamptz DEFAULT now(),
  changed_by uuid REFERENCES users(id),
  reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create bus fee adjustments table
CREATE TABLE IF NOT EXISTS bus_fee_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id),
  village_id uuid NOT NULL REFERENCES villages(id),
  academic_year_id uuid NOT NULL REFERENCES academic_years(id),
  adjustment_amount numeric(10,2) NOT NULL,
  reason text NOT NULL,
  is_active boolean DEFAULT true,
  approved_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bus_fee_structure_village_id ON bus_fee_structure(village_id);
CREATE INDEX IF NOT EXISTS idx_bus_fee_structure_academic_year ON bus_fee_structure(academic_year_id);
CREATE UNIQUE INDEX IF NOT EXISTS bus_fee_structure_village_id_academic_year_id_key ON bus_fee_structure(village_id, academic_year_id);
CREATE INDEX IF NOT EXISTS idx_bus_fee_history_village ON bus_fee_history(village_id);
CREATE INDEX IF NOT EXISTS idx_bus_fee_adjustments_student ON bus_fee_adjustments(student_id);
CREATE INDEX IF NOT EXISTS idx_bus_fee_adjustments_village ON bus_fee_adjustments(village_id);

-- Enable Row Level Security
ALTER TABLE bus_fee_structure ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_fee_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_fee_adjustments ENABLE ROW LEVEL SECURITY;

-- Create policies for bus_fee_structure
DROP POLICY IF EXISTS "Administrators can manage bus fee structure" ON bus_fee_structure;
CREATE POLICY "Administrators can manage bus fee structure"
ON bus_fee_structure
FOR ALL
TO authenticated
USING (auth.jwt() ->> 'role' = 'administrator')
WITH CHECK (auth.jwt() ->> 'role' = 'administrator');

DROP POLICY IF EXISTS "All authenticated users can view bus fee structure" ON bus_fee_structure;
CREATE POLICY "All authenticated users can view bus fee structure"
ON bus_fee_structure
FOR SELECT
TO authenticated
USING (true);

-- Create policies for bus_fee_history
DROP POLICY IF EXISTS "Administrators can manage bus fee history" ON bus_fee_history;
CREATE POLICY "Administrators can manage bus fee history"
  ON bus_fee_history
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view bus fee history" ON bus_fee_history;
CREATE POLICY "All authenticated users can view bus fee history"
  ON bus_fee_history
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policies for bus_fee_adjustments
DROP POLICY IF EXISTS "Administrators and accountants can manage bus fee adjustments" ON bus_fee_adjustments;
CREATE POLICY "Administrators and accountants can manage bus fee adjustments"
  ON bus_fee_adjustments
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'role'::text) = ANY (ARRAY['administrator'::text, 'accountant'::text]));

DROP POLICY IF EXISTS "All authenticated users can view bus fee adjustments" ON bus_fee_adjustments;
CREATE POLICY "All authenticated users can view bus fee adjustments"
  ON bus_fee_adjustments
  FOR SELECT
  TO authenticated
  USING (true);

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_bus_fee_structure_updated_at ON bus_fee_structure;
CREATE TRIGGER update_bus_fee_structure_updated_at
    BEFORE UPDATE ON bus_fee_structure
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bus_fee_history_updated_at ON bus_fee_history;
CREATE TRIGGER update_bus_fee_history_updated_at
  BEFORE UPDATE ON bus_fee_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bus_fee_adjustments_updated_at ON bus_fee_adjustments;
CREATE TRIGGER update_bus_fee_adjustments_updated_at
  BEFORE UPDATE ON bus_fee_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to track bus fee changes
CREATE OR REPLACE FUNCTION track_bus_fee_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.fee_amount != NEW.fee_amount) THEN
    INSERT INTO bus_fee_history (
      village_id,
      previous_amount,
      new_amount,
      changed_by,
      reason
    ) VALUES (
      NEW.village_id,
      OLD.fee_amount,
      NEW.fee_amount,
      NEW.last_updated_by,
      NEW.notes
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for bus fee changes
DROP TRIGGER IF EXISTS track_bus_fee_changes_trigger ON bus_fee_structure;
CREATE TRIGGER track_bus_fee_changes_trigger
  AFTER UPDATE ON bus_fee_structure
  FOR EACH ROW
  EXECUTE FUNCTION track_bus_fee_changes();
