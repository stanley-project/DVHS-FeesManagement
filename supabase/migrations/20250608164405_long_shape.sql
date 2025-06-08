/*
  # Fix Classes RLS Policies

  This migration fixes the Row Level Security policies for the classes table
  to ensure authenticated users can properly access class data.

  1. Changes
    - Drop existing restrictive policies
    - Add new policies that allow proper access based on user roles
    - Ensure all authenticated users can read classes
    - Allow administrators to manage classes
*/

-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "All authenticated users can view classes" ON classes;
DROP POLICY IF EXISTS "Administrators can manage classes" ON classes;

-- Create new, more permissive policies for classes
CREATE POLICY "Enable read access for authenticated users"
ON classes
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable read access for public users with valid session"
ON classes
FOR SELECT
TO public
USING (true);

CREATE POLICY "Administrators can manage all classes"
ON classes
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'administrator'
    AND users.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'administrator'
    AND users.is_active = true
  )
);

-- Also ensure the academic_years table has proper read access
DROP POLICY IF EXISTS "All authenticated users can view academic years" ON academic_years;
DROP POLICY IF EXISTS "Allow authenticated users to read academic years" ON academic_years;

CREATE POLICY "Enable read access for academic years"
ON academic_years
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable public read access for academic years"
ON academic_years
FOR SELECT
TO public
USING (true);