/*
  # Fix RLS policies for academic years table

  1. Changes
    - Drop existing RLS policies for academic_years table
    - Create new comprehensive RLS policies that properly handle all operations
    - Ensure administrators can fully manage academic years
    - Allow authenticated users to view academic years

  2. Security
    - Enable RLS on academic_years table (already enabled)
    - Add policies for:
      - INSERT: Only administrators can create academic years
      - UPDATE: Only administrators can update academic years
      - DELETE: Only administrators can delete academic years
      - SELECT: All authenticated users can view academic years
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Administrators can manage academic years" ON academic_years;
DROP POLICY IF EXISTS "All authenticated users can view academic years" ON academic_years;
DROP POLICY IF EXISTS "Delete academic years" ON academic_years;
DROP POLICY IF EXISTS "Insert academic years" ON academic_years;
DROP POLICY IF EXISTS "Update academic years" ON academic_years;
DROP POLICY IF EXISTS "View academic years" ON academic_years;

-- Create new comprehensive policies
CREATE POLICY "Administrators can create academic years"
ON academic_years
FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'role' = 'administrator'
);

CREATE POLICY "Administrators can update academic years"
ON academic_years
FOR UPDATE
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'administrator'
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'administrator'
);

CREATE POLICY "Administrators can delete academic years"
ON academic_years
FOR DELETE
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'administrator'
);

CREATE POLICY "All authenticated users can view academic years"
ON academic_years
FOR SELECT
TO authenticated
USING (true);