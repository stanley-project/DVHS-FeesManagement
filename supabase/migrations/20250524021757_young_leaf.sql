/*
  # Initial Schema Migration
  
  This migration establishes the core database schema including:
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
*/

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Base Types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('administrator', 'accountant', 'teacher');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    CREATE TYPE payment_method AS ENUM ('cash', 'online');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fee_frequency') THEN
    CREATE TYPE fee_frequency AS ENUM ('monthly', 'quarterly', 'annual');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'student_status') THEN
    CREATE TYPE student_status AS ENUM ('active', 'inactive');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'registration_type') THEN
    CREATE TYPE registration_type AS ENUM ('new', 'continuing');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fee_category') THEN
    CREATE TYPE fee_category AS ENUM ('admission', 'school', 'bus');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'promotion_status') THEN
    CREATE TYPE promotion_status AS ENUM ('promoted', 'retained', 'transferred_out', 'dropped_out');
  END IF;
END$$;

-- Core Tables

-- Table: users
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone_number text NOT NULL,
  email text NULL,
  is_active boolean DEFAULT true,
  role user_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT users_phone_number_check CHECK (phone_number ~ '^[0-9]{10}$')
);

-- Index on phone_number for faster searches
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users USING btree (phone_number);

-- Unique index on phone_number
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_number_key ON users USING btree (phone_number);


-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Administrators can manage users" ON users;
CREATE POLICY "Administrators can manage users" ON users
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "Users can view their own profile" ON users;
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT
  TO authenticated
  USING (uid() = id);

-- Table: academic_years
CREATE TABLE IF NOT EXISTS academic_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year_name text UNIQUE NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_current boolean DEFAULT false,
  transition_status text DEFAULT 'pending',
  transition_date timestamptz NULL,
  previous_year_id uuid NULL REFERENCES academic_years(id),
  next_year_id uuid NULL REFERENCES academic_years(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT academic_years_dates_check CHECK (end_date > start_date),
  CONSTRAINT academic_years_transition_status_check CHECK (transition_status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text]))
);

-- Index for is_current
CREATE INDEX IF NOT EXISTS idx_academic_years_is_current ON academic_years(is_current);

-- Trigger for updated_at
CREATE TRIGGER update_academic_years_updated_at
BEFORE UPDATE ON academic_years
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Administrators can manage academic years" ON academic_years;
CREATE POLICY "Administrators can manage academic years" ON academic_years
  FOR ALL
  TO public
  USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view academic years" ON academic_years;
CREATE POLICY "All authenticated users can view academic years" ON academic_years
  FOR SELECT
  TO authenticated
  USING (true);

-- Table: classes
CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  teacher_id uuid NULL REFERENCES users(id),
  academic_year_id uuid NOT NULL REFERENCES academic_years(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT classes_name_academic_year_id_key UNIQUE (name, academic_year_id)
);

-- Index on teacher_id for faster searches
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes USING btree (teacher_id);

-- Trigger for updated_at
CREATE TRIGGER update_classes_updated_at
BEFORE UPDATE ON classes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Administrators can manage classes" ON classes;
CREATE POLICY "Administrators can manage classes" ON classes
  FOR ALL
  TO public
  USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view classes" ON classes;
CREATE POLICY "All authenticated users can view classes" ON classes
  FOR SELECT
  TO authenticated
  USING (true);