/*
  # Class Structure and Admission Fee Changes

  1. New Tables
    - `admission_fee_settings`: Stores admission fee configuration
    - `admission_fee_history`: Tracks changes to admission fees

  2. Changes
    - Add class_level enum type for pre-primary through secondary classes
    - Add class_level column to classes table
    - Add constraints and indexes for new tables
    - Add RLS policies for new tables

  3. Security
    - Enable RLS on new tables
    - Add policies for administrators and authenticated users
*/

-- Add new enum type for class levels
DO $$ BEGIN
  CREATE TYPE class_level AS ENUM (
    'nursery',
    'lkg',
    'ukg',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    '10'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create admission fee settings table
CREATE TABLE IF NOT EXISTS admission_fee_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id uuid NOT NULL REFERENCES academic_years(id),
  class_level class_level NOT NULL,
  amount numeric(10,2) NOT NULL,
  effective_from date NOT NULL,
  effective_to date,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT admission_fee_date_check CHECK (effective_to IS NULL OR effective_to > effective_from)
);

-- Create admission fee history table
CREATE TABLE IF NOT EXISTS admission_fee_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  previous_amount numeric(10,2),
  new_amount numeric(10,2) NOT NULL,
  academic_year_id uuid NOT NULL REFERENCES academic_years(id),
  change_date timestamptz DEFAULT now(),
  changed_by uuid REFERENCES users(id),
  reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add class_level column to classes table
ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS class_level class_level;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admission_fee_settings_academic_year 
ON admission_fee_settings(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_admission_fee_settings_class_level 
ON admission_fee_settings(class_level);
CREATE INDEX IF NOT EXISTS idx_admission_fee_history_academic_year 
ON admission_fee_history(academic_year_id);

-- Enable RLS
ALTER TABLE admission_fee_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admission_fee_history ENABLE ROW LEVEL SECURITY;

-- Create policies for admission_fee_settings
CREATE POLICY "Administrators can manage admission fee settings"
ON admission_fee_settings
FOR ALL
TO authenticated
USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

CREATE POLICY "All authenticated users can view admission fee settings"
ON admission_fee_settings
FOR SELECT
TO authenticated
USING (true);

-- Create policies for admission_fee_history
CREATE POLICY "Administrators can manage admission fee history"
ON admission_fee_history
FOR ALL
TO authenticated
USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

CREATE POLICY "All authenticated users can view admission fee history"
ON admission_fee_history
FOR SELECT
TO authenticated
USING (true);

-- Create triggers for updated_at
CREATE TRIGGER update_admission_fee_settings_updated_at
BEFORE UPDATE ON admission_fee_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admission_fee_history_updated_at
BEFORE UPDATE ON admission_fee_history
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create function to track admission fee changes
CREATE OR REPLACE FUNCTION track_admission_fee_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.amount != NEW.amount) THEN
    INSERT INTO admission_fee_history (
      previous_amount,
      new_amount,
      academic_year_id,
      changed_by,
      reason
    ) VALUES (
      OLD.amount,
      NEW.amount,
      NEW.academic_year_id,
      NEW.created_by,
      'Fee amount updated'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for admission fee changes
CREATE TRIGGER track_admission_fee_changes_trigger
AFTER UPDATE ON admission_fee_settings
FOR EACH ROW
EXECUTE FUNCTION track_admission_fee_changes();

-- Update existing class names to match new structure
UPDATE classes
SET class_level = CASE
  WHEN name LIKE '%Nursery%' THEN 'nursery'::class_level
  WHEN name LIKE '%LKG%' THEN 'lkg'::class_level
  WHEN name LIKE '%UKG%' THEN 'ukg'::class_level
  WHEN name ~ '^[0-9]+' THEN (regexp_replace(name, '[^0-9].*$', ''))::class_level
  ELSE null
END
WHERE class_level IS NULL;