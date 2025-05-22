/*
  # Add RLS policies for villages table

  1. Security Changes
    - Enable RLS on villages table
    - Add policies for:
      - Administrators can manage villages
      - All authenticated users can view villages
*/

-- Enable RLS
ALTER TABLE villages ENABLE ROW LEVEL SECURITY;

-- Policy for administrators to manage villages
CREATE POLICY "Administrators can manage villages"
ON villages
FOR ALL
TO authenticated
USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

-- Policy for all authenticated users to view villages
CREATE POLICY "All authenticated users can view villages"
ON villages
FOR SELECT
TO authenticated
USING (true);