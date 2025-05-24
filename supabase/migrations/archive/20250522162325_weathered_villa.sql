/*
  # Fix Villages RLS Policies

  1. Changes
    - Remove conflicting RLS policies
    - Add clear, consistent policies for villages table
    - Ensure proper access for all authenticated users
    - Maintain strict control for administrative operations

  2. Security
    - Enable RLS on villages table
    - Add policies for:
      - SELECT: All authenticated users can view villages
      - INSERT/UPDATE/DELETE: Only administrators can modify villages
*/

-- First, drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Accountants can view all villages" ON villages;
DROP POLICY IF EXISTS "Administrators can manage villages" ON villages;
DROP POLICY IF EXISTS "Authenticated users can view active villages" ON villages;
DROP POLICY IF EXISTS "Enable delete for administrators" ON villages;
DROP POLICY IF EXISTS "Enable insert for administrators" ON villages;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON villages;
DROP POLICY IF EXISTS "Enable update for administrators" ON villages;

-- Create new, clear policies
CREATE POLICY "Enable read access for authenticated users"
ON villages FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable full access for administrators"
ON villages FOR ALL
TO authenticated
USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

CREATE POLICY "Enable read access for accountants"
ON villages FOR SELECT
TO authenticated
USING ((auth.jwt() ->> 'role'::text) = 'accountant'::text);