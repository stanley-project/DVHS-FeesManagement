/*
  # Fee Structure Enhancements

  1. New Tables
    - `fee_categories` - Stores fee category definitions
    - `fee_structure_history` - Tracks changes to fee structures
    - `fee_structure_templates` - Stores templates for quick setup

  2. Changes
    - Add new columns to fee_types table
    - Add new columns to fee_structure table
    - Add tracking for fee structure changes

  3. Security
    - Enable RLS on new tables
    - Add policies for administrators
*/

-- Create fee categories enum if not exists
DO $$ BEGIN
  CREATE TYPE fee_category AS ENUM ('admission', 'school', 'bus');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to fee_types table
ALTER TABLE fee_types
  ADD COLUMN IF NOT EXISTS category fee_category DEFAULT 'school',
  ADD COLUMN IF NOT EXISTS is_monthly boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_for_new_students_only boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS effective_from date,
  ADD COLUMN IF NOT EXISTS effective_to date,
  ADD COLUMN IF NOT EXISTS last_updated_by uuid REFERENCES users(id);

-- Add new columns to fee_structure table
ALTER TABLE fee_structure
  ADD COLUMN IF NOT EXISTS applicable_to_new_students_only boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_recurring_monthly boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_updated_by uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS notes text;

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_fee_structure_history_fee_structure ON fee_structure_history(fee_structure_id);
CREATE INDEX IF NOT EXISTS idx_fee_structure_templates_name ON fee_structure_templates(name);

-- Enable RLS
ALTER TABLE fee_structure_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_structure_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for fee_structure_history
CREATE POLICY "Administrators can manage fee structure history"
  ON fee_structure_history
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

CREATE POLICY "All authenticated users can view fee structure history"
  ON fee_structure_history
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policies for fee_structure_templates
CREATE POLICY "Administrators can manage fee structure templates"
  ON fee_structure_templates
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

CREATE POLICY "All authenticated users can view fee structure templates"
  ON fee_structure_templates
  FOR SELECT
  TO authenticated
  USING (true);

-- Create triggers for updated_at
CREATE TRIGGER update_fee_structure_history_updated_at
  BEFORE UPDATE ON fee_structure_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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
CREATE TRIGGER track_fee_structure_changes_trigger
  AFTER UPDATE ON fee_structure
  FOR EACH ROW
  EXECUTE FUNCTION track_fee_structure_changes();