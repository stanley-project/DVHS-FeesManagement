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

-- Add class_level column to classes table
ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS class_level class_level;

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

-- Create admission fee settings table if not exists
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admission_fee_settings_academic_year 
ON admission_fee_settings(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_admission_fee_settings_class_level 
ON admission_fee_settings(class_level);

-- Enable RLS
ALTER TABLE admission_fee_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
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

-- Create trigger for updated_at
CREATE TRIGGER update_admission_fee_settings_updated_at
BEFORE UPDATE ON admission_fee_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();