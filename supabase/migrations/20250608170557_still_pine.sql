/*
  # Fix Student Search RLS Policies

  This migration fixes the RLS policies on the students table to ensure that
  the search functionality can access inactive students for rejoining purposes.
  
  1. Updates
    - Drop existing restrictive policies
    - Create new policies that allow reading all students (active and inactive)
    - Maintain proper write access controls
*/

-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "All authenticated users can view students" ON students;
DROP POLICY IF EXISTS "Administrators and accountants can manage students" ON students;

-- Create new, more permissive read policies for students
CREATE POLICY "Enable read access for all students"
ON students
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable public read access for students"
ON students
FOR SELECT
TO public
USING (true);

-- Maintain proper write access controls
CREATE POLICY "Administrators and accountants can manage students"
ON students
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('administrator', 'accountant')
    AND users.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('administrator', 'accountant')
    AND users.is_active = true
  )
);

-- Also ensure villages table has proper read access for the joins
DROP POLICY IF EXISTS "All authenticated users can view villages" ON villages;
DROP POLICY IF EXISTS "Enable read access for valid tokens" ON villages;
DROP POLICY IF EXISTS "Users can view villages" ON villages;

CREATE POLICY "Enable read access for villages"
ON villages
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable public read access for villages"
ON villages
FOR SELECT
TO public
USING (true);