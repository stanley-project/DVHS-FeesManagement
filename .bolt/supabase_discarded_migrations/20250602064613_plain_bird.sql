/*
  # Fix RLS policies for academic_years table

  1. Changes
    - Create helper function to get user role from HTTP header
    - Update RLS policies for academic_years table to properly handle administrator access
    - Ensure proper access control for all CRUD operations

  2. Security
    - Enable RLS on academic_years table
    - Add policies for:
      - INSERT: Only administrators can create academic years
      - UPDATE: Only administrators can update academic years
      - DELETE: Only administrators can delete academic years
      - SELECT: All authenticated users can view academic years
*/

-- Create helper function to get user role from header
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN current_setting('request.header.x-user-role', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO public;

-- Enable RLS on academic_years table
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Administrators can manage academic years" ON academic_years;
DROP POLICY IF EXISTS "All authenticated users can view academic years" ON academic_years;
DROP POLICY IF EXISTS "Delete academic years" ON academic_years;
DROP POLICY IF EXISTS "Insert academic years" ON academic_years;
DROP POLICY IF EXISTS "Update academic years" ON academic_years;
DROP POLICY IF EXISTS "View academic years" ON academic_years;

-- Create new policies
CREATE POLICY "Allow administrators to manage academic years"
ON academic_years
FOR ALL
TO authenticated
USING (get_user_role() = 'administrator')
WITH CHECK (get_user_role() = 'administrator');

CREATE POLICY "Allow all authenticated users to view academic years"
ON academic_years
FOR SELECT
TO authenticated
USING (true);