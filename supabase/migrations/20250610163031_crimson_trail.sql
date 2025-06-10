/*
  # Fix Student Table RLS Policies for Insert Operations

  1. Security Updates
    - Remove conflicting RLS policies for students table
    - Add proper INSERT policy for administrators and accountants
    - Ensure authenticated users can insert students with proper role checks

  2. Changes Made
    - Drop existing conflicting INSERT policies
    - Create new comprehensive INSERT policy
    - Maintain existing SELECT policies for reading data
*/

-- Drop existing conflicting INSERT policies
DROP POLICY IF EXISTS "Administrators and accountants can insert students" ON students;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON students;

-- Create a comprehensive INSERT policy that allows administrators and accountants to add students
CREATE POLICY "Allow administrators and accountants to insert students"
  ON students
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('administrator', 'accountant') 
      AND users.is_active = true
    )
  );

-- Ensure the UPDATE policy is also properly configured
DROP POLICY IF EXISTS "Administrators and accountants can update students" ON students;

CREATE POLICY "Allow administrators and accountants to update students"
  ON students
  FOR UPDATE
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

-- Ensure the DELETE policy is also properly configured
DROP POLICY IF EXISTS "Administrators and accountants can delete students" ON students;

CREATE POLICY "Allow administrators and accountants to delete students"
  ON students
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('administrator', 'accountant') 
      AND users.is_active = true
    )
  );