/*
  # User Indexes and Policies

  1. Extensions
    - Enables pg_trgm extension for better text search capabilities

  2. Indexes
    - Creates indexes on commonly queried user fields
    - Adds a GIN index with trigram support for name searches

  3. Security
    - Enables RLS on users table
    - Adds policies for different user roles:
      - Administrators: full access
      - Users: view own profile
      - Accountants: view-only access to all users
      - Teachers: view-only access to other teachers
*/

-- Enable trigram extension for better text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_name_search ON users USING gin (name gin_trgm_ops);

-- Update RLS policies for better security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow administrators to manage all users
CREATE POLICY "Administrators can manage all users"
ON users
FOR ALL
TO authenticated
USING (
  (auth.jwt() ->> 'role')::text = 'administrator'
)
WITH CHECK (
  (auth.jwt() ->> 'role')::text = 'administrator'
);

-- Allow users to view their own profile
CREATE POLICY "Users can view their own profile"
ON users
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
);

-- Allow accountants to view all users but not modify
CREATE POLICY "Accountants can view all users"
ON users
FOR SELECT
TO authenticated
USING (
  (auth.jwt() ->> 'role')::text = 'accountant'
);

-- Allow teachers to view other teachers
CREATE POLICY "Teachers can view other teachers"
ON users
FOR SELECT
TO authenticated
USING (
  (auth.jwt() ->> 'role')::text = 'teacher'
  AND role = 'teacher'::user_role
);