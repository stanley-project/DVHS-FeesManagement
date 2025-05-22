/*
  # Add RLS Policies for Villages Table

  1. Security Changes
    - Enable RLS on villages table
    - Add policies for administrators to manage villages
    - Add policies for authenticated users to view active villages
    - Add policies for accountants to view all villages

  2. Changes
    - Adds comprehensive RLS policies for the villages table
    - Ensures proper access control based on user roles
*/

-- Enable RLS
ALTER TABLE villages ENABLE ROW LEVEL SECURITY;

-- Policy for administrators to manage villages
CREATE POLICY "Administrators can manage villages"
ON villages
FOR ALL
TO authenticated
USING (
  (auth.jwt() ->> 'role')::text = 'administrator'
)
WITH CHECK (
  (auth.jwt() ->> 'role')::text = 'administrator'
);

-- Policy for authenticated users to view active villages
CREATE POLICY "Authenticated users can view active villages"
ON villages
FOR SELECT
TO authenticated
USING (
  is_active = true OR
  (auth.jwt() ->> 'role')::text = ANY (ARRAY['administrator'::text, 'accountant'::text])
);

-- Policy for accountants to view all villages
CREATE POLICY "Accountants can view all villages"
ON villages
FOR SELECT
TO authenticated
USING (
  (auth.jwt() ->> 'role')::text = 'accountant'
);