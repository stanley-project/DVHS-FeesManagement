-- This is a consolidated migration file combining all previous migrations.

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Enum: user_role
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('accountant', 'administrator', 'teacher');
  END IF;
END$$;

-- Enum: payment_method
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    CREATE TYPE payment_method AS ENUM ('cash', 'online');
  END IF;
END$$;

-- Enum: fee_frequency
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fee_frequency') THEN
    CREATE TYPE fee_frequency AS ENUM ('annual', 'monthly', 'quarterly');
  END IF;
END$$;

-- Enum: student_status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'student_status') THEN
    CREATE TYPE student_status AS ENUM ('active', 'inactive');
  END IF;
END$$;

-- Enum: registration_type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'registration_type') THEN
    CREATE TYPE registration_type AS ENUM ('continuing', 'new');
  END IF;
END$$;

-- Enum: fee_category
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fee_category') THEN
    CREATE TYPE fee_category AS ENUM ('admission', 'bus', 'school');
  END IF;
END$$;

-- Enum: promotion_status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'promotion_status') THEN
    CREATE TYPE promotion_status AS ENUM ('dropped_out', 'promoted', 'retained', 'transferred_out');
  END IF;
END$$;

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
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_number_key ON public.users USING btree (phone_number);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_users_updated_at
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
  USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text');

DROP POLICY IF EXISTS "Users can view their own profile" ON users;
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT
  TO authenticated
  USING (uid() = id);

-- Table: classes
CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  teacher_id uuid NULL REFERENCES users(id),
  academic_year_id uuid NOT NULL REFERENCES academic_years(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index on teacher_id for faster searches
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes USING btree (teacher_id);

-- Unique index on name and academic_year_id
CREATE UNIQUE INDEX IF NOT EXISTS classes_name_academic_year_id_key ON public.classes USING btree (name, academic_year_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_classes_updated_at
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
  USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text');

DROP POLICY IF EXISTS "All authenticated users can view classes" ON classes;
CREATE POLICY "All authenticated users can view classes" ON classes
  FOR SELECT
  TO authenticated
  USING (true);

-- Table: fee_payments
CREATE TABLE IF NOT EXISTS fee_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES students(id),
    fee_structure_id uuid NOT NULL REFERENCES fee_structure(id),
    amount_paid numeric(10,2) NOT NULL,
    payment_date date NOT NULL,
    payment_method payment_method NOT NULL,
    transaction_id text NULL,
    receipt_number text NOT NULL UNIQUE,
    notes text NULL,
    created_by uuid NOT NULL REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indexes for fee_payments
CREATE INDEX IF NOT EXISTS idx_fee_payments_student_id ON fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_created_by ON fee_payments(created_by);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_fee_payments_updated_at
    BEFORE UPDATE ON fee_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for fee_payments
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;

-- Policies for fee_payments
DROP POLICY IF EXISTS "Administrators and accountants can manage fee payments" ON fee_payments;
CREATE POLICY "Administrators and accountants can manage fee payments" ON fee_payments
    ON ALL
    TO public
    USING ((auth.jwt() ->> 'role'::text) = ANY (ARRAY['administrator'::text, 'accountant'::text]));

DROP POLICY IF EXISTS "All authenticated users can view fee payments" ON fee_payments;
CREATE POLICY "All authenticated users can view fee payments" ON fee_payments
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: academic_years
CREATE TABLE IF NOT EXISTS academic_years (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    year_name text UNIQUE NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_current boolean DEFAULT FALSE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    transition_status text DEFAULT 'pending',
    transition_date timestamptz NULL,
    previous_year_id uuid NULL REFERENCES academic_years(id),
    next_year_id uuid NULL REFERENCES academic_years(id),
    CONSTRAINT academic_years_dates_check CHECK (end_date > start_date),
    CONSTRAINT academic_years_transition_status_check CHECK (transition_status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text]))
);

-- Index for is_current
CREATE INDEX IF NOT EXISTS idx_academic_years_is_current ON academic_years(is_current);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_academic_years_updated_at
    BEFORE UPDATE ON academic_years
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for academic_years
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;

-- Policies for academic_years
DROP POLICY IF EXISTS "Administrators can manage academic years" ON academic_years;
CREATE POLICY "Administrators can manage academic years" ON academic_years
    ON ALL
    TO public
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view academic years" ON academic_years;
CREATE POLICY "All authenticated users can view academic years" ON academic_years
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: student_academic_history
CREATE TABLE IF NOT EXISTS student_academic_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES students(id),
    academic_year_id uuid NOT NULL REFERENCES academic_years(id),
    class_id uuid NOT NULL REFERENCES classes(id),
    section text NOT NULL,
    promotion_status promotion_status NULL,
    is_active_in_year boolean DEFAULT TRUE,
    registration_date_for_year date NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indexes for student_academic_history
CREATE INDEX IF NOT EXISTS idx_student_academic_history_student ON student_academic_history(student_id);
CREATE INDEX IF NOT EXISTS idx_student_academic_history_academic_year ON student_academic_history(academic_year_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_student_academic_history_updated_at
    BEFORE UPDATE ON student_academic_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for student_academic_history
ALTER TABLE student_academic_history ENABLE ROW LEVEL SECURITY;

-- Policies for student_academic_history
DROP POLICY IF EXISTS "Administrators and accountants can manage student academic hist" ON student_academic_history;
CREATE POLICY "Administrators and accountants can manage student academic hist" ON student_academic_history
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = ANY (ARRAY['administrator'::text, 'accountant'::text]));

DROP POLICY IF EXISTS "All authenticated users can view student academic history" ON student_academic_history;
CREATE POLICY "All authenticated users can view student academic history" ON student_academic_history
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: fee_types
CREATE TABLE IF NOT EXISTS fee_types (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text UNIQUE NOT NULL,
    description text NULL,
    frequency fee_frequency NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    category fee_category NOT NULL DEFAULT 'school',
    is_monthly boolean NOT NULL DEFAULT FALSE,
    is_for_new_students_only boolean NOT NULL DEFAULT FALSE,
    effective_from date NULL,
    effective_to date NULL,
    last_updated_by uuid NULL REFERENCES users(id)
);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_fee_types_updated_at
    BEFORE UPDATE ON fee_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for fee_types
ALTER TABLE fee_types ENABLE ROW LEVEL SECURITY;

-- Policies for fee_types
DROP POLICY IF EXISTS "Administrators can manage fee types" ON fee_types;
CREATE POLICY "Administrators can manage fee types" ON fee_types
    ON ALL
    TO public
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view fee types" ON fee_types;
CREATE POLICY "All authenticated users can view fee types" ON fee_types
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: fee_structure
CREATE TABLE IF NOT EXISTS fee_structure (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id uuid NOT NULL REFERENCES classes(id),
    fee_type_id uuid NOT NULL REFERENCES fee_types(id),
    amount numeric(10,2) NOT NULL,
    academic_year_id uuid NOT NULL REFERENCES academic_years(id),
    due_date date NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    village_id uuid NULL REFERENCES villages(id),
    applicable_to_new_students_only boolean NOT NULL DEFAULT FALSE,
    is_recurring_monthly boolean NOT NULL DEFAULT FALSE,
    last_updated_by uuid NULL REFERENCES users(id),
    notes text NULL,
    CONSTRAINT fee_structure_class_id_fee_type_id_academic_year_id_key UNIQUE (class_id, fee_type_id, academic_year_id)
);

-- Indexes for fee_structure
CREATE INDEX IF NOT EXISTS idx_fee_structure_class_id ON fee_structure(class_id);
CREATE INDEX IF NOT EXISTS idx_fee_structure_village_id ON fee_structure(village_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_fee_structure_updated_at
    BEFORE UPDATE ON fee_structure
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for fee_structure
ALTER TABLE fee_structure ENABLE ROW LEVEL SECURITY;

-- Policies for fee_structure
DROP POLICY IF EXISTS "Administrators can manage fee structure" ON fee_structure;
CREATE POLICY "Administrators can manage fee structure" ON fee_structure
    ON ALL
    TO public
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view fee structure" ON fee_structure;
CREATE POLICY "All authenticated users can view fee structure" ON fee_structure
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: academic_year_transitions
CREATE TABLE IF NOT EXISTS academic_year_transitions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    from_year_id uuid NOT NULL REFERENCES academic_years(id),
    to_year_id uuid NOT NULL REFERENCES academic_years(id),
    status text DEFAULT 'pending',
    started_at timestamptz DEFAULT now(),
    completed_at timestamptz NULL,
    total_students integer DEFAULT 0,
    promoted_students integer DEFAULT 0,
    retained_students integer DEFAULT 0,
    transferred_students integer DEFAULT 0,
    created_by uuid NULL REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT academic_year_transitions_status_check CHECK (status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'failed'::text]))
);

-- Indexes for academic_year_transitions
CREATE INDEX IF NOT EXISTS idx_academic_year_transitions_from_year ON academic_year_transitions(from_year_id);
CREATE INDEX IF NOT EXISTS idx_academic_year_transitions_to_year ON academic_year_transitions(to_year_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_academic_year_transitions_updated_at
    BEFORE UPDATE ON academic_year_transitions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for academic_year_transitions
ALTER TABLE academic_year_transitions ENABLE ROW LEVEL SECURITY;

-- Policies for academic_year_transitions
DROP POLICY IF EXISTS "Administrators can manage academic year transitions" ON academic_year_transitions;
CREATE POLICY "Administrators can manage academic year transitions" ON academic_year_transitions
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view academic year transitions" ON academic_year_transitions;
CREATE POLICY "All authenticated users can view academic year transitions" ON academic_year_transitions
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: student_promotion_history
CREATE TABLE IF NOT EXISTS student_promotion_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES students(id),
    academic_year_id uuid NOT NULL REFERENCES academic_years(id),
    from_class_id uuid NOT NULL REFERENCES classes(id),
    to_class_id uuid NOT NULL REFERENCES classes(id),
    promotion_status promotion_status NULL,
    promotion_date date NOT NULL,
    remarks text NULL,
    created_by uuid NOT NULL REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indexes for student_promotion_history
CREATE INDEX IF NOT EXISTS idx_student_promotion_history_student ON student_promotion_history(student_id);
CREATE INDEX IF NOT EXISTS idx_student_promotion_history_academic_year ON student_promotion_history(academic_year_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_student_promotion_history_updated_at
    BEFORE UPDATE ON student_promotion_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for student_promotion_history
ALTER TABLE student_promotion_history ENABLE ROW LEVEL SECURITY;

-- Policies for student_promotion_history
DROP POLICY IF EXISTS "Administrators and accountants can manage student promotion his" ON student_promotion_history;
CREATE POLICY "Administrators and accountants can manage student promotion his" ON student_promotion_history
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = ANY (ARRAY['administrator'::text, 'accountant'::text]));

DROP POLICY IF EXISTS "All authenticated users can view student promotion history" ON student_promotion_history;
CREATE POLICY "All authenticated users can view student promotion history" ON student_promotion_history
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: academic_year_settings
CREATE TABLE IF NOT EXISTS academic_year_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year_id uuid NOT NULL REFERENCES academic_years(id),
    setting_key text NOT NULL,
    setting_value jsonb NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT academic_year_settings_academic_year_id_setting_key_key UNIQUE (academic_year_id, setting_key)
);

-- Index for academic_year_settings
CREATE INDEX IF NOT EXISTS idx_academic_year_settings_year ON academic_year_settings(academic_year_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_academic_year_settings_updated_at
    BEFORE UPDATE ON academic_year_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for academic_year_settings
ALTER TABLE academic_year_settings ENABLE ROW LEVEL SECURITY;

-- Policies for academic_year_settings
DROP POLICY IF EXISTS "Administrators can manage academic year settings" ON academic_year_settings;
CREATE POLICY "Administrators can manage academic year settings" ON academic_year_settings
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view academic year settings" ON academic_year_settings;
CREATE POLICY "All authenticated users can view academic year settings" ON academic_year_settings
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: villages
CREATE TABLE IF NOT EXISTS villages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  distance_from_school numeric(5,2) NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  bus_number character varying(10) NULL
);

-- Create index on name for faster searches
CREATE INDEX IF NOT EXISTS idx_villages_name ON villages USING btree (name);
CREATE INDEX IF NOT EXISTS idx_villages_bus_number ON public.villages USING btree (bus_number);

-- Enable RLS
ALTER TABLE villages ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Administrators can manage villages" ON villages;
CREATE POLICY "Administrators can manage villages" ON villages
  ON ALL
  TO authenticated
  USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view villages" ON villages;
CREATE POLICY "All authenticated users can view villages" ON villages
  FOR SELECT
  TO authenticated
  USING (true);

-- Create trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_villages_updated_at
  BEFORE UPDATE ON villages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Table: bus_fee_structure
CREATE TABLE IF NOT EXISTS bus_fee_structure (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    village_id uuid NOT NULL REFERENCES villages(id),
    fee_amount numeric(10, 2) NOT NULL,
    academic_year_id uuid NOT NULL REFERENCES academic_years(id),
    effective_from_date date NOT NULL,
    effective_to_date date NOT NULL,
    is_active boolean NOT NULL DEFAULT TRUE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    notes text NULL,
    last_updated_by uuid NULL REFERENCES users(id),
    CONSTRAINT bus_fee_date_check CHECK (effective_to_date > effective_from_date),
    CONSTRAINT bus_fee_structure_village_id_academic_year_id_key UNIQUE (village_id, academic_year_id)
);

-- Indexes for bus_fee_structure
CREATE INDEX IF NOT EXISTS idx_bus_fee_structure_village_id ON bus_fee_structure(village_id);
CREATE INDEX IF NOT EXISTS idx_bus_fee_structure_academic_year ON bus_fee_structure(academic_year_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_bus_fee_structure_updated_at
    BEFORE UPDATE ON bus_fee_structure
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for bus_fee_structure
ALTER TABLE bus_fee_structure ENABLE ROW LEVEL SECURITY;

-- Policies for bus_fee_structure
DROP POLICY IF EXISTS "Administrators can manage bus fee structure" ON bus_fee_structure;
CREATE POLICY "Administrators can manage bus fee structure" ON bus_fee_structure
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view bus fee structure" ON bus_fee_structure;
CREATE POLICY "All authenticated users can view bus fee structure" ON bus_fee_structure
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: student_registration_history
CREATE TABLE IF NOT EXISTS student_registration_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES students(id),
    academic_year_id uuid NOT NULL REFERENCES academic_years(id),
    registration_type registration_type NOT NULL,
    registration_date date NOT NULL,
    previous_status student_status NULL,
    new_status student_status NOT NULL,
    reason text NULL,
    created_by uuid NOT NULL REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indexes for student_registration_history
CREATE INDEX IF NOT EXISTS idx_student_registration_history_student ON student_registration_history(student_id);
CREATE INDEX IF NOT EXISTS idx_student_registration_history_academic_year ON student_registration_history(academic_year_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_student_registration_history_updated_at
    BEFORE UPDATE ON student_registration_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for student_registration_history
ALTER TABLE student_registration_history ENABLE ROW LEVEL SECURITY;

-- Policies for student_registration_history
DROP POLICY IF EXISTS "Administrators and accountants can manage registration history" ON student_registration_history;
CREATE POLICY "Administrators and accountants can manage registration history" ON student_registration_history
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = ANY (ARRAY['administrator'::text, 'accountant'::text]));

DROP POLICY IF EXISTS "All authenticated users can view registration history" ON student_registration_history;
CREATE POLICY "All authenticated users can view registration history" ON student_registration_history
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: admission_fee_settings
CREATE TABLE IF NOT EXISTS admission_fee_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year_id uuid NOT NULL REFERENCES academic_years(id),
    amount numeric(10,2) NOT NULL,
    effective_from date NOT NULL,
    effective_to date NULL,
    is_active boolean NOT NULL DEFAULT TRUE,
    created_by uuid NOT NULL REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT admission_fee_date_check CHECK ((effective_to IS NULL) OR (effective_to > effective_from))
);

-- Index for admission_fee_settings
CREATE INDEX IF NOT EXISTS idx_admission_fee_settings_academic_year ON admission_fee_settings(academic_year_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_admission_fee_settings_updated_at
    BEFORE UPDATE ON admission_fee_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for admission_fee_settings
ALTER TABLE admission_fee_settings ENABLE ROW LEVEL SECURITY;

-- Policies for admission_fee_settings
DROP POLICY IF EXISTS "Administrators can manage admission fee settings" ON admission_fee_settings;
CREATE POLICY "Administrators can manage admission fee settings" ON admission_fee_settings
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view admission fee settings" ON admission_fee_settings;
CREATE POLICY "All authenticated users can view admission fee settings" ON admission_fee_settings
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: bus_fee_history
CREATE TABLE IF NOT EXISTS bus_fee_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    village_id uuid NOT NULL REFERENCES villages(id),
    previous_amount numeric(10,2) NULL,
    new_amount numeric(10,2) NOT NULL,
    change_date timestamptz DEFAULT now(),
    changed_by uuid NOT NULL REFERENCES users(id),
    reason text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for bus_fee_history
CREATE INDEX IF NOT EXISTS idx_bus_fee_history_village ON bus_fee_history(village_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_bus_fee_history_updated_at
    BEFORE UPDATE ON bus_fee_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for bus_fee_history
ALTER TABLE bus_fee_history ENABLE ROW LEVEL SECURITY;

-- Policies for bus_fee_history
DROP POLICY IF EXISTS "Administrators can manage bus fee history" ON bus_fee_history;
CREATE POLICY "Administrators can manage bus fee history" ON bus_fee_history
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view bus fee history" ON bus_fee_history;
CREATE POLICY "All authenticated users can view bus fee history" ON bus_fee_history
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: bus_fee_adjustments
CREATE TABLE IF NOT EXISTS bus_fee_adjustments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES students(id),
    village_id uuid NOT NULL REFERENCES villages(id),
    academic_year_id uuid NOT NULL REFERENCES academic_years(id),
    adjustment_amount numeric(10,2) NOT NULL,
    reason text NULL,
    is_active boolean NOT NULL DEFAULT TRUE,
    approved_by uuid NULL REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indexes for bus_fee_adjustments
CREATE INDEX IF NOT EXISTS idx_bus_fee_adjustments_student ON bus_fee_adjustments(student_id);
CREATE INDEX IF NOT EXISTS idx_bus_fee_adjustments_village ON bus_fee_adjustments(village_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_bus_fee_adjustments_updated_at
    BEFORE UPDATE ON bus_fee_adjustments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for bus_fee_adjustments
ALTER TABLE bus_fee_adjustments ENABLE ROW LEVEL SECURITY;

-- Policies for bus_fee_adjustments
DROP POLICY IF EXISTS "Administrators and accountants can manage bus fee adjustments" ON bus_fee_adjustments;
CREATE POLICY "Administrators and accountants can manage bus fee adjustments" ON bus_fee_adjustments
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = ANY (ARRAY['administrator'::text, 'accountant'::text]));

DROP POLICY IF EXISTS "All authenticated users can view bus fee adjustments" ON bus_fee_adjustments;
CREATE POLICY "All authenticated users can view bus fee adjustments" ON bus_fee_adjustments
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: students
CREATE TABLE IF NOT EXISTS students (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_number text UNIQUE NOT NULL,
    student_name text NOT NULL,
    gender text NOT NULL,
    date_of_birth date NOT NULL,
    class_id uuid NULL REFERENCES classes(id),
    section text NOT NULL,
    admission_date date NOT NULL,
    status student_status NULL DEFAULT 'active',
    exit_date date NULL,
    address text NOT NULL,
    phone_number text NOT NULL,
    father_name text NOT NULL,
    mother_name text NOT NULL,
    student_aadhar text UNIQUE NULL,
    father_aadhar text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    village_id uuid NULL REFERENCES villages(id),
    has_school_bus boolean NOT NULL DEFAULT FALSE,
    registration_type registration_type NOT NULL DEFAULT 'new',
    last_registration_date date NULL,
    last_registration_type registration_type NULL,
    previous_admission_number text NULL,
    rejoining_reason text NULL,
    CONSTRAINT students_aadhar_check CHECK ((student_aadhar IS NULL) OR (student_aadhar ~ '^[0-9]{12}$'::text)),
    CONSTRAINT students_phone_number_check CHECK (phone_number ~ '^[0-9]{10}$'::text)
);

-- Indexes for students
CREATE INDEX IF NOT EXISTS idx_students_admission_number ON students(admission_number);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_village_id ON students(village_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for students
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Policies for students
DROP POLICY IF EXISTS "Administrators and accountants can manage students" ON students;
CREATE POLICY "Administrators and accountants can manage students" ON students
    ON ALL
    TO public
    USING ((auth.jwt() ->> 'role'::text) = ANY (ARRAY['administrator'::text, 'accountant'::text]));

DROP POLICY IF EXISTS "All authenticated users can view students" ON students;
CREATE POLICY "All authenticated users can view students" ON students
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: fee_structure_history
CREATE TABLE IF NOT EXISTS fee_structure_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_structure_id uuid NULL REFERENCES fee_structure(id),
    previous_amount numeric(10,2) NULL,
    new_amount numeric(10,2) NOT NULL,
    change_date timestamptz DEFAULT now(),
    changed_by uuid NOT NULL REFERENCES users(id),
    reason text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for fee_structure_history
CREATE INDEX IF NOT EXISTS idx_fee_structure_history_fee_structure ON fee_structure_history(fee_structure_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_fee_structure_history_updated_at
    BEFORE UPDATE ON fee_structure_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for fee_structure_history
ALTER TABLE fee_structure_history ENABLE ROW LEVEL SECURITY;

-- Policies for fee_structure_history
DROP POLICY IF EXISTS "Administrators can manage fee structure history" ON fee_structure_history;
CREATE POLICY "Administrators can manage fee structure history" ON fee_structure_history
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view fee structure history" ON fee_structure_history;
CREATE POLICY "All authenticated users can view fee structure history" ON fee_structure_history
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: fee_structure_templates
CREATE TABLE IF NOT EXISTS fee_structure_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text NULL,
    fee_types jsonb NULL,
    created_by uuid NULL REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for fee_structure_templates
CREATE INDEX IF NOT EXISTS idx_fee_structure_templates_name ON fee_structure_templates(name);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_fee_structure_templates_updated_at
    BEFORE UPDATE ON fee_structure_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for fee_structure_templates
ALTER TABLE fee_structure_templates ENABLE ROW LEVEL SECURITY;

-- Policies for fee_structure_templates
DROP POLICY IF EXISTS "Administrators can manage fee structure templates" ON fee_structure_templates;
CREATE POLICY "Administrators can manage fee structure templates" ON fee_structure_templates
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view fee structure templates" ON fee_structure_templates;
CREATE POLICY "All authenticated users can view fee structure templates" ON fee_structure_templates
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: admission_fee_history
CREATE TABLE IF NOT EXISTS admission_fee_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    previous_amount numeric(10,2) NULL,
    new_amount numeric(10,2) NOT NULL,
    academic_year_id uuid NOT NULL REFERENCES academic_years(id),
    change_date timestamptz DEFAULT now(),
    changed_by uuid NOT NULL REFERENCES users(id),
    reason text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for admission_fee_history
CREATE INDEX IF NOT EXISTS idx_admission_fee_history_academic_year ON admission_fee_history(academic_year_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_admission_fee_history_updated_at
    BEFORE UPDATE ON admission_fee_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for admission_fee_history
ALTER TABLE admission_fee_history ENABLE ROW LEVEL SECURITY;

-- Policies for admission_fee_history
DROP POLICY IF EXISTS "Administrators can manage admission fee history" ON admission_fee_history;
CREATE POLICY "Administrators can manage admission fee history" ON admission_fee_history
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view admission fee history" ON admission_fee_history;
CREATE POLICY "All authenticated users can view admission fee history" ON admission_fee_history
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: bus_fee_adjustments
CREATE TABLE IF NOT EXISTS bus_fee_adjustments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES students(id),
    village_id uuid NOT NULL REFERENCES villages(id),
    academic_year_id uuid NOT NULL REFERENCES academic_years(id),
    adjustment_amount numeric(10,2) NOT NULL,
    reason text NULL,
    is_active boolean NOT NULL DEFAULT TRUE,
    approved_by uuid NULL REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indexes for bus_fee_adjustments
CREATE INDEX IF NOT EXISTS idx_bus_fee_adjustments_student ON bus_fee_adjustments(student_id);
CREATE INDEX IF NOT EXISTS idx_bus_fee_adjustments_village ON bus_fee_adjustments(village_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_bus_fee_adjustments_updated_at
    BEFORE UPDATE ON bus_fee_adjustments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for bus_fee_adjustments
ALTER TABLE bus_fee_adjustments ENABLE ROW LEVEL SECURITY;

-- Policies for bus_fee_adjustments
DROP POLICY IF EXISTS "Administrators and accountants can manage bus fee adjustments" ON bus_fee_adjustments;
CREATE POLICY "Administrators and accountants can manage bus fee adjustments" ON bus_fee_adjustments
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = ANY (ARRAY['administrator'::text, 'accountant'::text]));

DROP POLICY IF EXISTS "All authenticated users can view bus fee adjustments" ON bus_fee_adjustments;
CREATE POLICY "All authenticated users can view bus fee adjustments" ON bus_fee_adjustments
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: students
CREATE TABLE IF NOT EXISTS students (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_number text UNIQUE NOT NULL,
    student_name text NOT NULL,
    gender text NOT NULL,
    date_of_birth date NOT NULL,
    class_id uuid NULL REFERENCES classes(id),
    section text NOT NULL,
    admission_date date NOT NULL,
    status student_status NULL DEFAULT 'active',
    exit_date date NULL,
    address text NOT NULL,
    phone_number text NOT NULL,
    father_name text NOT NULL,
    mother_name text NOT NULL,
    student_aadhar text UNIQUE NULL,
    father_aadhar text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    village_id uuid NULL REFERENCES villages(id),
    has_school_bus boolean NOT NULL DEFAULT FALSE,
    registration_type registration_type NOT NULL DEFAULT 'new',
    last_registration_date date NULL,
    last_registration_type registration_type NULL,
    previous_admission_number text NULL,
    rejoining_reason text NULL,
    CONSTRAINT students_aadhar_check CHECK ((student_aadhar IS NULL) OR (student_aadhar ~ '^[0-9]{12}$'::text)),
    CONSTRAINT students_phone_number_check CHECK (phone_number ~ '^[0-9]{10}$'::text)
);

-- Indexes for students
CREATE INDEX IF NOT EXISTS idx_students_admission_number ON students(admission_number);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_village_id ON students(village_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for students
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Policies for students
DROP POLICY IF EXISTS "Administrators and accountants can manage students" ON students;
CREATE POLICY "Administrators and accountants can manage students" ON students
    ON ALL
    TO public
    USING ((auth.jwt() ->> 'role'::text) = ANY (ARRAY['administrator'::text, 'accountant'::text]));

DROP POLICY IF EXISTS "All authenticated users can view students" ON students;
CREATE POLICY "All authenticated users can view students" ON students
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: fee_structure_history
CREATE TABLE IF NOT EXISTS fee_structure_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_structure_id uuid NULL REFERENCES fee_structure(id),
    previous_amount numeric(10,2) NULL,
    new_amount numeric(10,2) NOT NULL,
    change_date timestamptz DEFAULT now(),
    changed_by uuid NOT NULL REFERENCES users(id),
    reason text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for fee_structure_history
CREATE INDEX IF NOT EXISTS idx_fee_structure_history_fee_structure ON fee_structure_history(fee_structure_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_fee_structure_history_updated_at
    BEFORE UPDATE ON fee_structure_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for fee_structure_history
ALTER TABLE fee_structure_history ENABLE ROW LEVEL SECURITY;

-- Policies for fee_structure_history
DROP POLICY IF EXISTS "Administrators can manage fee structure history" ON fee_structure_history;
CREATE POLICY "Administrators can manage fee structure history" ON fee_structure_history
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view fee structure history" ON fee_structure_history;
CREATE POLICY "All authenticated users can view fee structure history" ON fee_structure_history
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: fee_structure_templates
CREATE TABLE IF NOT EXISTS fee_structure_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text NULL,
    fee_types jsonb NULL,
    created_by uuid NULL REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for fee_structure_templates
CREATE INDEX IF NOT EXISTS idx_fee_structure_templates_name ON fee_structure_templates(name);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_fee_structure_templates_updated_at
    BEFORE UPDATE ON fee_structure_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for fee_structure_templates
ALTER TABLE fee_structure_templates ENABLE ROW LEVEL SECURITY;

-- Policies for fee_structure_templates
DROP POLICY IF EXISTS "Administrators can manage fee structure templates" ON fee_structure_templates;
CREATE POLICY "Administrators can manage fee structure templates" ON fee_structure_templates
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view fee structure templates" ON fee_structure_templates;
CREATE POLICY "All authenticated users can view fee structure templates" ON fee_structure_templates
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: admission_fee_history
CREATE TABLE IF NOT EXISTS admission_fee_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    previous_amount numeric(10,2) NULL,
    new_amount numeric(10,2) NOT NULL,
    academic_year_id uuid NOT NULL REFERENCES academic_years(id),
    change_date timestamptz DEFAULT now(),
    changed_by uuid NOT NULL REFERENCES users(id),
    reason text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for admission_fee_history
CREATE INDEX IF NOT EXISTS idx_admission_fee_history_academic_year ON admission_fee_history(academic_year_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_admission_fee_history_updated_at
    BEFORE UPDATE ON admission_fee_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for admission_fee_history
ALTER TABLE admission_fee_history ENABLE ROW LEVEL SECURITY;

-- Policies for admission_fee_history
DROP POLICY IF EXISTS "Administrators can manage admission fee history" ON admission_fee_history;
CREATE POLICY "Administrators can manage admission fee history" ON admission_fee_history
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view admission fee history" ON admission_fee_history;
CREATE POLICY "All authenticated users can view admission fee history" ON admission_fee_history
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: bus_fee_history
CREATE TABLE IF NOT EXISTS bus_fee_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    village_id uuid NOT NULL REFERENCES villages(id),
    previous_amount numeric(10,2) NULL,
    new_amount numeric(10,2) NOT NULL,
    change_date timestamptz DEFAULT now(),
    changed_by uuid NOT NULL REFERENCES users(id),
    reason text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for bus_fee_history
CREATE INDEX IF NOT EXISTS idx_bus_fee_history_village ON bus_fee_history(village_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_bus_fee_history_updated_at
    BEFORE UPDATE ON bus_fee_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for bus_fee_history
ALTER TABLE bus_fee_history ENABLE ROW LEVEL SECURITY;

-- Policies for bus_fee_history
DROP POLICY IF EXISTS "Administrators can manage bus fee history" ON bus_fee_history;
CREATE POLICY "Administrators can manage bus fee history" ON bus_fee_history
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view bus fee history" ON bus_fee_history;
CREATE POLICY "All authenticated users can view bus fee history" ON bus_fee_history
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: bus_fee_adjustments
CREATE TABLE IF NOT EXISTS bus_fee_adjustments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES students(id),
    village_id uuid NOT NULL REFERENCES villages(id),
    academic_year_id uuid NOT NULL REFERENCES academic_years(id),
    adjustment_amount numeric(10,2) NOT NULL,
    reason text NULL,
    is_active boolean NOT NULL DEFAULT TRUE,
    approved_by uuid NULL REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indexes for bus_fee_adjustments
CREATE INDEX IF NOT EXISTS idx_bus_fee_adjustments_student ON bus_fee_adjustments(student_id);
CREATE INDEX IF NOT EXISTS idx_bus_fee_adjustments_village ON bus_fee_adjustments(village_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_bus_fee_adjustments_updated_at
    BEFORE UPDATE ON bus_fee_adjustments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for bus_fee_adjustments
ALTER TABLE bus_fee_adjustments ENABLE ROW LEVEL SECURITY;

-- Policies for bus_fee_adjustments
DROP POLICY IF EXISTS "Administrators and accountants can manage bus fee adjustments" ON bus_fee_adjustments;
CREATE POLICY "Administrators and accountants can manage bus fee adjustments" ON bus_fee_adjustments
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = ANY (ARRAY['administrator'::text, 'accountant'::text]));

DROP POLICY IF EXISTS "All authenticated users can view bus fee adjustments" ON bus_fee_adjustments;
CREATE POLICY "All authenticated users can view bus fee adjustments" ON bus_fee_adjustments
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: students
CREATE TABLE IF NOT EXISTS students (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_number text UNIQUE NOT NULL,
    student_name text NOT NULL,
    gender text NOT NULL,
    date_of_birth date NOT NULL,
    class_id uuid NULL REFERENCES classes(id),
    section text NOT NULL,
    admission_date date NOT NULL,
    status student_status NULL DEFAULT 'active',
    exit_date date NULL,
    address text NOT NULL,
    phone_number text NOT NULL,
    father_name text NOT NULL,
    mother_name text NOT NULL,
    student_aadhar text UNIQUE NULL,
    father_aadhar text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    village_id uuid NULL REFERENCES villages(id),
    has_school_bus boolean NOT NULL DEFAULT FALSE,
    registration_type registration_type NOT NULL DEFAULT 'new',
    last_registration_date date NULL,
    last_registration_type registration_type NULL,
    previous_admission_number text NULL,
    rejoining_reason text NULL,
    CONSTRAINT students_aadhar_check CHECK ((student_aadhar IS NULL) OR (student_aadhar ~ '^[0-9]{12}$'::text)),
    CONSTRAINT students_phone_number_check CHECK (phone_number ~ '^[0-9]{10}$'::text)
);

-- Indexes for students
CREATE INDEX IF NOT EXISTS idx_students_admission_number ON students(admission_number);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_village_id ON students(village_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for students
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Policies for students
DROP POLICY IF EXISTS "Administrators and accountants can manage students" ON students;
CREATE POLICY "Administrators and accountants can manage students" ON students
    ON ALL
    TO public
    USING ((auth.jwt() ->> 'role'::text) = ANY (ARRAY['administrator'::text, 'accountant'::text]));

DROP POLICY IF EXISTS "All authenticated users can view students" ON students;
CREATE POLICY "All authenticated users can view students" ON students
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: fee_structure_history
CREATE TABLE IF NOT EXISTS fee_structure_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_structure_id uuid NULL REFERENCES fee_structure(id),
    previous_amount numeric(10,2) NULL,
    new_amount numeric(10,2) NOT NULL,
    change_date timestamptz DEFAULT now(),
    changed_by uuid NOT NULL REFERENCES users(id),
    reason text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for fee_structure_history
CREATE INDEX IF NOT EXISTS idx_fee_structure_history_fee_structure ON fee_structure_history(fee_structure_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_fee_structure_history_updated_at
    BEFORE UPDATE ON fee_structure_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for fee_structure_history
ALTER TABLE fee_structure_history ENABLE ROW LEVEL SECURITY;

-- Policies for fee_structure_history
DROP POLICY IF EXISTS "Administrators can manage fee structure history" ON fee_structure_history;
CREATE POLICY "Administrators can manage fee structure history" ON fee_structure_history
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view fee structure history" ON fee_structure_history;
CREATE POLICY "All authenticated users can view fee structure history" ON fee_structure_history
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: fee_structure_templates
CREATE TABLE IF NOT EXISTS fee_structure_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text NULL,
    fee_types jsonb NULL,
    created_by uuid NULL REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for fee_structure_templates
CREATE INDEX IF NOT EXISTS idx_fee_structure_templates_name ON fee_structure_templates(name);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_fee_structure_templates_updated_at
    BEFORE UPDATE ON fee_structure_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for fee_structure_templates
ALTER TABLE fee_structure_templates ENABLE ROW LEVEL SECURITY;

-- Policies for fee_structure_templates
DROP POLICY IF EXISTS "Administrators can manage fee structure templates" ON fee_structure_templates;
CREATE POLICY "Administrators can manage fee structure templates" ON fee_structure_templates
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view fee structure templates" ON fee_structure_templates;
CREATE POLICY "All authenticated users can view fee structure templates" ON fee_structure_templates
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: admission_fee_history
CREATE TABLE IF NOT EXISTS admission_fee_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    previous_amount numeric(10,2) NULL,
    new_amount numeric(10,2) NOT NULL,
    academic_year_id uuid NOT NULL REFERENCES academic_years(id),
    change_date timestamptz DEFAULT now(),
    changed_by uuid NOT NULL REFERENCES users(id),
    reason text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for admission_fee_history
CREATE INDEX IF NOT EXISTS idx_admission_fee_history_academic_year ON admission_fee_history(academic_year_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_admission_fee_history_updated_at
    BEFORE UPDATE ON admission_fee_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for admission_fee_history
ALTER TABLE admission_fee_history ENABLE ROW LEVEL SECURITY;

-- Policies for admission_fee_history
DROP POLICY IF EXISTS "Administrators can manage admission fee history" ON admission_fee_history;
CREATE POLICY "Administrators can manage admission fee history" ON admission_fee_history
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view admission fee history" ON admission_fee_history;
CREATE POLICY "All authenticated users can view admission fee history" ON admission_fee_history
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: bus_fee_history
CREATE TABLE IF NOT EXISTS bus_fee_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    village_id uuid NOT NULL REFERENCES villages(id),
    previous_amount numeric(10,2) NULL,
    new_amount numeric(10,2) NOT NULL,
    change_date timestamptz DEFAULT now(),
    changed_by uuid NOT NULL REFERENCES users(id),
    reason text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for bus_fee_history
CREATE INDEX IF NOT EXISTS idx_bus_fee_history_village ON bus_fee_history(village_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_bus_fee_history_updated_at
    BEFORE UPDATE ON bus_fee_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for bus_fee_history
ALTER TABLE bus_fee_history ENABLE ROW LEVEL SECURITY;

-- Policies for bus_fee_history
DROP POLICY IF EXISTS "Administrators can manage bus fee history" ON bus_fee_history;
CREATE POLICY "Administrators can manage bus fee history" ON bus_fee_history
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view bus fee history" ON bus_fee_history;
CREATE POLICY "All authenticated users can view bus fee history" ON bus_fee_history
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: bus_fee_adjustments
CREATE TABLE IF NOT EXISTS bus_fee_adjustments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES students(id),
    village_id uuid NOT NULL REFERENCES villages(id),
    academic_year_id uuid NOT NULL REFERENCES academic_years(id),
    adjustment_amount numeric(10,2) NOT NULL,
    reason text NULL,
    is_active boolean NOT NULL DEFAULT TRUE,
    approved_by uuid NULL REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indexes for bus_fee_adjustments
CREATE INDEX IF NOT EXISTS idx_bus_fee_adjustments_student ON bus_fee_adjustments(student_id);
CREATE INDEX IF NOT EXISTS idx_bus_fee_adjustments_village ON bus_fee_adjustments(village_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_bus_fee_adjustments_updated_at
    BEFORE UPDATE ON bus_fee_adjustments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for bus_fee_adjustments
ALTER TABLE bus_fee_adjustments ENABLE ROW LEVEL SECURITY;

-- Policies for bus_fee_adjustments
DROP POLICY IF EXISTS "Administrators and accountants can manage bus fee adjustments" ON bus_fee_adjustments;
CREATE POLICY "Administrators and accountants can manage bus fee adjustments" ON bus_fee_adjustments
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = ANY (ARRAY['administrator'::text, 'accountant'::text]));

DROP POLICY IF EXISTS "All authenticated users can view bus fee adjustments" ON bus_fee_adjustments;
CREATE POLICY "All authenticated users can view bus fee adjustments" ON bus_fee_adjustments
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: students
CREATE TABLE IF NOT EXISTS students (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_number text UNIQUE NOT NULL,
    student_name text NOT NULL,
    gender text NOT NULL,
    date_of_birth date NOT NULL,
    class_id uuid NULL REFERENCES classes(id),
    section text NOT NULL,
    admission_date date NOT NULL,
    status student_status NULL DEFAULT 'active',
    exit_date date NULL,
    address text NOT NULL,
    phone_number text NOT NULL,
    father_name text NOT NULL,
    mother_name text NOT NULL,
    student_aadhar text UNIQUE NULL,
    father_aadhar text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    village_id uuid NULL REFERENCES villages(id),
    has_school_bus boolean NOT NULL DEFAULT FALSE,
    registration_type registration_type NOT NULL DEFAULT 'new',
    last_registration_date date NULL,
    last_registration_type registration_type NULL,
    previous_admission_number text NULL,
    rejoining_reason text NULL,
    CONSTRAINT students_aadhar_check CHECK ((student_aadhar IS NULL) OR (student_aadhar ~ '^[0-9]{12}$'::text)),
    CONSTRAINT students_phone_number_check CHECK (phone_number ~ '^[0-9]{10}$'::text)
);

-- Indexes for students
CREATE INDEX IF NOT EXISTS idx_students_admission_number ON students(admission_number);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_village_id ON students(village_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for students
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Policies for students
DROP POLICY IF EXISTS "Administrators and accountants can manage students" ON students;
CREATE POLICY "Administrators and accountants can manage students" ON students
    ON ALL
    TO public
    USING ((auth.jwt() ->> 'role'::text) = ANY (ARRAY['administrator'::text, 'accountant'::text]));

DROP POLICY IF EXISTS "All authenticated users can view students" ON students;
CREATE POLICY "All authenticated users can view students" ON students
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: fee_structure_history
CREATE TABLE IF NOT EXISTS fee_structure_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_structure_id uuid NULL REFERENCES fee_structure(id),
    previous_amount numeric(10,2) NULL,
    new_amount numeric(10,2) NOT NULL,
    change_date timestamptz DEFAULT now(),
    changed_by uuid NOT NULL REFERENCES users(id),
    reason text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for fee_structure_history
CREATE INDEX IF NOT EXISTS idx_fee_structure_history_fee_structure ON fee_structure_history(fee_structure_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_fee_structure_history_updated_at
    BEFORE UPDATE ON fee_structure_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for fee_structure_history
ALTER TABLE fee_structure_history ENABLE ROW LEVEL SECURITY;

-- Policies for fee_structure_history
DROP POLICY IF EXISTS "Administrators can manage fee structure history" ON fee_structure_history;
CREATE POLICY "Administrators can manage fee structure history" ON fee_structure_history
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view fee structure history" ON fee_structure_history;
CREATE POLICY "All authenticated users can view fee structure history" ON fee_structure_history
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: fee_structure_templates
CREATE TABLE IF NOT EXISTS fee_structure_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text NULL,
    fee_types jsonb NULL,
    created_by uuid NULL REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for fee_structure_templates
CREATE INDEX IF NOT EXISTS idx_fee_structure_templates_name ON fee_structure_templates(name);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_fee_structure_templates_updated_at
    BEFORE UPDATE ON fee_structure_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for fee_structure_templates
ALTER TABLE fee_structure_templates ENABLE ROW LEVEL SECURITY;

-- Policies for fee_structure_templates
DROP POLICY IF EXISTS "Administrators can manage fee structure templates" ON fee_structure_templates;
CREATE POLICY "Administrators can manage fee structure templates" ON fee_structure_templates
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view fee structure templates" ON fee_structure_templates;
CREATE POLICY "All authenticated users can view fee structure templates" ON fee_structure_templates
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: admission_fee_history
CREATE TABLE IF NOT EXISTS admission_fee_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    previous_amount numeric(10,2) NULL,
    new_amount numeric(10,2) NOT NULL,
    academic_year_id uuid NOT NULL REFERENCES academic_years(id),
    change_date timestamptz DEFAULT now(),
    changed_by uuid NOT NULL REFERENCES users(id),
    reason text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for admission_fee_history
CREATE INDEX IF NOT EXISTS idx_admission_fee_history_academic_year ON admission_fee_history(academic_year_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_admission_fee_history_updated_at
    BEFORE UPDATE ON admission_fee_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for admission_fee_history
ALTER TABLE admission_fee_history ENABLE ROW LEVEL SECURITY;

-- Policies for admission_fee_history
DROP POLICY IF EXISTS "Administrators can manage admission fee history" ON admission_fee_history;
CREATE POLICY "Administrators can manage admission fee history" ON admission_fee_history
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view admission fee history" ON admission_fee_history;
CREATE POLICY "All authenticated users can view admission fee history" ON admission_fee_history
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: bus_fee_history
CREATE TABLE IF NOT EXISTS bus_fee_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    village_id uuid NOT NULL REFERENCES villages(id),
    previous_amount numeric(10,2) NULL,
    new_amount numeric(10,2) NOT NULL,
    change_date timestamptz DEFAULT now(),
    changed_by uuid NOT NULL REFERENCES users(id),
    reason text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for bus_fee_history
CREATE INDEX IF NOT EXISTS idx_bus_fee_history_village ON bus_fee_history(village_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_bus_fee_history_updated_at
    BEFORE UPDATE ON bus_fee_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for bus_fee_history
ALTER TABLE bus_fee_history ENABLE ROW LEVEL SECURITY;

-- Policies for bus_fee_history
DROP POLICY IF EXISTS "Administrators can manage bus fee history" ON bus_fee_history;
CREATE POLICY "Administrators can manage bus fee history" ON bus_fee_history
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view bus fee history" ON bus_fee_history;
CREATE POLICY "All authenticated users can view bus fee history" ON bus_fee_history
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: bus_fee_adjustments
CREATE TABLE IF NOT EXISTS bus_fee_adjustments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES students(id),
    village_id uuid NOT NULL REFERENCES villages(id),
    academic_year_id uuid NOT NULL REFERENCES academic_years(id),
    adjustment_amount numeric(10,2) NOT NULL,
    reason text NULL,
    is_active boolean NOT NULL DEFAULT TRUE,
    approved_by uuid NULL REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indexes for bus_fee_adjustments
CREATE INDEX IF NOT EXISTS idx_bus_fee_adjustments_student ON bus_fee_adjustments(student_id);
CREATE INDEX IF NOT EXISTS idx_bus_fee_adjustments_village ON bus_fee_adjustments(village_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_bus_fee_adjustments_updated_at
    BEFORE UPDATE ON bus_fee_adjustments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for bus_fee_adjustments
ALTER TABLE bus_fee_adjustments ENABLE ROW LEVEL SECURITY;

-- Policies for bus_fee_adjustments
DROP POLICY IF EXISTS "Administrators and accountants can manage bus fee adjustments" ON bus_fee_adjustments;
CREATE POLICY "Administrators and accountants can manage bus fee adjustments" ON bus_fee_adjustments
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = ANY (ARRAY['administrator'::text, 'accountant'::text]));

DROP POLICY IF EXISTS "All authenticated users can view bus fee adjustments" ON bus_fee_adjustments;
CREATE POLICY "All authenticated users can view bus fee adjustments" ON bus_fee_adjustments
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: students
CREATE TABLE IF NOT EXISTS students (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_number text UNIQUE NOT NULL,
    student_name text NOT NULL,
    gender text NOT NULL,
    date_of_birth date NOT NULL,
    class_id uuid NULL REFERENCES classes(id),
    section text NOT NULL,
    admission_date date NOT NULL,
    status student_status NULL DEFAULT 'active',
    exit_date date NULL,
    address text NOT NULL,
    phone_number text NOT NULL,
    father_name text NOT NULL,
    mother_name text NOT NULL,
    student_aadhar text UNIQUE NULL,
    father_aadhar text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    village_id uuid NULL REFERENCES villages(id),
    has_school_bus boolean NOT NULL DEFAULT FALSE,
    registration_type registration_type NOT NULL DEFAULT 'new',
    last_registration_date date NULL,
    last_registration_type registration_type NULL,
    previous_admission_number text NULL,
    rejoining_reason text NULL,
    CONSTRAINT students_aadhar_check CHECK ((student_aadhar IS NULL) OR (student_aadhar ~ '^[0-9]{12}$'::text)),
    CONSTRAINT students_phone_number_check CHECK (phone_number ~ '^[0-9]{10}$'::text)
);

-- Indexes for students
CREATE INDEX IF NOT EXISTS idx_students_admission_number ON students(admission_number);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_village_id ON students(village_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for students
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Policies for students
DROP POLICY IF EXISTS "Administrators and accountants can manage students" ON students;
CREATE POLICY "Administrators and accountants can manage students" ON students
    ON ALL
    TO public
    USING ((auth.jwt() ->> 'role'::text) = ANY (ARRAY['administrator'::text, 'accountant'::text]));

DROP POLICY IF EXISTS "All authenticated users can view students" ON students;
CREATE POLICY "All authenticated users can view students" ON students
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: fee_structure_history
CREATE TABLE IF NOT EXISTS fee_structure_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_structure_id uuid NULL REFERENCES fee_structure(id),
    previous_amount numeric(10,2) NULL,
    new_amount numeric(10,2) NOT NULL,
    change_date timestamptz DEFAULT now(),
    changed_by uuid NOT NULL REFERENCES users(id),
    reason text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for fee_structure_history
CREATE INDEX IF NOT EXISTS idx_fee_structure_history_fee_structure ON fee_structure_history(fee_structure_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_fee_structure_history_updated_at
    BEFORE UPDATE ON fee_structure_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for fee_structure_history
ALTER TABLE fee_structure_history ENABLE ROW LEVEL SECURITY;

-- Policies for fee_structure_history
DROP POLICY IF EXISTS "Administrators can manage fee structure history" ON fee_structure_history;
CREATE POLICY "Administrators can manage fee structure history" ON fee_structure_history
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view fee structure history" ON fee_structure_history;
CREATE POLICY "All authenticated users can view fee structure history" ON fee_structure_history
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: fee_structure_templates
CREATE TABLE IF NOT EXISTS fee_structure_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text NULL,
    fee_types jsonb NULL,
    created_by uuid NULL REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for fee_structure_templates
CREATE INDEX IF NOT EXISTS idx_fee_structure_templates_name ON fee_structure_templates(name);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_fee_structure_templates_updated_at
    BEFORE UPDATE ON fee_structure_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for fee_structure_templates
ALTER TABLE fee_structure_templates ENABLE ROW LEVEL SECURITY;

-- Policies for fee_structure_templates
DROP POLICY IF EXISTS "Administrators can manage fee structure templates" ON fee_structure_templates;
CREATE POLICY "Administrators can manage fee structure templates" ON fee_structure_templates
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view fee structure templates" ON fee_structure_templates;
CREATE POLICY "All authenticated users can view fee structure templates" ON fee_structure_templates
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: admission_fee_history
CREATE TABLE IF NOT EXISTS admission_fee_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    previous_amount numeric(10,2) NULL,
    new_amount numeric(10,2) NOT NULL,
    academic_year_id uuid NOT NULL REFERENCES academic_years(id),
    change_date timestamptz DEFAULT now(),
    changed_by uuid NOT NULL REFERENCES users(id),
    reason text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for admission_fee_history
CREATE INDEX IF NOT EXISTS idx_admission_fee_history_academic_year ON admission_fee_history(academic_year_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_admission_fee_history_updated_at
    BEFORE UPDATE ON admission_fee_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for admission_fee_history
ALTER TABLE admission_fee_history ENABLE ROW LEVEL SECURITY;

-- Policies for admission_fee_history
DROP POLICY IF EXISTS "Administrators can manage admission fee history" ON admission_fee_history;
CREATE POLICY "Administrators can manage admission fee history" ON admission_fee_history
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view admission fee history" ON admission_fee_history;
CREATE POLICY "All authenticated users can view admission fee history" ON admission_fee_history
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: bus_fee_history
CREATE TABLE IF NOT EXISTS bus_fee_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    village_id uuid NOT NULL REFERENCES villages(id),
    previous_amount numeric(10,2) NULL,
    new_amount numeric(10,2) NOT NULL,
    change_date timestamptz DEFAULT now(),
    changed_by uuid NOT NULL REFERENCES users(id),
    reason text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for bus_fee_history
CREATE INDEX IF NOT EXISTS idx_bus_fee_history_village ON bus_fee_history(village_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_bus_fee_history_updated_at
    BEFORE UPDATE ON bus_fee_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for bus_fee_history
ALTER TABLE bus_fee_history ENABLE ROW LEVEL SECURITY;

-- Policies for bus_fee_history
DROP POLICY IF EXISTS "Administrators can manage bus fee history" ON bus_fee_history;
CREATE POLICY "Administrators can manage bus fee history" ON bus_fee_history
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view bus fee history" ON bus_fee_history;
CREATE POLICY "All authenticated users can view bus fee history" ON bus_fee_history
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: bus_fee_adjustments
CREATE TABLE IF NOT EXISTS bus_fee_adjustments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES students(id),
    village_id uuid NOT NULL REFERENCES villages(id),
    academic_year_id uuid NOT NULL REFERENCES academic_years(id),
    adjustment_amount numeric(10,2) NOT NULL,
    reason text NULL,
    is_active boolean NOT NULL DEFAULT TRUE,
    approved_by uuid NULL REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indexes for bus_fee_adjustments
CREATE INDEX IF NOT EXISTS idx_bus_fee_adjustments_student ON bus_fee_adjustments(student_id);
CREATE INDEX IF NOT EXISTS idx_bus_fee_adjustments_village ON bus_fee_adjustments(village_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_bus_fee_adjustments_updated_at
    BEFORE UPDATE ON bus_fee_adjustments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for bus_fee_adjustments
ALTER TABLE bus_fee_adjustments ENABLE ROW LEVEL SECURITY;

-- Policies for bus_fee_adjustments
DROP POLICY IF EXISTS "Administrators and accountants can manage bus fee adjustments" ON bus_fee_adjustments;
CREATE POLICY "Administrators and accountants can manage bus fee adjustments" ON bus_fee_adjustments
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = ANY (ARRAY['administrator'::text, 'accountant'::text]));

DROP POLICY IF EXISTS "All authenticated users can view bus fee adjustments" ON bus_fee_adjustments;
CREATE POLICY "All authenticated users can view bus fee adjustments" ON bus_fee_adjustments
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: students
CREATE TABLE IF NOT EXISTS students (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_number text UNIQUE NOT NULL,
    student_name text NOT NULL,
    gender text NOT NULL,
    date_of_birth date NOT NULL,
    class_id uuid NULL REFERENCES classes(id),
    section text NOT NULL,
    admission_date date NOT NULL,
    status student_status NULL DEFAULT 'active',
    exit_date date NULL,
    address text NOT NULL,
    phone_number text NOT NULL,
    father_name text NOT NULL,
    mother_name text NOT NULL,
    student_aadhar text UNIQUE NULL,
    father_aadhar text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    village_id uuid NULL REFERENCES villages(id),
    has_school_bus boolean NOT NULL DEFAULT FALSE,
    registration_type registration_type NOT NULL DEFAULT 'new',
    last_registration_date date NULL,
    last_registration_type registration_type NULL,
    previous_admission_number text NULL,
    rejoining_reason text NULL,
    CONSTRAINT students_aadhar_check CHECK ((student_aadhar IS NULL) OR (student_aadhar ~ '^[0-9]{12}$'::text)),
    CONSTRAINT students_phone_number_check CHECK (phone_number ~ '^[0-9]{10}$'::text)
);

-- Indexes for students
CREATE INDEX IF NOT EXISTS idx_students_admission_number ON students(admission_number);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_village_id ON students(village_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for students
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Policies for students
DROP POLICY IF EXISTS "Administrators and accountants can manage students" ON students;
CREATE POLICY "Administrators and accountants can manage students" ON students
    ON ALL
    TO public
    USING ((auth.jwt() ->> 'role'::text) = ANY (ARRAY['administrator'::text, 'accountant'::text]));

DROP POLICY IF EXISTS "All authenticated users can view students" ON students;
CREATE POLICY "All authenticated users can view students" ON students
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: fee_structure_history
CREATE TABLE IF NOT EXISTS fee_structure_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_structure_id uuid NULL REFERENCES fee_structure(id),
    previous_amount numeric(10,2) NULL,
    new_amount numeric(10,2) NOT NULL,
    change_date timestamptz DEFAULT now(),
    changed_by uuid NOT NULL REFERENCES users(id),
    reason text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for fee_structure_history
CREATE INDEX IF NOT EXISTS idx_fee_structure_history_fee_structure ON fee_structure_history(fee_structure_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_fee_structure_history_updated_at
    BEFORE UPDATE ON fee_structure_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for fee_structure_history
ALTER TABLE fee_structure_history ENABLE ROW LEVEL SECURITY;

-- Policies for fee_structure_history
DROP POLICY IF EXISTS "Administrators can manage fee structure history" ON fee_structure_history;
CREATE POLICY "Administrators can manage fee structure history" ON fee_structure_history
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view fee structure history" ON fee_structure_history;
CREATE POLICY "All authenticated users can view fee structure history" ON fee_structure_history
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: fee_structure_templates
CREATE TABLE IF NOT EXISTS fee_structure_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text NULL,
    fee_types jsonb NULL,
    created_by uuid NULL REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for fee_structure_templates
CREATE INDEX IF NOT EXISTS idx_fee_structure_templates_name ON fee_structure_templates(name);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_fee_structure_templates_updated_at
    BEFORE UPDATE ON fee_structure_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for fee_structure_templates
ALTER TABLE fee_structure_templates ENABLE ROW LEVEL SECURITY;

-- Policies for fee_structure_templates
DROP POLICY IF EXISTS "Administrators can manage fee structure templates" ON fee_structure_templates;
CREATE POLICY "Administrators can manage fee structure templates" ON fee_structure_templates
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view fee structure templates" ON fee_structure_templates;
CREATE POLICY "All authenticated users can view fee structure templates" ON fee_structure_templates
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: admission_fee_history
CREATE TABLE IF NOT EXISTS admission_fee_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    previous_amount numeric(10,2) NULL,
    new_amount numeric(10,2) NOT NULL,
    academic_year_id uuid NOT NULL REFERENCES academic_years(id),
    change_date timestamptz DEFAULT now(),
    changed_by uuid NOT NULL REFERENCES users(id),
    reason text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for admission_fee_history
CREATE INDEX IF NOT EXISTS idx_admission_fee_history_academic_year ON admission_fee_history(academic_year_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_admission_fee_history_updated_at
    BEFORE UPDATE ON admission_fee_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for admission_fee_history
ALTER TABLE admission_fee_history ENABLE ROW LEVEL SECURITY;

-- Policies for admission_fee_history
DROP POLICY IF EXISTS "Administrators can manage admission fee history" ON admission_fee_history;
CREATE POLICY "Administrators can manage admission fee history" ON admission_fee_history
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view admission fee history" ON admission_fee_history;
CREATE POLICY "All authenticated users can view admission fee history" ON admission_fee_history
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: bus_fee_history
CREATE TABLE IF NOT EXISTS bus_fee_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    village_id uuid NOT NULL REFERENCES villages(id),
    previous_amount numeric(10,2) NULL,
    new_amount numeric(10,2) NOT NULL,
    change_date timestamptz DEFAULT now(),
    changed_by uuid NOT NULL REFERENCES users(id),
    reason text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for bus_fee_history
CREATE INDEX IF NOT EXISTS idx_bus_fee_history_village ON bus_fee_history(village_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_bus_fee_history_updated_at
    BEFORE UPDATE ON bus_fee_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for bus_fee_history
ALTER TABLE bus_fee_history ENABLE ROW LEVEL SECURITY;

-- Policies for bus_fee_history
DROP POLICY IF EXISTS "Administrators can manage bus fee history" ON bus_fee_history;
CREATE POLICY "Administrators can manage bus fee history" ON bus_fee_history
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view bus fee history" ON bus_fee_history;
CREATE POLICY "All authenticated users can view bus fee history" ON bus_fee_history
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: bus_fee_adjustments
CREATE TABLE IF NOT EXISTS bus_fee_adjustments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES students(id),
    village_id uuid NOT NULL REFERENCES villages(id),
    academic_year_id uuid NOT NULL REFERENCES academic_years(id),
    adjustment_amount numeric(10,2) NOT NULL,
    reason text NULL,
    is_active boolean NOT NULL DEFAULT TRUE,
    approved_by uuid NULL REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indexes for bus_fee_adjustments
CREATE INDEX IF NOT EXISTS idx_bus_fee_adjustments_student ON bus_fee_adjustments(student_id);
CREATE INDEX IF NOT EXISTS idx_bus_fee_adjustments_village ON bus_fee_adjustments(village_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_bus_fee_adjustments_updated_at
    BEFORE UPDATE ON bus_fee_adjustments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for bus_fee_adjustments
ALTER TABLE bus_fee_adjustments ENABLE ROW LEVEL SECURITY;

-- Policies for bus_fee_adjustments
DROP POLICY IF EXISTS "Administrators and accountants can manage bus fee adjustments" ON bus_fee_adjustments;
CREATE POLICY "Administrators and accountants can manage bus fee adjustments" ON bus_fee_adjustments
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = ANY (ARRAY['administrator'::text, 'accountant'::text]));

DROP POLICY IF EXISTS "All authenticated users can view bus fee adjustments" ON bus_fee_adjustments;
CREATE POLICY "All authenticated users can view bus fee adjustments" ON bus_fee_adjustments
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: students
CREATE TABLE IF NOT EXISTS students (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_number text UNIQUE NOT NULL,
    student_name text NOT NULL,
    gender text NOT NULL,
    date_of_birth date NOT NULL,
    class_id uuid NULL REFERENCES classes(id),
    section text NOT NULL,
    admission_date date NOT NULL,
    status student_status NULL DEFAULT 'active',
    exit_date date NULL,
    address text NOT NULL,
    phone_number text NOT NULL,
    father_name text NOT NULL,
    mother_name text NOT NULL,
    student_aadhar text UNIQUE NULL,
    father_aadhar text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    village_id uuid NULL REFERENCES villages(id),
    has_school_bus boolean NOT NULL DEFAULT FALSE,
    registration_type registration_type NOT NULL DEFAULT 'new',
    last_registration_date date NULL,
    last_registration_type registration_type NULL,
    previous_admission_number text NULL,
    rejoining_reason text NULL,
    CONSTRAINT students_aadhar_check CHECK ((student_aadhar IS NULL) OR (student_aadhar ~ '^[0-9]{12}$'::text)),
    CONSTRAINT students_phone_number_check CHECK (phone_number ~ '^[0-9]{10}$'::text)
);

-- Indexes for students
CREATE INDEX IF NOT EXISTS idx_students_admission_number ON students(admission_number);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_village_id ON students(village_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for students
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Policies for students
DROP POLICY IF EXISTS "Administrators and accountants can manage students" ON students;
CREATE POLICY "Administrators and accountants can manage students" ON students
    ON ALL
    TO public
    USING ((auth.jwt() ->> 'role'::text) = ANY (ARRAY['administrator'::text, 'accountant'::text]));

DROP POLICY IF EXISTS "All authenticated users can view students" ON students;
CREATE POLICY "All authenticated users can view students" ON students
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: fee_structure_history
CREATE TABLE IF NOT EXISTS fee_structure_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_structure_id uuid NULL REFERENCES fee_structure(id),
    previous_amount numeric(10,2) NULL,
    new_amount numeric(10,2) NOT NULL,
    change_date timestamptz DEFAULT now(),
    changed_by uuid NOT NULL REFERENCES users(id),
    reason text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for fee_structure_history
CREATE INDEX IF NOT EXISTS idx_fee_structure_history_fee_structure ON fee_structure_history(fee_structure_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_fee_structure_history_updated_at
    BEFORE UPDATE ON fee_structure_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for fee_structure_history
ALTER TABLE fee_structure_history ENABLE ROW LEVEL SECURITY;

-- Policies for fee_structure_history
DROP POLICY IF EXISTS "Administrators can manage fee structure history" ON fee_structure_history;
CREATE POLICY "Administrators can manage fee structure history" ON fee_structure_history
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view fee structure history" ON fee_structure_history;
CREATE POLICY "All authenticated users can view fee structure history" ON fee_structure_history
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: fee_structure_templates
CREATE TABLE IF NOT EXISTS fee_structure_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text NULL,
    fee_types jsonb NULL,
    created_by uuid NULL REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for fee_structure_templates
CREATE INDEX IF NOT EXISTS idx_fee_structure_templates_name ON fee_structure_templates(name);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_fee_structure_templates_updated_at
    BEFORE UPDATE ON fee_structure_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for fee_structure_templates
ALTER TABLE fee_structure_templates ENABLE ROW LEVEL SECURITY;

-- Policies for fee_structure_templates
DROP POLICY IF EXISTS "Administrators can manage fee structure templates" ON fee_structure_templates;
CREATE POLICY "Administrators can manage fee structure templates" ON fee_structure_templates
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view fee structure templates" ON fee_structure_templates;
CREATE POLICY "All authenticated users can view fee structure templates" ON fee_structure_templates
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: admission_fee_history
CREATE TABLE IF NOT EXISTS admission_fee_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    previous_amount numeric(10,2) NULL,
    new_amount numeric(10,2) NOT NULL,
    academic_year_id uuid NOT NULL REFERENCES academic_years(id),
    change_date timestamptz DEFAULT now(),
    changed_by uuid NOT NULL REFERENCES users(id),
    reason text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for admission_fee_history
CREATE INDEX IF NOT EXISTS idx_admission_fee_history_academic_year ON admission_fee_history(academic_year_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_admission_fee_history_updated_at
    BEFORE UPDATE ON admission_fee_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for admission_fee_history
ALTER TABLE admission_fee_history ENABLE ROW LEVEL SECURITY;

-- Policies for admission_fee_history
DROP POLICY IF EXISTS "Administrators can manage admission fee history" ON admission_fee_history;
CREATE POLICY "Administrators can manage admission fee history" ON admission_fee_history
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view admission fee history" ON admission_fee_history;
CREATE POLICY "All authenticated users can view admission fee history" ON admission_fee_history
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: bus_fee_history
CREATE TABLE IF NOT EXISTS bus_fee_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    village_id uuid NOT NULL REFERENCES villages(id),
    previous_amount numeric(10,2) NULL,
    new_amount numeric(10,2) NOT NULL,
    change_date timestamptz DEFAULT now(),
    changed_by uuid NOT NULL REFERENCES users(id),
    reason text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for bus_fee_history
CREATE INDEX IF NOT EXISTS idx_bus_fee_history_village ON bus_fee_history(village_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_bus_fee_history_updated_at
    BEFORE UPDATE ON bus_fee_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for bus_fee_history
ALTER TABLE bus_fee_history ENABLE ROW LEVEL SECURITY;

-- Policies for bus_fee_history
DROP POLICY IF EXISTS "Administrators can manage bus fee history" ON bus_fee_history;
CREATE POLICY "Administrators can manage bus fee history" ON bus_fee_history
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view bus fee history" ON bus_fee_history;
CREATE POLICY "All authenticated users can view bus fee history" ON bus_fee_history
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: bus_fee_adjustments
CREATE TABLE IF NOT EXISTS bus_fee_adjustments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES students(id),
    village_id uuid NOT NULL REFERENCES villages(id),
    academic_year_id uuid NOT NULL REFERENCES academic_years(id),
    adjustment_amount numeric(10,2) NOT NULL,
    reason text NULL,
    is_active boolean NOT NULL DEFAULT TRUE,
    approved_by uuid NULL REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indexes for bus_fee_adjustments
CREATE INDEX IF NOT EXISTS idx_bus_fee_adjustments_student ON bus_fee_adjustments(student_id);
CREATE INDEX IF NOT EXISTS idx_bus_fee_adjustments_village ON bus_fee_adjustments(village_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_bus_fee_adjustments_updated_at
    BEFORE UPDATE ON bus_fee_adjustments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for bus_fee_adjustments
ALTER TABLE bus_fee_adjustments ENABLE ROW LEVEL SECURITY;

-- Policies for bus_fee_adjustments
DROP POLICY IF EXISTS "Administrators and accountants can manage bus fee adjustments" ON bus_fee_adjustments;
CREATE POLICY "Administrators and accountants can manage bus fee adjustments" ON bus_fee_adjustments
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = ANY (ARRAY['administrator'::text, 'accountant'::text]));

DROP POLICY IF EXISTS "All authenticated users can view bus fee adjustments" ON bus_fee_adjustments;
CREATE POLICY "All authenticated users can view bus fee adjustments" ON bus_fee_adjustments
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: students
CREATE TABLE IF NOT EXISTS students (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_number text UNIQUE NOT NULL,
    student_name text NOT NULL,
    gender text NOT NULL,
    date_of_birth date NOT NULL,
    class_id uuid NULL REFERENCES classes(id),
    section text NOT NULL,
    admission_date date NOT NULL,
    status student_status NULL DEFAULT 'active',
    exit_date date NULL,
    address text NOT NULL,
    phone_number text NOT NULL,
    father_name text NOT NULL,
    mother_name text NOT NULL,
    student_aadhar text UNIQUE NULL,
    father_aadhar text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    village_id uuid NULL REFERENCES villages(id),
    has_school_bus boolean NOT NULL DEFAULT FALSE,
    registration_type registration_type NOT NULL DEFAULT 'new',
    last_registration_date date NULL,
    last_registration_type registration_type NULL,
    previous_admission_number text NULL,
    rejoining_reason text NULL,
    CONSTRAINT students_aadhar_check CHECK ((student_aadhar IS NULL) OR (student_aadhar ~ '^[0-9]{12}$'::text)),
    CONSTRAINT students_phone_number_check CHECK (phone_number ~ '^[0-9]{10}$'::text)
);

-- Indexes for students
CREATE INDEX IF NOT EXISTS idx_students_admission_number ON students(admission_number);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_village_id ON students(village_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for students
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Policies for students
DROP POLICY IF EXISTS "Administrators and accountants can manage students" ON students;
CREATE POLICY "Administrators and accountants can manage students" ON students
    ON ALL
    TO public
    USING ((auth.jwt() ->> 'role'::text) = ANY (ARRAY['administrator'::text, 'accountant'::text]));

DROP POLICY IF EXISTS "All authenticated users can view students" ON students;
CREATE POLICY "All authenticated users can view students" ON students
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: fee_structure_history
CREATE TABLE IF NOT EXISTS fee_structure_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_structure_id uuid NULL REFERENCES fee_structure(id),
    previous_amount numeric(10,2) NULL,
    new_amount numeric(10,2) NOT NULL,
    change_date timestamptz DEFAULT now(),
    changed_by uuid NOT NULL REFERENCES users(id),
    reason text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for fee_structure_history
CREATE INDEX IF NOT EXISTS idx_fee_structure_history_fee_structure ON fee_structure_history(fee_structure_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_fee_structure_history_updated_at
    BEFORE UPDATE ON fee_structure_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for fee_structure_history
ALTER TABLE fee_structure_history ENABLE ROW LEVEL SECURITY;

-- Policies for fee_structure_history
DROP POLICY IF EXISTS "Administrators can manage fee structure history" ON fee_structure_history;
CREATE POLICY "Administrators can manage fee structure history" ON fee_structure_history
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view fee structure history" ON fee_structure_history;
CREATE POLICY "All authenticated users can view fee structure history" ON fee_structure_history
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: fee_structure_templates
CREATE TABLE IF NOT EXISTS fee_structure_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text NULL,
    fee_types jsonb NULL,
    created_by uuid NULL REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for fee_structure_templates
CREATE INDEX IF NOT EXISTS idx_fee_structure_templates_name ON fee_structure_templates(name);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_fee_structure_templates_updated_at
    BEFORE UPDATE ON fee_structure_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for fee_structure_templates
ALTER TABLE fee_structure_templates ENABLE ROW LEVEL SECURITY;

-- Policies for fee_structure_templates
DROP POLICY IF EXISTS "Administrators can manage fee structure templates" ON fee_structure_templates;
CREATE POLICY "Administrators can manage fee structure templates" ON fee_structure_templates
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view fee structure templates" ON fee_structure_templates;
CREATE POLICY "All authenticated users can view fee structure templates" ON fee_structure_templates
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: admission_fee_history
CREATE TABLE IF NOT EXISTS admission_fee_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    previous_amount numeric(10,2) NULL,
    new_amount numeric(10,2) NOT NULL,
    academic_year_id uuid NOT NULL REFERENCES academic_years(id),
    change_date timestamptz DEFAULT now(),
    changed_by uuid NOT NULL REFERENCES users(id),
    reason text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for admission_fee_history
CREATE INDEX IF NOT EXISTS idx_admission_fee_history_academic_year ON admission_fee_history(academic_year_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_admission_fee_history_updated_at
    BEFORE UPDATE ON admission_fee_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for admission_fee_history
ALTER TABLE admission_fee_history ENABLE ROW LEVEL SECURITY;

-- Policies for admission_fee_history
DROP POLICY IF EXISTS "Administrators can manage admission fee history" ON admission_fee_history;
CREATE POLICY "Administrators can manage admission fee history" ON admission_fee_history
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view admission fee history" ON admission_fee_history;
CREATE POLICY "All authenticated users can view admission fee history" ON admission_fee_history
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: bus_fee_history
CREATE TABLE IF NOT EXISTS bus_fee_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    village_id uuid NOT NULL REFERENCES villages(id),
    previous_amount numeric(10,2) NULL,
    new_amount numeric(10,2) NOT NULL,
    change_date timestamptz DEFAULT now(),
    changed_by uuid NOT NULL REFERENCES users(id),
    reason text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for bus_fee_history
CREATE INDEX IF NOT EXISTS idx_bus_fee_history_village ON bus_fee_history(village_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_bus_fee_history_updated_at
    BEFORE UPDATE ON bus_fee_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for bus_fee_history
ALTER TABLE bus_fee_history ENABLE ROW LEVEL SECURITY;

-- Policies for bus_fee_history
DROP POLICY IF EXISTS "Administrators can manage bus fee history" ON bus_fee_history;
CREATE POLICY "Administrators can manage bus fee history" ON bus_fee_history
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view bus fee history" ON bus_fee_history;
CREATE POLICY "All authenticated users can view bus fee history" ON bus_fee_history
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: bus_fee_adjustments
CREATE TABLE IF NOT EXISTS bus_fee_adjustments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES students(id),
    village_id uuid NOT NULL REFERENCES villages(id),
    academic_year_id uuid NOT NULL REFERENCES academic_years(id),
    adjustment_amount numeric(10,2) NOT NULL,
    reason text NULL,
    is_active boolean NOT NULL DEFAULT TRUE,
    approved_by uuid NULL REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indexes for bus_fee_adjustments
CREATE INDEX IF NOT EXISTS idx_bus_fee_adjustments_student ON bus_fee_adjustments(student_id);
CREATE INDEX IF NOT EXISTS idx_bus_fee_adjustments_village ON bus_fee_adjustments(village_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_bus_fee_adjustments_updated_at
    BEFORE UPDATE ON bus_fee_adjustments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for bus_fee_adjustments
ALTER TABLE bus_fee_adjustments ENABLE ROW LEVEL SECURITY;

-- Policies for bus_fee_adjustments
DROP POLICY IF EXISTS "Administrators and accountants can manage bus fee adjustments" ON bus_fee_adjustments;
CREATE POLICY "Administrators and accountants can manage bus fee adjustments" ON bus_fee_adjustments
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = ANY (ARRAY['administrator'::text, 'accountant'::text]));

DROP POLICY IF EXISTS "All authenticated users can view bus fee adjustments" ON bus_fee_adjustments;
CREATE POLICY "All authenticated users can view bus fee adjustments" ON bus_fee_adjustments
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: students
CREATE TABLE IF NOT EXISTS students (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_number text UNIQUE NOT NULL,
    student_name text NOT NULL,
    gender text NOT NULL,
    date_of_birth date NOT NULL,
    class_id uuid NULL REFERENCES classes(id),
    section text NOT NULL,
    admission_date date NOT NULL,
    status student_status NULL DEFAULT 'active',
    exit_date date NULL,
    address text NOT NULL,
    phone_number text NOT NULL,
    father_name text NOT NULL,
    mother_name text NOT NULL,
    student_aadhar text UNIQUE NULL,
    father_aadhar text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    village_id uuid NULL REFERENCES villages(id),
    has_school_bus boolean NOT NULL DEFAULT FALSE,
    registration_type registration_type NOT NULL DEFAULT 'new',
    last_registration_date date NULL,
    last_registration_type registration_type NULL,
    previous_admission_number text NULL,
    rejoining_reason text NULL,
    CONSTRAINT students_aadhar_check CHECK ((student_aadhar IS NULL) OR (student_aadhar ~ '^[0-9]{12}$'::text)),
    CONSTRAINT students_phone_number_check CHECK (phone_number ~ '^[0-9]{10}$'::text)
);

-- Indexes for students
CREATE INDEX IF NOT EXISTS idx_students_admission_number ON students(admission_number);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_village_id ON students(village_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for students
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Policies for students
DROP POLICY IF EXISTS "Administrators and accountants can manage students" ON students;
CREATE POLICY "Administrators and accountants can manage students" ON students
    ON ALL
    TO public
    USING ((auth.jwt() ->> 'role'::text) = ANY (ARRAY['administrator'::text, 'accountant'::text]));

DROP POLICY IF EXISTS "All authenticated users can view students" ON students;
CREATE POLICY "All authenticated users can view students" ON students
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: fee_structure_history
CREATE TABLE IF NOT EXISTS fee_structure_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_structure_id uuid NULL REFERENCES fee_structure(id),
    previous_amount numeric(10,2) NULL,
    new_amount numeric(10,2) NOT NULL,
    change_date timestamptz DEFAULT now(),
    changed_by uuid NOT NULL REFERENCES users(id),
    reason text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for fee_structure_history
CREATE INDEX IF NOT EXISTS idx_fee_structure_history_fee_structure ON fee_structure_history(fee_structure_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_fee_structure_history_updated_at
    BEFORE UPDATE ON fee_structure_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for fee_structure_history
ALTER TABLE fee_structure_history ENABLE ROW LEVEL SECURITY;

-- Policies for fee_structure_history
DROP POLICY IF EXISTS "Administrators can manage fee structure history" ON fee_structure_history;
CREATE POLICY "Administrators can manage fee structure history" ON fee_structure_history
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view fee structure history" ON fee_structure_history;
CREATE POLICY "All authenticated users can view fee structure history" ON fee_structure_history
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: fee_structure_templates
CREATE TABLE IF NOT EXISTS fee_structure_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text NULL,
    fee_types jsonb NULL,
    created_by uuid NULL REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for fee_structure_templates
CREATE INDEX IF NOT EXISTS idx_fee_structure_templates_name ON fee_structure_templates(name);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_fee_structure_templates_updated_at
    BEFORE UPDATE ON fee_structure_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for fee_structure_templates
ALTER TABLE fee_structure_templates ENABLE ROW LEVEL SECURITY;

-- Policies for fee_structure_templates
DROP POLICY IF EXISTS "Administrators can manage fee structure templates" ON fee_structure_templates;
CREATE POLICY "Administrators can manage fee structure templates" ON fee_structure_templates
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view fee structure templates" ON fee_structure_templates;
CREATE POLICY "All authenticated users can view fee structure templates" ON fee_structure_templates
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: admission_fee_history
CREATE TABLE IF NOT EXISTS admission_fee_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    previous_amount numeric(10,2) NULL,
    new_amount numeric(10,2) NOT NULL,
    academic_year_id uuid NOT NULL REFERENCES academic_years(id),
    change_date timestamptz DEFAULT now(),
    changed_by uuid NOT NULL REFERENCES users(id),
    reason text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for admission_fee_history
CREATE INDEX IF NOT EXISTS idx_admission_fee_history_academic_year ON admission_fee_history(academic_year_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_admission_fee_history_updated_at
    BEFORE UPDATE ON admission_fee_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for admission_fee_history
ALTER TABLE admission_fee_history ENABLE ROW LEVEL SECURITY;

-- Policies for admission_fee_history
DROP POLICY IF EXISTS "Administrators can manage admission fee history" ON admission_fee_history;
CREATE POLICY "Administrators can manage admission fee history" ON admission_fee_history
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view admission fee history" ON admission_fee_history;
CREATE POLICY "All authenticated users can view admission fee history" ON admission_fee_history
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: bus_fee_history
CREATE TABLE IF NOT EXISTS bus_fee_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    village_id uuid NOT NULL REFERENCES villages(id),
    previous_amount numeric(10,2) NULL,
    new_amount numeric(10,2) NOT NULL,
    change_date timestamptz DEFAULT now(),
    changed_by uuid NOT NULL REFERENCES users(id),
    reason text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for bus_fee_history
CREATE INDEX IF NOT EXISTS idx_bus_fee_history_village ON bus_fee_history(village_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_bus_fee_history_updated_at
    BEFORE UPDATE ON bus_fee_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for bus_fee_history
ALTER TABLE bus_fee_history ENABLE ROW LEVEL SECURITY;

-- Policies for bus_fee_history
DROP POLICY IF EXISTS "Administrators can manage bus fee history" ON bus_fee_history;
CREATE POLICY "Administrators can manage bus fee history" ON bus_fee_history
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view bus fee history" ON bus_fee_history;
CREATE POLICY "All authenticated users can view bus fee history" ON bus_fee_history
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: bus_fee_adjustments
CREATE TABLE IF NOT EXISTS bus_fee_adjustments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES students(id),
    village_id uuid NOT NULL REFERENCES villages(id),
    academic_year_id uuid NOT NULL REFERENCES academic_years(id),
    adjustment_amount numeric(10,2) NOT NULL,
    reason text NULL,
    is_active boolean NOT NULL DEFAULT TRUE,
    approved_by uuid NULL REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indexes for bus_fee_adjustments
CREATE INDEX IF NOT EXISTS idx_bus_fee_adjustments_student ON bus_fee_adjustments(student_id);
CREATE INDEX IF NOT EXISTS idx_bus_fee_adjustments_village ON bus_fee_adjustments(village_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_bus_fee_adjustments_updated_at
    BEFORE UPDATE ON bus_fee_adjustments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for bus_fee_adjustments
ALTER TABLE bus_fee_adjustments ENABLE ROW LEVEL SECURITY;

-- Policies for bus_fee_adjustments
DROP POLICY IF EXISTS "Administrators and accountants can manage bus fee adjustments" ON bus_fee_adjustments;
CREATE POLICY "Administrators and accountants can manage bus fee adjustments" ON bus_fee_adjustments
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view bus fee adjustments" ON bus_fee_adjustments;
CREATE POLICY "All authenticated users can view bus fee adjustments" ON bus_fee_adjustments
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: students
CREATE TABLE IF NOT EXISTS students (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_number text UNIQUE NOT NULL,
    student_name text NOT NULL,
    gender text NOT NULL,
    date_of_birth date NOT NULL,
    class_id uuid NULL REFERENCES classes(id),
    section text NOT NULL,
    admission_date date NOT NULL,
    status student_status NULL DEFAULT 'active',
    exit_date date NULL,
    address text NOT NULL,
    phone_number text NOT NULL,
    father_name text NOT NULL,
    mother_name text NOT NULL,
    student_aadhar text UNIQUE NULL,
    father_aadhar text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    village_id uuid NULL REFERENCES villages(id),
    has_school_bus boolean NOT NULL DEFAULT FALSE,
    registration_type registration_type NOT NULL DEFAULT 'new',
    last_registration_date date NULL,
    last_registration_type registration_type NULL,
    previous_admission_number text NULL,
    rejoining_reason text NULL,
    CONSTRAINT students_aadhar_check CHECK ((student_aadhar IS NULL) OR (student_aadhar ~ '^[0-9]{12}$'::text)),
    CONSTRAINT students_phone_number_check CHECK (phone_number ~ '^[0-9]{10}$'::text)
);

-- Indexes for students
CREATE INDEX IF NOT EXISTS idx_students_admission_number ON students(admission_number);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_village_id ON students(village_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for students
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Policies for students
DROP POLICY IF EXISTS "Administrators and accountants can manage students" ON students;
CREATE POLICY "Administrators and accountants can manage students" ON students
    ON ALL
    TO public
    USING ((auth.jwt() ->> 'role'::text) = ANY (ARRAY['administrator'::text, 'accountant'::text]));

DROP POLICY IF EXISTS "All authenticated users can view students" ON students;
CREATE POLICY "All authenticated users can view students" ON students
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: fee_structure_history
CREATE TABLE IF NOT EXISTS fee_structure_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_structure_id uuid NULL REFERENCES fee_structure(id),
    previous_amount numeric(10,2) NULL,
    new_amount numeric(10,2) NOT NULL,
    change_date timestamptz DEFAULT now(),
    changed_by uuid NOT NULL REFERENCES users(id),
    reason text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for fee_structure_history
CREATE INDEX IF NOT EXISTS idx_fee_structure_history_fee_structure ON fee_structure_history(fee_structure_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_fee_structure_history_updated_at
    BEFORE UPDATE ON fee_structure_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for fee_structure_history
ALTER TABLE fee_structure_history ENABLE ROW LEVEL SECURITY;

-- Policies for fee_structure_history
DROP POLICY IF EXISTS "Administrators can manage fee structure history" ON fee_structure_history;
CREATE POLICY "Administrators can manage fee structure history" ON fee_structure_history
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view fee structure history" ON fee_structure_history;
CREATE POLICY "All authenticated users can view fee structure history" ON fee_structure_history
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: fee_structure_templates
CREATE TABLE IF NOT EXISTS fee_structure_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text NULL,
    fee_types jsonb NULL,
    created_by uuid NULL REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for fee_structure_templates
CREATE INDEX IF NOT EXISTS idx_fee_structure_templates_name ON fee_structure_templates(name);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_fee_structure_templates_updated_at
    BEFORE UPDATE ON fee_structure_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for fee_structure_templates
ALTER TABLE fee_structure_templates ENABLE ROW LEVEL SECURITY;

-- Policies for fee_structure_templates
DROP POLICY IF EXISTS "Administrators can manage fee structure templates" ON fee_structure_templates;
CREATE POLICY "Administrators can manage fee structure templates" ON fee_structure_templates
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view fee structure templates" ON fee_structure_templates;
CREATE POLICY "All authenticated users can view fee structure templates" ON fee_structure_templates
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: admission_fee_history
CREATE TABLE IF NOT EXISTS admission_fee_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    previous_amount numeric(10,2) NULL,
    new_amount numeric(10,2) NOT NULL,
    academic_year_id uuid NOT NULL REFERENCES academic_years(id),
    change_date timestamptz DEFAULT now(),
    changed_by uuid NOT NULL REFERENCES users(id),
    reason text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for admission_fee_history
CREATE INDEX IF NOT EXISTS idx_admission_fee_history_academic_year ON admission_fee_history(academic_year_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_admission_fee_history_updated_at
    BEFORE UPDATE ON admission_fee_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for admission_fee_history
ALTER TABLE admission_fee_history ENABLE ROW LEVEL SECURITY;

-- Policies for admission_fee_history
DROP POLICY IF EXISTS "Administrators can manage admission fee history" ON admission_fee_history;
CREATE POLICY "Administrators can manage admission fee history" ON admission_fee_history
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view admission fee history" ON admission_fee_history;
CREATE POLICY "All authenticated users can view admission fee history" ON admission_fee_history
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: bus_fee_history
CREATE TABLE IF NOT EXISTS bus_fee_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    village_id uuid NOT NULL REFERENCES villages(id),
    previous_amount numeric(10,2) NULL,
    new_amount numeric(10,2) NOT NULL,
    change_date timestamptz DEFAULT now(),
    changed_by uuid NOT NULL REFERENCES users(id),
    reason text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for bus_fee_history
CREATE INDEX IF NOT EXISTS idx_bus_fee_history_village ON bus_fee_history(village_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_bus_fee_history_updated_at
    BEFORE UPDATE ON bus_fee_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for bus_fee_history
ALTER TABLE bus_fee_history ENABLE ROW LEVEL SECURITY;

-- Policies for bus_fee_history
DROP POLICY IF EXISTS "Administrators can manage bus fee history" ON bus_fee_history;
CREATE POLICY "Administrators can manage bus fee history" ON bus_fee_history
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view bus fee history" ON bus_fee_history;
CREATE POLICY "All authenticated users can view bus fee history" ON bus_fee_history
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: bus_fee_adjustments
CREATE TABLE IF NOT EXISTS bus_fee_adjustments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES students(id),
    village_id uuid NOT NULL REFERENCES villages(id),
    academic_year_id uuid NOT NULL REFERENCES academic_years(id),
    adjustment_amount numeric(10,2) NOT NULL,
    reason text NULL,
    is_active boolean NOT NULL DEFAULT TRUE,
    approved_by uuid NULL REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indexes for bus_fee_adjustments
CREATE INDEX IF NOT EXISTS idx_bus_fee_adjustments_student ON bus_fee_adjustments(student_id);
CREATE INDEX IF NOT EXISTS idx_bus_fee_adjustments_village ON bus_fee_adjustments(village_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_bus_fee_adjustments_updated_at
    BEFORE UPDATE ON bus_fee_adjustments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for bus_fee_adjustments
ALTER TABLE bus_fee_adjustments ENABLE ROW LEVEL SECURITY;

-- Policies for bus_fee_adjustments
DROP POLICY IF EXISTS "Administrators and accountants can manage bus fee adjustments" ON bus_fee_adjustments;
CREATE POLICY "Administrators and accountants can manage bus fee adjustments" ON bus_fee_adjustments
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = ANY (ARRAY['administrator'::text, 'accountant'::text]));

DROP POLICY IF EXISTS "All authenticated users can view bus fee adjustments" ON bus_fee_adjustments;
CREATE POLICY "All authenticated users can view bus fee adjustments" ON bus_fee_adjustments
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: students
CREATE TABLE IF NOT EXISTS students (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_number text UNIQUE NOT NULL,
    student_name text NOT NULL,
    gender text NOT NULL,
    date_of_birth date NOT NULL,
    class_id uuid NULL REFERENCES classes(id),
    section text NOT NULL,
    admission_date date NOT NULL,
    status student_status NULL DEFAULT 'active',
    exit_date date NULL,
    address text NOT NULL,
    phone_number text NOT NULL,
    father_name text NOT NULL,
    mother_name text NOT NULL,
    student_aadhar text UNIQUE NULL,
    father_aadhar text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    village_id uuid NULL REFERENCES villages(id),
    has_school_bus boolean NOT NULL DEFAULT FALSE,
    registration_type registration_type NOT NULL DEFAULT 'new',
    last_registration_date date NULL,
    last_registration_type registration_type NULL,
    previous_admission_number text NULL,
    rejoining_reason text NULL,
    CONSTRAINT students_aadhar_check CHECK ((student_aadhar IS NULL) OR (student_aadhar ~ '^[0-9]{12}$'::text)),
    CONSTRAINT students_phone_number_check CHECK (phone_number ~ '^[0-9]{10}$'::text)
);

-- Indexes for students
CREATE INDEX IF NOT EXISTS idx_students_admission_number ON students(admission_number);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_village_id ON students(village_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for students
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Policies for students
DROP POLICY IF EXISTS "Administrators and accountants can manage students" ON students;
CREATE POLICY "Administrators and accountants can manage students" ON students
    ON ALL
    TO public
    USING ((auth.jwt() ->> 'role'::text) = ANY (ARRAY['administrator'::text, 'accountant'::text]));

DROP POLICY IF EXISTS "All authenticated users can view students" ON students;
CREATE POLICY "All authenticated users can view students" ON students
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: fee_structure_history
CREATE TABLE IF NOT EXISTS fee_structure_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_structure_id uuid NULL REFERENCES fee_structure(id),
    previous_amount numeric(10,2) NULL,
    new_amount numeric(10,2) NOT NULL,
    change_date timestamptz DEFAULT now(),
    changed_by uuid NOT NULL REFERENCES users(id),
    reason text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for fee_structure_history
CREATE INDEX IF NOT EXISTS idx_fee_structure_history_fee_structure ON fee_structure_history(fee_structure_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_fee_structure_history_updated_at
    BEFORE UPDATE ON fee_structure_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for fee_structure_history
ALTER TABLE fee_structure_history ENABLE ROW LEVEL SECURITY;

-- Policies for fee_structure_history
DROP POLICY IF EXISTS "Administrators can manage fee structure history" ON fee_structure_history;
CREATE POLICY "Administrators can manage fee structure history" ON fee_structure_history
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view fee structure history" ON fee_structure_history;
CREATE POLICY "All authenticated users can view fee structure history" ON fee_structure_history
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: fee_structure_templates
CREATE TABLE IF NOT EXISTS fee_structure_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text NULL,
    fee_types jsonb NULL,
    created_by uuid NULL REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for fee_structure_templates
CREATE INDEX IF NOT EXISTS idx_fee_structure_templates_name ON fee_structure_templates(name);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_fee_structure_templates_updated_at
    BEFORE UPDATE ON fee_structure_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for fee_structure_templates
ALTER TABLE fee_structure_templates ENABLE ROW LEVEL SECURITY;

-- Policies for fee_structure_templates
DROP POLICY IF EXISTS "Administrators can manage fee structure templates" ON fee_structure_templates;
CREATE POLICY "Administrators can manage fee structure templates" ON fee_structure_templates
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view fee structure templates" ON fee_structure_templates;
CREATE POLICY "All authenticated users can view fee structure templates" ON fee_structure_templates
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: admission_fee_history
CREATE TABLE IF NOT EXISTS admission_fee_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    previous_amount numeric(10,2) NULL,
    new_amount numeric(10,2) NOT NULL,
    academic_year_id uuid NOT NULL REFERENCES academic_years(id),
    change_date timestamptz DEFAULT now(),
    changed_by uuid NOT NULL REFERENCES users(id),
    reason text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for admission_fee_history
CREATE INDEX IF NOT EXISTS idx_admission_fee_history_academic_year ON admission_fee_history(academic_year_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_admission_fee_history_updated_at
    BEFORE UPDATE ON admission_fee_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for admission_fee_history
ALTER TABLE admission_fee_history ENABLE ROW LEVEL SECURITY;

-- Policies for admission_fee_history
DROP POLICY IF EXISTS "Administrators can manage admission fee history" ON admission_fee_history;
CREATE POLICY "Administrators can manage admission fee history" ON admission_fee_history
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view admission fee history" ON admission_fee_history;
CREATE POLICY "All authenticated users can view admission fee history" ON admission_fee_history
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: bus_fee_history
CREATE TABLE IF NOT EXISTS bus_fee_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    village_id uuid NOT NULL REFERENCES villages(id),
    previous_amount numeric(10,2) NULL,
    new_amount numeric(10,2) NOT NULL,
    change_date timestamptz DEFAULT now(),
    changed_by uuid NOT NULL REFERENCES users(id),
    reason text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for bus_fee_history
CREATE INDEX IF NOT EXISTS idx_bus_fee_history_village ON bus_fee_history(village_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_bus_fee_history_updated_at
    BEFORE UPDATE ON bus_fee_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for bus_fee_history
ALTER TABLE bus_fee_history ENABLE ROW LEVEL SECURITY;

-- Policies for bus_fee_history
DROP POLICY IF EXISTS "Administrators can manage bus fee history" ON bus_fee_history;
CREATE POLICY "Administrators can manage bus fee history" ON bus_fee_history
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view bus fee history" ON bus_fee_history;
CREATE POLICY "All authenticated users can view bus fee history" ON bus_fee_history
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: bus_fee_adjustments
CREATE TABLE IF NOT EXISTS bus_fee_adjustments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES students(id),
    village_id uuid NOT NULL REFERENCES villages(id),
    academic_year_id uuid NOT NULL REFERENCES academic_years(id),
    adjustment_amount numeric(10,2) NOT NULL,
    reason text NULL,
    is_active boolean NOT NULL DEFAULT TRUE,
    approved_by uuid NULL REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indexes for bus_fee_adjustments
CREATE INDEX IF NOT EXISTS idx_bus_fee_adjustments_student ON bus_fee_adjustments(student_id);
CREATE INDEX IF NOT EXISTS idx_bus_fee_adjustments_village ON bus_fee_adjustments(village_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_bus_fee_adjustments_updated_at
    BEFORE UPDATE ON bus_fee_adjustments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for bus_fee_adjustments
ALTER TABLE bus_fee_adjustments ENABLE ROW LEVEL SECURITY;

-- Policies for bus_fee_adjustments
DROP POLICY IF EXISTS "Administrators and accountants can manage bus fee adjustments" ON bus_fee_adjustments;
CREATE POLICY "Administrators and accountants can manage bus fee adjustments" ON bus_fee_adjustments
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = ANY (ARRAY['administrator'::text, 'accountant'::text]));

DROP POLICY IF EXISTS "All authenticated users can view bus fee adjustments" ON bus_fee_adjustments;
CREATE POLICY "All authenticated users can view bus fee adjustments" ON bus_fee_adjustments
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: students
CREATE TABLE IF NOT EXISTS students (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_number text UNIQUE NOT NULL,
    student_name text NOT NULL,
    gender text NOT NULL,
    date_of_birth date NOT NULL,
    class_id uuid NULL REFERENCES classes(id),
    section text NOT NULL,
    admission_date date NOT NULL,
    status student_status NULL DEFAULT 'active',
    exit_date date NULL,
    address text NOT NULL,
    phone_number text NOT NULL,
    father_name text NOT NULL,
    mother_name text NOT NULL,
    student_aadhar text UNIQUE NULL,
    father_aadhar text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    village_id uuid NULL REFERENCES villages(id),
    has_school_bus boolean NOT NULL DEFAULT FALSE,
    registration_type registration_type NOT NULL DEFAULT 'new',
    last_registration_date date NULL,
    last_registration_type registration_type NULL,
    previous_admission_number text NULL,
    rejoining_reason text NULL,
    CONSTRAINT students_aadhar_check CHECK ((student_aadhar IS NULL) OR (student_aadhar ~ '^[0-9]{12}$'::text)),
    CONSTRAINT students_phone_number_check CHECK (phone_number ~ '^[0-9]{10}$'::text)
);

-- Indexes for students
CREATE INDEX IF NOT EXISTS idx_students_admission_number ON students(admission_number);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_village_id ON students(village_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for students
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Policies for students
DROP POLICY IF EXISTS "Administrators and accountants can manage students" ON students;
CREATE POLICY "Administrators and accountants can manage students" ON students
    ON ALL
    TO public
    USING ((auth.jwt() ->> 'role'::text) = ANY (ARRAY['administrator'::text, 'accountant'::text]));

DROP POLICY IF EXISTS "All authenticated users can view students" ON students;
CREATE POLICY "All authenticated users can view students" ON students
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: fee_structure_history
CREATE TABLE IF NOT EXISTS fee_structure_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_structure_id uuid NULL REFERENCES fee_structure(id),
    previous_amount numeric(10,2) NULL,
    new_amount numeric(10,2) NOT NULL,
    change_date timestamptz DEFAULT now(),
    changed_by uuid NOT NULL REFERENCES users(id),
    reason text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for fee_structure_history
CREATE INDEX IF NOT EXISTS idx_fee_structure_history_fee_structure ON fee_structure_history(fee_structure_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_fee_structure_history_updated_at
    BEFORE UPDATE ON fee_structure_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for fee_structure_history
ALTER TABLE fee_structure_history ENABLE ROW LEVEL SECURITY;

-- Policies for fee_structure_history
DROP POLICY IF EXISTS "Administrators can manage fee structure history" ON fee_structure_history;
CREATE POLICY "Administrators can manage fee structure history" ON fee_structure_history
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view fee structure history" ON fee_structure_history;
CREATE POLICY "All authenticated users can view fee structure history" ON fee_structure_history
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: fee_structure_templates
CREATE TABLE IF NOT EXISTS fee_structure_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text NULL,
    fee_types jsonb NULL,
    created_by uuid NULL REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for fee_structure_templates
CREATE INDEX IF NOT EXISTS idx_fee_structure_templates_name ON fee_structure_templates(name);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_fee_structure_templates_updated_at
    BEFORE UPDATE ON fee_structure_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for fee_structure_templates
ALTER TABLE fee_structure_templates ENABLE ROW LEVEL SECURITY;

-- Policies for fee_structure_templates
DROP POLICY IF EXISTS "Administrators can manage fee structure templates" ON fee_structure_templates;
CREATE POLICY "Administrators can manage fee structure templates" ON fee_structure_templates
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view fee structure templates" ON fee_structure_templates;
CREATE POLICY "All authenticated users can view fee structure templates" ON fee_structure_templates
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: admission_fee_history
CREATE TABLE IF NOT EXISTS admission_fee_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    previous_amount numeric(10,2) NULL,
    new_amount numeric(10,2) NOT NULL,
    academic_year_id uuid NOT NULL REFERENCES academic_years(id),
    change_date timestamptz DEFAULT now(),
    changed_by uuid NOT NULL REFERENCES users(id),
    reason text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for admission_fee_history
CREATE INDEX IF NOT EXISTS idx_admission_fee_history_academic_year ON admission_fee_history(academic_year_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_admission_fee_history_updated_at
    BEFORE UPDATE ON admission_fee_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for admission_fee_history
ALTER TABLE admission_fee_history ENABLE ROW LEVEL SECURITY;

-- Policies for admission_fee_history
DROP POLICY IF EXISTS "Administrators can manage admission fee history" ON admission_fee_history;
CREATE POLICY "Administrators can manage admission fee history" ON admission_fee_history
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view admission fee history" ON admission_fee_history;
CREATE POLICY "All authenticated users can view admission fee history" ON admission_fee_history
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: bus_fee_history
CREATE TABLE IF NOT EXISTS bus_fee_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    village_id uuid NOT NULL REFERENCES villages(id),
    previous_amount numeric(10,2) NULL,
    new_amount numeric(10,2) NOT NULL,
    change_date timestamptz DEFAULT now(),
    changed_by uuid NOT NULL REFERENCES users(id),
    reason text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for bus_fee_history
CREATE INDEX IF NOT EXISTS idx_bus_fee_history_village ON bus_fee_history(village_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_bus_fee_history_updated_at
    BEFORE UPDATE ON bus_fee_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for bus_fee_history
ALTER TABLE bus_fee_history ENABLE ROW LEVEL SECURITY;

-- Policies for bus_fee_history
DROP POLICY IF EXISTS "Administrators can manage bus fee history" ON bus_fee_history;
CREATE POLICY "Administrators can manage bus fee history" ON bus_fee_history
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view bus fee history" ON bus_fee_history;
CREATE POLICY "All authenticated users can view bus fee history" ON bus_fee_history
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: bus_fee_adjustments
CREATE TABLE IF NOT EXISTS bus_fee_adjustments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES students(id),
    village_id uuid NOT NULL REFERENCES villages(id),
    academic_year_id uuid NOT NULL REFERENCES academic_years(id),
    adjustment_amount numeric(10,2) NOT NULL,
    reason text NULL,
    is_active boolean NOT NULL DEFAULT TRUE,
    approved_by uuid NULL REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indexes for bus_fee_adjustments
CREATE INDEX IF NOT EXISTS idx_bus_fee_adjustments_student ON bus_fee_adjustments(student_id);
CREATE INDEX IF NOT EXISTS idx_bus_fee_adjustments_village ON bus_fee_adjustments(village_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_bus_fee_adjustments_updated_at
    BEFORE UPDATE ON bus_fee_adjustments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for bus_fee_adjustments
ALTER TABLE bus_fee_adjustments ENABLE ROW LEVEL SECURITY;

-- Policies for bus_fee_adjustments
DROP POLICY IF EXISTS "Administrators and accountants can manage bus fee adjustments" ON bus_fee_adjustments;
CREATE POLICY "Administrators and accountants can manage bus fee adjustments" ON bus_fee_adjustments
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = ANY (ARRAY['administrator'::text, 'accountant'::text]));

DROP POLICY IF EXISTS "All authenticated users can view bus fee adjustments" ON bus_fee_adjustments;
CREATE POLICY "All authenticated users can view bus fee adjustments" ON bus_fee_adjustments
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: students
CREATE TABLE IF NOT EXISTS students (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_number text UNIQUE NOT NULL,
    student_name text NOT NULL,
    gender text NOT NULL,
    date_of_birth date NOT NULL,
    class_id uuid NULL REFERENCES classes(id),
    section text NOT NULL,
    admission_date date NOT NULL,
    status student_status NULL DEFAULT 'active',
    exit_date date NULL,
    address text NOT NULL,
    phone_number text NOT NULL,
    father_name text NOT NULL,
    mother_name text NOT NULL,
    student_aadhar text UNIQUE NULL,
    father_aadhar text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    village_id uuid NULL REFERENCES villages(id),
    has_school_bus boolean NOT NULL DEFAULT FALSE,
    registration_type registration_type NOT NULL DEFAULT 'new',
    last_registration_date date NULL,
    last_registration_type registration_type NULL,
    previous_admission_number text NULL,
    rejoining_reason text NULL,
    CONSTRAINT students_aadhar_check CHECK ((student_aadhar IS NULL) OR (student_aadhar ~ '^[0-9]{12}$'::text)),
    CONSTRAINT students_phone_number_check CHECK (phone_number ~ '^[0-9]{10}$'::text)
);

-- Indexes for students
CREATE INDEX IF NOT EXISTS idx_students_admission_number ON students(admission_number);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_village_id ON students(village_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for students
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Policies for students
DROP POLICY IF EXISTS "Administrators and accountants can manage students" ON students;
CREATE POLICY "Administrators and accountants can manage students" ON students
    ON ALL
    TO public
    USING ((auth.jwt() ->> 'role'::text) = ANY (ARRAY['administrator'::text, 'accountant'::text]));

DROP POLICY IF EXISTS "All authenticated users can view students" ON students;
CREATE POLICY "All authenticated users can view students" ON students
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: fee_structure_history
CREATE TABLE IF NOT EXISTS fee_structure_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_structure_id uuid NULL REFERENCES fee_structure(id),
    previous_amount numeric(10,2) NULL,
    new_amount numeric(10,2) NOT NULL,
    change_date timestamptz DEFAULT now(),
    changed_by uuid NOT NULL REFERENCES users(id),
    reason text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for fee_structure_history
CREATE INDEX IF NOT EXISTS idx_fee_structure_history_fee_structure ON fee_structure_history(fee_structure_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_fee_structure_history_updated_at
    BEFORE UPDATE ON fee_structure_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for fee_structure_history
ALTER TABLE fee_structure_history ENABLE ROW LEVEL SECURITY;

-- Policies for fee_structure_history
DROP POLICY IF EXISTS "Administrators can manage fee structure history" ON fee_structure_history;
CREATE POLICY "Administrators can manage fee structure history" ON fee_structure_history
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view fee structure history" ON fee_structure_history;
CREATE POLICY "All authenticated users can view fee structure history" ON fee_structure_history
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: fee_structure_templates
CREATE TABLE IF NOT EXISTS fee_structure_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text NULL,
    fee_types jsonb NULL,
    created_by uuid NULL REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for fee_structure_templates
CREATE INDEX IF NOT EXISTS idx_fee_structure_templates_name ON fee_structure_templates(name);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_fee_structure_templates_updated_at
    BEFORE UPDATE ON fee_structure_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for fee_structure_templates
ALTER TABLE fee_structure_templates ENABLE ROW LEVEL SECURITY;

-- Policies for fee_structure_templates
DROP POLICY IF EXISTS "Administrators can manage fee structure templates" ON fee_structure_templates;
CREATE POLICY "Administrators can manage fee structure templates" ON fee_structure_templates
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view fee structure templates" ON fee_structure_templates;
CREATE POLICY "All authenticated users can view fee structure templates" ON fee_structure_templates
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: admission_fee_history
CREATE TABLE IF NOT EXISTS admission_fee_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    previous_amount numeric(10,2) NULL,
    new_amount numeric(10,2) NOT NULL,
    academic_year_id uuid NOT NULL REFERENCES academic_years(id),
    change_date timestamptz DEFAULT now(),
    changed_by uuid NOT NULL REFERENCES users(id),
    reason text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for admission_fee_history
CREATE INDEX IF NOT EXISTS idx_admission_fee_history_academic_year ON admission_fee_history(academic_year_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_admission_fee_history_updated_at
    BEFORE UPDATE ON admission_fee_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for admission_fee_history
ALTER TABLE admission_fee_history ENABLE ROW LEVEL SECURITY;

-- Policies for admission_fee_history
DROP POLICY IF EXISTS "Administrators can manage admission fee history" ON admission_fee_history;
CREATE POLICY "Administrators can manage admission fee history" ON admission_fee_history
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view admission fee history" ON admission_fee_history;
CREATE POLICY "All authenticated users can view admission fee history" ON admission_fee_history
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: bus_fee_history
CREATE TABLE IF NOT EXISTS bus_fee_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    village_id uuid NOT NULL REFERENCES villages(id),
    previous_amount numeric(10,2) NULL,
    new_amount numeric(10,2) NOT NULL,
    change_date timestamptz DEFAULT now(),
    changed_by uuid NOT NULL REFERENCES users(id),
    reason text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for bus_fee_history
CREATE INDEX IF NOT EXISTS idx_bus_fee_history_village ON bus_fee_history(village_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_bus_fee_history_updated_at
    BEFORE UPDATE ON bus_fee_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for bus_fee_history
ALTER TABLE bus_fee_history ENABLE ROW LEVEL SECURITY;

-- Policies for bus_fee_history
DROP POLICY IF EXISTS "Administrators can manage bus fee history" ON bus_fee_history;
CREATE POLICY "Administrators can manage bus fee history" ON bus_fee_history
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view bus fee history" ON bus_fee_history;
CREATE POLICY "All authenticated users can view bus fee history" ON bus_fee_history
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: bus_fee_adjustments
CREATE TABLE IF NOT EXISTS bus_fee_adjustments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES students(id),
    village_id uuid NOT NULL REFERENCES villages(id),
    academic_year_id uuid NOT NULL REFERENCES academic_years(id),
    adjustment_amount numeric(10,2) NOT NULL,
    reason text NULL,
    is_active boolean NOT NULL DEFAULT TRUE,
    approved_by uuid NULL REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indexes for bus_fee_adjustments
CREATE INDEX IF NOT EXISTS idx_bus_fee_adjustments_student ON bus_fee_adjustments(student_id);
CREATE INDEX IF NOT EXISTS idx_bus_fee_adjustments_village ON bus_fee_adjustments(village_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_bus_fee_adjustments_updated_at
    BEFORE UPDATE ON bus_fee_adjustments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for bus_fee_adjustments
ALTER TABLE bus_fee_adjustments ENABLE ROW LEVEL SECURITY;

-- Policies for bus_fee_adjustments
DROP POLICY IF EXISTS "Administrators and accountants can manage bus fee adjustments" ON bus_fee_adjustments;
CREATE POLICY "Administrators can manage bus fee adjustments" ON bus_fee_adjustments
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = ANY (ARRAY['administrator'::text, 'accountant'::text]));

DROP POLICY IF EXISTS "All authenticated users can view bus fee adjustments" ON bus_fee_adjustments;
CREATE POLICY "All authenticated users can view bus fee adjustments" ON bus_fee_adjustments
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: students
CREATE TABLE IF NOT EXISTS students (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_number text UNIQUE NOT NULL,
    student_name text NOT NULL,
    gender text NOT NULL,
    date_of_birth date NOT NULL,
    class_id uuid NULL REFERENCES classes(id),
    section text NOT NULL,
    admission_date date NOT NULL,
    status student_status NULL DEFAULT 'active',
    exit_date date NULL,
    address text NOT NULL,
    phone_number text NOT NULL,
    father_name text NOT NULL,
    mother_name text NOT NULL,
    student_aadhar text UNIQUE NULL,
    father_aadhar text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    village_id uuid NULL REFERENCES villages(id),
    has_school_bus boolean NOT NULL DEFAULT FALSE,
    registration_type registration_type NOT NULL DEFAULT 'new',
    last_registration_date date NULL,
    last_registration_type registration_type NULL,
    previous_admission_number text NULL,
    rejoining_reason text NULL,
    CONSTRAINT students_aadhar_check CHECK ((student_aadhar IS NULL) OR (student_aadhar ~ '^[0-9]{12}$'::text)),
    CONSTRAINT students_phone_number_check CHECK (phone_number ~ '^[0-9]{10}$'::text)
);

-- Indexes for students
CREATE INDEX IF NOT EXISTS idx_students_admission_number ON students(admission_number);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_village_id ON students(village_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for students
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Policies for students
DROP POLICY IF EXISTS "Administrators and accountants can manage students" ON students;
CREATE POLICY "Administrators and accountants can manage students" ON students
    ON ALL
    TO public
    USING ((auth.jwt() ->> 'role'::text) = ANY (ARRAY['administrator'::text, 'accountant'::text]));

DROP POLICY IF EXISTS "All authenticated users can view students" ON students
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: fee_structure_history
CREATE TABLE IF NOT EXISTS fee_structure_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_structure_id uuid NULL REFERENCES fee_structure(id),
    previous_amount numeric(10,2) NULL,
    new_amount numeric(10,2) NOT NULL,
    change_date timestamptz DEFAULT now(),
    changed_by uuid NOT NULL REFERENCES users(id),
    reason text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for fee_structure_history
CREATE INDEX IF NOT EXISTS idx_fee_structure_history_fee_structure ON fee_structure_history(fee_structure_id);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_fee_structure_history_updated_at
    BEFORE UPDATE ON fee_structure_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for fee_structure_history
ALTER TABLE fee_structure_history ENABLE ROW LEVEL SECURITY;

-- Policies for fee_structure_history
DROP POLICY IF EXISTS "Administrators can manage fee structure history" ON fee_structure_history;
CREATE POLICY "Administrators can manage fee structure history" ON fee_structure_history
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view fee structure history" ON fee_structure_history;
CREATE POLICY "All authenticated users can view fee structure history" ON fee_structure_history
    ON SELECT
    TO authenticated
    USING (TRUE);

-- Table: fee_structure_templates
CREATE TABLE IF NOT EXISTS fee_structure_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text NULL,
    fee_types jsonb NULL,
    created_by uuid NULL REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for fee_structure_templates
CREATE INDEX IF NOT EXISTS idx_fee_structure_templates_name ON fee_structure_templates(name);

-- Trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_fee_structure_templates_updated_at
    BEFORE UPDATE ON fee_structure_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for fee_structure_templates
ALTER TABLE fee_structure_templates ENABLE ROW LEVEL SECURITY;

-- Policies for fee_structure_templates
DROP POLICY IF EXISTS "Administrators can manage fee structure templates" ON fee_structure_templates;
CREATE POLICY "Administrators can manage fee structure templates" ON fee_structure_templates
    ON ALL
    TO authenticated
    USING ((auth.jwt() ->> 'role'::text) = 'administrator'::text);

DROP POLICY IF EXISTS "All authenticated users can view fee structure templates" ON fee_structure_templates;

