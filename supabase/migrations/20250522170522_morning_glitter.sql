-- Create admission fee settings table
CREATE TABLE IF NOT EXISTS admission_fee_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id uuid NOT NULL REFERENCES academic_years(id),
  amount numeric(10,2) NOT NULL,
  effective_from date NOT NULL,
  effective_to date,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT admission_fee_date_check CHECK (effective_to IS NULL OR effective_to > effective_from)
);

-- Create index for academic year
CREATE INDEX IF NOT EXISTS idx_admission_fee_settings_academic_year 
ON admission_fee_settings(academic_year_id);

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

-- Update fee_types table
UPDATE fee_types 
SET is_for_new_students_only = true 
WHERE category = 'admission';

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

-- Create index for academic year
CREATE INDEX IF NOT EXISTS idx_admission_fee_history_academic_year 
ON admission_fee_history(academic_year_id);

-- Enable RLS
ALTER TABLE admission_fee_history ENABLE ROW LEVEL SECURITY;

-- Create policies
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

-- Create trigger for updated_at
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