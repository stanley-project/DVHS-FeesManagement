/*
  # Fix Student RLS Policy for Insert Operations

  1. Security Updates
    - Drop existing problematic RLS policy for students management
    - Create new RLS policy that properly checks user role from users table
    - Ensure administrators and accountants can insert new students
    - Maintain existing read permissions

  2. Policy Changes
    - Replace JWT role check with proper user table role lookup
    - Use get_current_user_id() function to get current user
    - Check role from users table instead of JWT claims
*/

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Administrators and accountants can manage students" ON students;

-- Create new policy for INSERT operations
CREATE POLICY "Administrators and accountants can insert students"
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

-- Create new policy for UPDATE operations
CREATE POLICY "Administrators and accountants can update students"
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

-- Create new policy for DELETE operations
CREATE POLICY "Administrators and accountants can delete students"
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