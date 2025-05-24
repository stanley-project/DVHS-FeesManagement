/*
  # Core Schema for School Fee Management System

  This consolidated migration establishes the core database schema including:
  
  1. Base Types
    - User roles (administrator, accountant, teacher)
    - Payment methods (cash, online)
    - Fee frequencies (monthly, quarterly, annual)
    - Student statuses (active, inactive)
    - Registration types (new, continuing)
    - Fee categories (admission, school, bus)
    - Promotion statuses (promoted, retained, transferred_out, dropped_out)
  
  2. Core Tables
    - users (staff and admin accounts)
    - academic_years (academic year management)
    - classes (class/section management)
  
  3. Base Functions
    - update_updated_at_column() for timestamp management
  
  4. Core RLS Policies
    - Basic access control for users table
    - Access control for academic years
    - Access control for classes

  Consolidated from:
  - 20250517153653_icy_cell.sql
  - 20250524021757_young_leaf.sql
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create base function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create all enum types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('administrator', 'accountant', 'teacher');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    CREATE TYPE payment_method AS ENUM ('cash', 'online');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fee_frequency') THEN
    CREATE TYPE fee_frequency AS ENUM ('monthly', 'quarterly', 'annual');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'student_status') THEN
    CREATE TYPE student_status AS ENUM ('active', 'inactive');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'registration_type') THEN
    CREATE TYPE registration_type AS ENUM ('new', 'continuing');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fee_category') THEN
    CREATE TYPE fee_category AS ENUM ('admission', 'school', 'bus');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'promotion_status') THEN
    CREATE TYPE promotion_status AS ENUM ('promoted', 'retained', 'transferred_out', 'dropped_out');
  END IF;
END$$;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone_number text UNIQUE NOT NULL,
  email text,
  is_active boolean DEFAULT true,
  role user_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT users_phone_number_check CHECK (phone_number ~ '^[0-9]{10}$')
);

-- Create academic_years table
CREATE TABLE IF NOT EXISTS academic_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year_name text NOT NULL UNIQUE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_current boolean DEFAULT false,
  transition_status text CHECK (transition_status IN ('pending', 'in_progress', 'completed')) DEFAULT 'pending',
  transition_date timestamptz,
  previous_year_id uuid REFERENCES academic_years(id),
  next_year_id uuid REFERENCES academic_years(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT academic_years_dates_check CHECK (end_date > start_date)
);

-- Create classes table
CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  teacher_id uuid REFERENCES users(id),
  academic_year_id uuid REFERENCES academic_years(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(name, academic_year_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_academic_years_is_current ON academic_years(is_current);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view their own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Administrators can manage users"
  ON users
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'administrator');

-- Create policies for academic_years table
CREATE POLICY IF NOT EXISTS "All authenticated users can view academic years"
  ON academic_years
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY IF NOT EXISTS "Administrators can manage academic years"
  ON academic_years
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'administrator');

-- Create policies for classes table
CREATE POLICY IF NOT EXISTS "All authenticated users can view classes"
  ON classes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY IF NOT EXISTS "Administrators can manage classes"
  ON classes
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'administrator');

-- Create triggers for updated_at
CREATE TRIGGER IF NOT EXISTS update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_academic_years_updated_at
    BEFORE UPDATE ON academic_years
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_classes_updated_at
    BEFORE UPDATE ON classes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
