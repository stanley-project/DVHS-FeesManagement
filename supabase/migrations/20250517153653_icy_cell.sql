/*
  # Initial Schema for School Fee Management System

  1. New Tables
    - users: System users with role-based access
    - students: Student information and details
    - classes: Class information with teacher assignments
    - fee_types: Different types of fees
    - fee_structure: Fee structure for each class
    - fee_payments: Record of fee payments
    - academic_years: Academic year management

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users based on their roles
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_role AS ENUM ('administrator', 'accountant', 'teacher');
CREATE TYPE payment_method AS ENUM ('cash', 'online');
CREATE TYPE fee_frequency AS ENUM ('monthly', 'quarterly', 'annual');
CREATE TYPE student_status AS ENUM ('active', 'inactive');

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

-- Create students table
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_number text UNIQUE NOT NULL,
  student_name text NOT NULL,
  gender text NOT NULL,
  date_of_birth date NOT NULL,
  class_id uuid REFERENCES classes(id),
  section text NOT NULL,
  admission_date date NOT NULL,
  status student_status DEFAULT 'active',
  exit_date date,
  address text NOT NULL,
  phone_number text NOT NULL,
  father_name text NOT NULL,
  mother_name text NOT NULL,
  student_aadhar text UNIQUE,
  father_aadhar text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT students_phone_number_check CHECK (phone_number ~ '^[0-9]{10}$'),
  CONSTRAINT students_aadhar_check CHECK (
    student_aadhar IS NULL OR student_aadhar ~ '^[0-9]{12}$'
  )
);

-- Create fee_types table
CREATE TABLE IF NOT EXISTS fee_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  frequency fee_frequency NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create fee_structure table
CREATE TABLE IF NOT EXISTS fee_structure (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES classes(id) NOT NULL,
  fee_type_id uuid REFERENCES fee_types(id) NOT NULL,
  amount decimal(10,2) NOT NULL,
  academic_year_id uuid REFERENCES academic_years(id) NOT NULL,
  due_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(class_id, fee_type_id, academic_year_id)
);

-- Create fee_payments table
CREATE TABLE IF NOT EXISTS fee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) NOT NULL,
  fee_structure_id uuid REFERENCES fee_structure(id) NOT NULL,
  amount_paid decimal(10,2) NOT NULL,
  payment_date date NOT NULL,
  payment_method payment_method NOT NULL,
  transaction_id text,
  receipt_number text UNIQUE NOT NULL,
  notes text,
  created_by uuid REFERENCES users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_students_admission_number ON students(admission_number);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_fee_structure_class_id ON fee_structure(class_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student_id ON fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_created_by ON fee_payments(created_by);
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_academic_years_is_current ON academic_years(is_current);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_structure ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users table policies
CREATE POLICY "Users can view their own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Administrators can manage users"
  ON users
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'administrator');

-- Students table policies
CREATE POLICY "All authenticated users can view students"
  ON students
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Administrators and accountants can manage students"
  ON students
  USING (auth.jwt() ->> 'role' IN ('administrator', 'accountant'));

-- Classes table policies
CREATE POLICY "All authenticated users can view classes"
  ON classes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Administrators can manage classes"
  ON classes
  USING (auth.jwt() ->> 'role' = 'administrator');

-- Fee types policies
CREATE POLICY "All authenticated users can view fee types"
  ON fee_types
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Administrators can manage fee types"
  ON fee_types
  USING (auth.jwt() ->> 'role' = 'administrator');

-- Fee structure policies
CREATE POLICY "All authenticated users can view fee structure"
  ON fee_structure
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Administrators can manage fee structure"
  ON fee_structure
  USING (auth.jwt() ->> 'role' = 'administrator');

-- Fee payments policies
CREATE POLICY "All authenticated users can view fee payments"
  ON fee_payments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Administrators and accountants can manage fee payments"
  ON fee_payments
  USING (auth.jwt() ->> 'role' IN ('administrator', 'accountant'));

-- Academic years policies
CREATE POLICY "All authenticated users can view academic years"
  ON academic_years
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Administrators can manage academic years"
  ON academic_years
  USING (auth.jwt() ->> 'role' = 'administrator');

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classes_updated_at
    BEFORE UPDATE ON classes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fee_types_updated_at
    BEFORE UPDATE ON fee_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fee_structure_updated_at
    BEFORE UPDATE ON fee_structure
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fee_payments_updated_at
    BEFORE UPDATE ON fee_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_academic_years_updated_at
    BEFORE UPDATE ON academic_years
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();