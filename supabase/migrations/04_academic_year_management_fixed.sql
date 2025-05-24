/*
  # Academic Year Management Module

  This consolidated migration establishes the academic year management schema including:
  
  1. Core Tables
    - academic_year_transitions: Tracks transitions between academic years
    - academic_year_settings: Stores settings for academic years
  
  2. Relationships
    - Links to academic_years table
    - Tracking of academic year transitions and promotions
  
  3. Security
    - RLS policies for all academic year management tables
    - Access control based on user roles

  Consolidated from:
  - 20250522134541_rustic_recipe.sql
  - 20250522140257_quiet_glitter.sql
*/

-- Create academic year transitions table
CREATE TABLE IF NOT EXISTS academic_year_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_year_id uuid NOT NULL REFERENCES academic_years(id),
  to_year_id uuid NOT NULL REFERENCES academic_years(id),
  status text CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')) DEFAULT 'pending',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  total_students integer DEFAULT 0,
  promoted_students integer DEFAULT 0,
  retained_students integer DEFAULT 0,
  transferred_students integer DEFAULT 0,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create academic year settings table
CREATE TABLE IF NOT EXISTS academic_year_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id uuid NOT NULL REFERENCES academic_years(id),
  setting_key text NOT NULL,
  setting_value jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (academic_year_id, setting_key)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_academic_year_transitions_from_year ON academic_year_transitions(from_year_id);
CREATE INDEX IF NOT EXISTS idx_academic_year_transitions_to_year ON academic_year_transitions(to_year_id);
CREATE INDEX IF NOT EXISTS idx_academic_year_settings_year ON academic_year_settings(academic_year_id);

-- Enable Row Level Security
ALTER TABLE academic_year_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_year_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for academic_year_transitions
DROP POLICY IF EXISTS "Administrators can manage academic year transitions" ON academic_year_transitions;
CREATE POLICY "Administrators can manage academic year transitions"
  ON academic_year_transitions
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view academic year transitions" ON academic_year_transitions;
CREATE POLICY "All authenticated users can view academic year transitions"
  ON academic_year_transitions
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policies for academic_year_settings
DROP POLICY IF EXISTS "Administrators can manage academic year settings" ON academic_year_settings;
CREATE POLICY "Administrators can manage academic year settings"
  ON academic_year_settings
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view academic year settings" ON academic_year_settings;
CREATE POLICY "All authenticated users can view academic year settings"
  ON academic_year_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_academic_year_transitions_updated_at ON academic_year_transitions;
CREATE TRIGGER update_academic_year_transitions_updated_at
  BEFORE UPDATE ON academic_year_transitions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_academic_year_settings_updated_at ON academic_year_settings;
CREATE TRIGGER update_academic_year_settings_updated_at
  BEFORE UPDATE ON academic_year_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
