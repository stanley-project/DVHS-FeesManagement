/*
  # Fix Villages RLS Policies

  1. Changes
    - Drop existing RLS policies for villages table
    - Create new, more permissive policies for CRUD operations
    - Add specific policies for different user roles

  2. Security
    - Administrators can perform all operations
    - All authenticated users can view active villages
    - Accountants can view all villages
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Administrators can manage villages" ON villages;
DROP POLICY IF EXISTS "All authenticated users can view villages" ON villages;

-- Create new policies
CREATE POLICY "Enable read access for all authenticated users"
ON villages FOR SELECT
TO authenticated
USING (
  -- Administrators and accountants can see all villages
  (auth.jwt() ->> 'role'::text) IN ('administrator', 'accountant')
  OR
  -- Other roles can only see active villages
  (is_active = true)
);

CREATE POLICY "Enable insert for administrators"
ON villages FOR INSERT
TO authenticated
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'administrator');

CREATE POLICY "Enable update for administrators"
ON villages FOR UPDATE
TO authenticated
USING ((auth.jwt() ->> 'role'::text) = 'administrator')
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'administrator');

CREATE POLICY "Enable delete for administrators"
ON villages FOR DELETE
TO authenticated
USING ((auth.jwt() ->> 'role'::text) = 'administrator');