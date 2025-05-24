/*
  # Student Management Module

  This consolidated migration establishes the student management schema including:
  
  1. Core Tables
    - students: Student information and details
    - student_academic_history: Tracks student's academic journey
    - student_promotion_history: Detailed history of student promotions
    - student_registration_history: Tracks student registration history
  
  2. Relationships
    - Links to classes, villages, and academic years
    - Tracking of student status changes and promotions
  
  3. Security
    - RLS policies for all student-related tables
    - Access control based on user roles

  Consolidated from:
  - 20250517153653_icy_cell.sql (students table)
  - 20250522114320_teal_base.sql (student_academic_history)
  - 20250522134541_rustic_recipe.sql (student_promotion_history)
  - 20250522140320_icy_salad.sql (student modifications)
  - 20250522163350_fancy_shore.sql (student_registration_history)
*/

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
  village_id uuid REFERENCES villages(id),
  has_school_bus boolean DEFAULT false,
  registration_type registration_type DEFAULT 'new',
  last_registration_date date,
  last_registration_type registration_type,
  previous_admission_number text,
  rejoining_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT students_phone_number_check CHECK (phone_number ~ '^[0-9]{10}$'),
  CONSTRAINT students_aadhar_check CHECK (
    student_aadhar IS NULL OR student_aadhar ~ '^[0-9]{12}$'
  )
);

-- Create student_academic_history table
CREATE TABLE IF NOT EXISTS student_academic_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id),
  academic_year_id uuid NOT NULL REFERENCES academic_years(id),
  class_id uuid NOT NULL REFERENCES classes(id),
  section text NOT NULL,
  promotion_status promotion_status,
  is_active_in_year boolean DEFAULT true,
  registration_date_for_year date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create student_promotion_history table
CREATE TABLE IF NOT EXISTS student_promotion_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id),
  academic_year_id uuid NOT NULL REFERENCES academic_years(id),
  from_class_id uuid NOT NULL REFERENCES classes(id),
  to_class_id uuid NOT NULL REFERENCES classes(id),
  promotion_status promotion_status NOT NULL,
  promotion_date date NOT NULL,
  remarks text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create student_registration_history table
CREATE TABLE IF NOT EXISTS student_registration_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id),
  academic_year_id uuid NOT NULL REFERENCES academic_years(id),
  registration_type registration_type NOT NULL,
  registration_date date NOT NULL,
  previous_status student_status,
  new_status student_status NOT NULL,
  reason text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_students_admission_number ON students(admission_number);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_village_id ON students(village_id);
CREATE INDEX IF NOT EXISTS idx_student_academic_history_student ON student_academic_history(student_id);
CREATE INDEX IF NOT EXISTS idx_student_academic_history_academic_year ON student_academic_history(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_student_promotion_history_student ON student_promotion_history(student_id);
CREATE INDEX IF NOT EXISTS idx_student_promotion_history_academic_year ON student_promotion_history(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_student_registration_history_student ON student_registration_history(student_id);
CREATE INDEX IF NOT EXISTS idx_student_registration_history_academic_year ON student_registration_history(academic_year_id);

-- Enable Row Level Security
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_academic_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_promotion_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_registration_history ENABLE ROW LEVEL SECURITY;

-- Create policies for students table
DROP POLICY IF EXISTS "All authenticated users can view students" ON students;
CREATE POLICY "All authenticated users can view students"
  ON students
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Administrators and accountants can manage students" ON students;
CREATE POLICY "Administrators and accountants can manage students"
  ON students
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('administrator', 'accountant'));

-- Create policies for student_academic_history table
DROP POLICY IF EXISTS "All authenticated users can view student academic history" ON student_academic_history;
CREATE POLICY "All authenticated users can view student academic history"
  ON student_academic_history
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Administrators and accountants can manage student academic history" ON student_academic_history;
CREATE POLICY "Administrators and accountants can manage student academic history"
  ON student_academic_history
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('administrator', 'accountant'));

-- Create policies for student_promotion_history table
DROP POLICY IF EXISTS "All authenticated users can view student promotion history" ON student_promotion_history;
CREATE POLICY "All authenticated users can view student promotion history"
  ON student_promotion_history
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Administrators and accountants can manage student promotion history" ON student_promotion_history;
CREATE POLICY "Administrators and accountants can manage student promotion history"
  ON student_promotion_history
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('administrator', 'accountant'));

-- Create policies for student_registration_history table
DROP POLICY IF EXISTS "All authenticated users can view registration history" ON student_registration_history;
CREATE POLICY "All authenticated users can view registration history"
  ON student_registration_history
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Administrators and accountants can manage registration history" ON student_registration_history;
CREATE POLICY "Administrators and accountants can manage registration history"
  ON student_registration_history
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('administrator', 'accountant'));

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_students_updated_at ON students;
CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_student_academic_history_updated_at ON student_academic_history;
CREATE TRIGGER update_student_academic_history_updated_at
    BEFORE UPDATE ON student_academic_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_student_promotion_history_updated_at ON student_promotion_history;
CREATE TRIGGER update_student_promotion_history_updated_at
    BEFORE UPDATE ON student_promotion_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_student_registration_history_updated_at ON student_registration_history;
CREATE TRIGGER update_student_registration_history_updated_at
    BEFORE UPDATE ON student_registration_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to update student registration history
CREATE OR REPLACE FUNCTION update_student_registration_history()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR 
      OLD.status != NEW.status OR 
      OLD.registration_type != NEW.registration_type) THEN
    INSERT INTO student_registration_history (
      student_id,
      academic_year_id,
      registration_type,
      registration_date,
      previous_status,
      new_status,
      reason,
      created_by
    ) VALUES (
      NEW.id,
      (SELECT id FROM academic_years WHERE is_current = true),
      NEW.registration_type,
      COALESCE(NEW.last_registration_date, CURRENT_DATE),
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
      NEW.status,
      NEW.rejoining_reason,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for student registration history
DROP TRIGGER IF EXISTS track_student_registration_changes ON students;
CREATE TRIGGER track_student_registration_changes
AFTER INSERT OR UPDATE ON students
FOR EACH ROW
EXECUTE FUNCTION update_student_registration_history();
