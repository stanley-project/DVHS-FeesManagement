/*
  # Add Bus Fee Management

  1. New Tables
    - bus_fee_history: Track historical bus fee changes
    - bus_fee_adjustments: Track individual student bus fee adjustments

  2. Changes
    - Add bus_fee_effective_date to bus_fee_structure
    - Add bus_fee_notes to bus_fee_structure

  3. Security
    - Enable RLS on new tables
    - Add policies for administrators and accountants
*/

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

-- Add new columns to bus_fee_structure
ALTER TABLE bus_fee_structure
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS last_updated_by uuid REFERENCES users(id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bus_fee_history_village ON bus_fee_history(village_id);
CREATE INDEX IF NOT EXISTS idx_bus_fee_adjustments_student ON bus_fee_adjustments(student_id);
CREATE INDEX IF NOT EXISTS idx_bus_fee_adjustments_village ON bus_fee_adjustments(village_id);

-- Enable RLS
ALTER TABLE bus_fee_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_fee_adjustments ENABLE ROW LEVEL SECURITY;

-- Create policies for bus_fee_history
CREATE POLICY "Administrators can manage bus fee history"
  ON bus_fee_history
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

CREATE POLICY "All authenticated users can view bus fee history"
  ON bus_fee_history
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policies for bus_fee_adjustments
CREATE POLICY "Administrators and accountants can manage bus fee adjustments"
  ON bus_fee_adjustments
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'role'::text) = ANY (ARRAY['administrator'::text, 'accountant'::text]));

CREATE POLICY "All authenticated users can view bus fee adjustments"
  ON bus_fee_adjustments
  FOR SELECT
  TO authenticated
  USING (true);

-- Create triggers for updated_at
CREATE TRIGGER update_bus_fee_history_updated_at
  BEFORE UPDATE ON bus_fee_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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
CREATE TRIGGER track_bus_fee_changes_trigger
  AFTER UPDATE ON bus_fee_structure
  FOR EACH ROW
  EXECUTE FUNCTION track_bus_fee_changes();