/*
  # Fix Users RLS Policies

  1. Changes
    - Drop existing RLS policies
    - Add new policies for user management
    - Allow administrators to manage users
    - Allow users to view their own profile
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Administrators can manage users" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;

-- Create new policies
CREATE POLICY "Administrators can manage users"
ON public.users
FOR ALL
TO authenticated
USING (
  (auth.jwt() ->> 'role')::text = 'administrator'
)
WITH CHECK (
  (auth.jwt() ->> 'role')::text = 'administrator'
);

CREATE POLICY "Users can view their own profile"
ON public.users
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
);