/*
  # User Management Indexes and Policies

  This migration adds:
  1. Performance optimizations:
    - Indexes for commonly queried columns
    - Composite indexes for filtered queries
  
  2. Enhanced security:
    - Additional RLS policies for user management
    - Proper handling of user roles and permissions
*/

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_name_search ON users USING gin(name gin_trgm_ops);

-- Enable trigram extension for better text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

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