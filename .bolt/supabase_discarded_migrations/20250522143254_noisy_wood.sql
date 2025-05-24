/*
  # Village Management Schema

  1. New Tables
    - villages
      - id (uuid, primary key)
      - name (text, unique)
      - distance_from_school (numeric)
      - is_active (boolean)
      - created_at (timestamp)
      - updated_at (timestamp)

  2. Security
    - Enable RLS on villages table
    - Add policies for administrators and authenticated users
*/

-- Create Villages table if not exists
CREATE TABLE IF NOT EXISTS villages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  distance_from_school numeric(5,2) NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index on name for faster searches
CREATE INDEX IF NOT EXISTS idx_villages_name ON villages USING btree (name);

-- Enable RLS
ALTER TABLE villages ENABLE ROW LEVEL SECURITY;

-- Create policies
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

-- Create trigger for updated_at
CREATE TRIGGER update_villages_updated_at
  BEFORE UPDATE ON villages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();