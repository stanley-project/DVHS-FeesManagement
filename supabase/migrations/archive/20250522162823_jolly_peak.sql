/*
  # Fix RLS policies for villages and bus fee structure

  1. Changes
    - Update RLS policies for villages table
    - Update RLS policies for bus_fee_structure table
    - Add missing academic_year_id requirement for bus_fee_structure

  2. Security
    - Enable RLS on both tables
    - Add policies for administrators to manage all records
    - Add policies for authenticated users to view records
*/

-- Update villages table policies
DROP POLICY IF EXISTS "Enable full access for administrators" ON villages;
DROP POLICY IF EXISTS "Enable read access for accountants" ON villages;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON villages;

CREATE POLICY "Administrators can manage villages"
ON villages
FOR ALL
TO authenticated
USING (auth.jwt() ->> 'role' = 'administrator')
WITH CHECK (auth.jwt() ->> 'role' = 'administrator');

CREATE POLICY "All authenticated users can view villages"
ON villages
FOR SELECT
TO authenticated
USING (true);

-- Update bus_fee_structure table policies
DROP POLICY IF EXISTS "Administrators can manage bus fee structure" ON bus_fee_structure;
DROP POLICY IF EXISTS "All authenticated users can view bus fee structure" ON bus_fee_structure;

CREATE POLICY "Administrators can manage bus fee structure"
ON bus_fee_structure
FOR ALL
TO authenticated
USING (auth.jwt() ->> 'role' = 'administrator')
WITH CHECK (auth.jwt() ->> 'role' = 'administrator');

CREATE POLICY "All authenticated users can view bus fee structure"
ON bus_fee_structure
FOR SELECT
TO authenticated
USING (true);

-- Add NOT NULL constraint for academic_year_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'bus_fee_structure' 
    AND column_name = 'academic_year_id' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE bus_fee_structure 
    ALTER COLUMN academic_year_id SET NOT NULL;
  END IF;
END $$;