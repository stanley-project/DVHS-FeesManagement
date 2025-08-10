/*
  # Simple Row Level Security (RLS) Policies for All Tables

  This migration applies consistent, simple RLS policies across all tables:
  
  1. Read Access: All authenticated users can read from all tables
  2. Write Access: Administrators and accountants can modify most data
  3. Public Access: Essential tables accessible during authentication
  4. Special Cases: Some tables have role-specific write permissions

  Tables covered:
  - users, academic_years, classes
  - students, student_academic_history, student_promotion_history, student_registration_history
  - villages
  - fee_types, fee_structure, fee_structure_history, fee_structure_templates
  - bus_fee_structure, bus_fee_history, bus_fee_adjustments
  - admission_fee_settings, admission_fee_history
  - fee_payments
  - academic_year_transitions, academic_year_settings
*/

-- =============================================
-- USERS TABLE
-- =============================================
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Administrators can manage users" ON users;
DROP POLICY IF EXISTS "Administrators can manage all users" ON users;
DROP POLICY IF EXISTS "Accountants can view all users" ON users;
DROP POLICY IF EXISTS "Teachers can view other teachers" ON users;
DROP POLICY IF EXISTS "Allow phone number verification" ON users;

-- Simple read access for authenticated users
CREATE POLICY "All authenticated users can read users"
ON users FOR SELECT TO authenticated USING (true);

-- Public read access for authentication (phone number verification)
CREATE POLICY "Public can read users for authentication"
ON users FOR SELECT TO public USING (true);

-- Only administrators can manage users
CREATE POLICY "Administrators can manage users"
ON users FOR ALL TO authenticated
USING (auth.jwt() ->> 'role' = 'administrator')
WITH CHECK (auth.jwt() ->> 'role' = 'administrator');

-- =============================================
-- ACADEMIC YEARS TABLE
-- =============================================
DROP POLICY IF EXISTS "All authenticated users can view academic years" ON academic_years;
DROP POLICY IF EXISTS "Administrators can manage academic years" ON academic_years;
DROP POLICY IF EXISTS "Enable read access for academic years" ON academic_years;
DROP POLICY IF EXISTS "Enable public read access for academic years" ON academic_years;

CREATE POLICY "All users can read academic years"
ON academic_years FOR SELECT TO authenticated USING (true);

CREATE POLICY "Public can read academic years"
ON academic_years FOR SELECT TO public USING (true);

CREATE POLICY "Administrators can manage academic years"
ON academic_years FOR ALL TO authenticated
USING (auth.jwt() ->> 'role' = 'administrator')
WITH CHECK (auth.jwt() ->> 'role' = 'administrator');

-- =============================================
-- CLASSES TABLE
-- =============================================
DROP POLICY IF EXISTS "All authenticated users can view classes" ON classes;
DROP POLICY IF EXISTS "Administrators can manage classes" ON classes;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON classes;
DROP POLICY IF EXISTS "Enable read access for public users with valid session" ON classes;
DROP POLICY IF EXISTS "Administrators can manage all classes" ON classes;

CREATE POLICY "All users can read classes"
ON classes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Public can read classes"
ON classes FOR SELECT TO public USING (true);

CREATE POLICY "Administrators can manage classes"
ON classes FOR ALL TO authenticated
USING (auth.jwt() ->> 'role' = 'administrator')
WITH CHECK (auth.jwt() ->> 'role' = 'administrator');

-- =============================================
-- STUDENTS TABLE
-- =============================================
DROP POLICY IF EXISTS "All authenticated users can view students" ON students;
DROP POLICY IF EXISTS "Administrators and accountants can manage students" ON students;
DROP POLICY IF EXISTS "Enable read access for all students" ON students;
DROP POLICY IF EXISTS "Enable public read access for students" ON students;

CREATE POLICY "All users can read students"
ON students FOR SELECT TO authenticated USING (true);

CREATE POLICY "Public can read students"
ON students FOR SELECT TO public USING (true);

CREATE POLICY "Administrators and accountants can manage students"
ON students FOR ALL TO authenticated
USING (auth.jwt() ->> 'role' IN ('administrator', 'accountant'))
WITH CHECK (auth.jwt() ->> 'role' IN ('administrator', 'accountant'));

-- =============================================
-- STUDENT ACADEMIC HISTORY TABLE
-- =============================================
DROP POLICY IF EXISTS "All authenticated users can view student academic history" ON student_academic_history;
DROP POLICY IF EXISTS "Administrators and accountants can manage student academic hist" ON student_academic_history;

CREATE POLICY "All users can read student academic history"
ON student_academic_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Administrators and accountants can manage student academic history"
ON student_academic_history FOR ALL TO authenticated
USING (auth.jwt() ->> 'role' IN ('administrator', 'accountant'))
WITH CHECK (auth.jwt() ->> 'role' IN ('administrator', 'accountant'));

-- =============================================
-- STUDENT PROMOTION HISTORY TABLE
-- =============================================
DROP POLICY IF EXISTS "All authenticated users can view student promotion history" ON student_promotion_history;
DROP POLICY IF EXISTS "Administrators and accountants can manage student promotion his" ON student_promotion_history;

CREATE POLICY "All users can read student promotion history"
ON student_promotion_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Administrators and accountants can manage student promotion history"
ON student_promotion_history FOR ALL TO authenticated
USING (auth.jwt() ->> 'role' IN ('administrator', 'accountant'))
WITH CHECK (auth.jwt() ->> 'role' IN ('administrator', 'accountant'));

-- =============================================
-- STUDENT REGISTRATION HISTORY TABLE
-- =============================================
DROP POLICY IF EXISTS "All authenticated users can view registration history" ON student_registration_history;
DROP POLICY IF EXISTS "Administrators and accountants can manage registration history" ON student_registration_history;

CREATE POLICY "All users can read student registration history"
ON student_registration_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Administrators and accountants can manage student registration history"
ON student_registration_history FOR ALL TO authenticated
USING (auth.jwt() ->> 'role' IN ('administrator', 'accountant'))
WITH CHECK (auth.jwt() ->> 'role' IN ('administrator', 'accountant'));

-- =============================================
-- VILLAGES TABLE
-- =============================================
DROP POLICY IF EXISTS "Administrators can manage villages" ON villages;
DROP POLICY IF EXISTS "All authenticated users can view villages" ON villages;
DROP POLICY IF EXISTS "Enable read access for villages" ON villages;
DROP POLICY IF EXISTS "Enable public read access for villages" ON villages;

CREATE POLICY "All users can read villages"
ON villages FOR SELECT TO authenticated USING (true);

CREATE POLICY "Public can read villages"
ON villages FOR SELECT TO public USING (true);

CREATE POLICY "Administrators can manage villages"
ON villages FOR ALL TO authenticated
USING (auth.jwt() ->> 'role' = 'administrator')
WITH CHECK (auth.jwt() ->> 'role' = 'administrator');

-- =============================================
-- FEE TYPES TABLE
-- =============================================
DROP POLICY IF EXISTS "All authenticated users can view fee types" ON fee_types;
DROP POLICY IF EXISTS "Administrators can manage fee types" ON fee_types;

CREATE POLICY "All users can read fee types"
ON fee_types FOR SELECT TO authenticated USING (true);

CREATE POLICY "Administrators can manage fee types"
ON fee_types FOR ALL TO authenticated
USING (auth.jwt() ->> 'role' = 'administrator')
WITH CHECK (auth.jwt() ->> 'role' = 'administrator');

-- =============================================
-- FEE STRUCTURE TABLE
-- =============================================
DROP POLICY IF EXISTS "All authenticated users can view fee structure" ON fee_structure;
DROP POLICY IF EXISTS "Administrators can manage fee structure" ON fee_structure;

CREATE POLICY "All users can read fee structure"
ON fee_structure FOR SELECT TO authenticated USING (true);

CREATE POLICY "Administrators can manage fee structure"
ON fee_structure FOR ALL TO authenticated
USING (auth.jwt() ->> 'role' = 'administrator')
WITH CHECK (auth.jwt() ->> 'role' = 'administrator');

-- =============================================
-- FEE STRUCTURE HISTORY TABLE
-- =============================================
DROP POLICY IF EXISTS "All authenticated users can view fee structure history" ON fee_structure_history;
DROP POLICY IF EXISTS "Administrators can manage fee structure history" ON fee_structure_history;

CREATE POLICY "All users can read fee structure history"
ON fee_structure_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Administrators can manage fee structure history"
ON fee_structure_history FOR ALL TO authenticated
USING (auth.jwt() ->> 'role' = 'administrator')
WITH CHECK (auth.jwt() ->> 'role' = 'administrator');

-- =============================================
-- FEE STRUCTURE TEMPLATES TABLE
-- =============================================
DROP POLICY IF EXISTS "All authenticated users can view fee structure templates" ON fee_structure_templates;
DROP POLICY IF EXISTS "Administrators can manage fee structure templates" ON fee_structure_templates;

CREATE POLICY "All users can read fee structure templates"
ON fee_structure_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Administrators can manage fee structure templates"
ON fee_structure_templates FOR ALL TO authenticated
USING (auth.jwt() ->> 'role' = 'administrator')
WITH CHECK (auth.jwt() ->> 'role' = 'administrator');

-- =============================================
-- BUS FEE STRUCTURE TABLE
-- =============================================
DROP POLICY IF EXISTS "All authenticated users can view bus fee structure" ON bus_fee_structure;
DROP POLICY IF EXISTS "Administrators can manage bus fee structure" ON bus_fee_structure;
DROP POLICY IF EXISTS "Allow all public roles to delete from bus fee structure" ON bus_fee_structure;
DROP POLICY IF EXISTS "Allow all public roles to insert into bus fee structure" ON bus_fee_structure;
DROP POLICY IF EXISTS "Allow authenticated roles to read bus fee structure" ON bus_fee_structure;
DROP POLICY IF EXISTS "Allow authenticated roles to update bus fee structure" ON bus_fee_structure;

CREATE POLICY "All users can read bus fee structure"
ON bus_fee_structure FOR SELECT TO authenticated USING (true);

CREATE POLICY "Administrators can manage bus fee structure"
ON bus_fee_structure FOR ALL TO authenticated
USING (auth.jwt() ->> 'role' = 'administrator')
WITH CHECK (auth.jwt() ->> 'role' = 'administrator');

-- =============================================
-- BUS FEE HISTORY TABLE
-- =============================================
DROP POLICY IF EXISTS "All authenticated users can view bus fee history" ON bus_fee_history;
DROP POLICY IF EXISTS "Administrators can manage bus fee history" ON bus_fee_history;

CREATE POLICY "All users can read bus fee history"
ON bus_fee_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Administrators can manage bus fee history"
ON bus_fee_history FOR ALL TO authenticated
USING (auth.jwt() ->> 'role' = 'administrator')
WITH CHECK (auth.jwt() ->> 'role' = 'administrator');

-- =============================================
-- BUS FEE ADJUSTMENTS TABLE
-- =============================================
DROP POLICY IF EXISTS "All authenticated users can view bus fee adjustments" ON bus_fee_adjustments;
DROP POLICY IF EXISTS "Administrators and accountants can manage bus fee adjustments" ON bus_fee_adjustments;

CREATE POLICY "All users can read bus fee adjustments"
ON bus_fee_adjustments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Administrators and accountants can manage bus fee adjustments"
ON bus_fee_adjustments FOR ALL TO authenticated
USING (auth.jwt() ->> 'role' IN ('administrator', 'accountant'))
WITH CHECK (auth.jwt() ->> 'role' IN ('administrator', 'accountant'));

-- =============================================
-- ADMISSION FEE SETTINGS TABLE
-- =============================================
DROP POLICY IF EXISTS "All authenticated users can view admission fee settings" ON admission_fee_settings;
DROP POLICY IF EXISTS "Administrators can manage admission fee settings" ON admission_fee_settings;
DROP POLICY IF EXISTS "Administrators can manage fee settings" ON admission_fee_settings;
DROP POLICY IF EXISTS "Users can view fee settings" ON admission_fee_settings;

CREATE POLICY "All users can read admission fee settings"
ON admission_fee_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Public can read admission fee settings"
ON admission_fee_settings FOR SELECT TO public USING (true);

CREATE POLICY "Administrators can manage admission fee settings"
ON admission_fee_settings FOR ALL TO authenticated
USING (auth.jwt() ->> 'role' = 'administrator')
WITH CHECK (auth.jwt() ->> 'role' = 'administrator');

-- =============================================
-- ADMISSION FEE HISTORY TABLE
-- =============================================
DROP POLICY IF EXISTS "All authenticated users can view admission fee history" ON admission_fee_history;
DROP POLICY IF EXISTS "Administrators can manage admission fee history" ON admission_fee_history;

CREATE POLICY "All users can read admission fee history"
ON admission_fee_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Administrators can manage admission fee history"
ON admission_fee_history FOR ALL TO authenticated
USING (auth.jwt() ->> 'role' = 'administrator')
WITH CHECK (auth.jwt() ->> 'role' = 'administrator');

-- =============================================
-- FEE PAYMENTS TABLE
-- =============================================
DROP POLICY IF EXISTS "All authenticated users can view fee payments" ON fee_payments;
DROP POLICY IF EXISTS "Administrators and accountants can manage fee payments" ON fee_payments;

CREATE POLICY "All users can read fee payments"
ON fee_payments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Administrators and accountants can manage fee payments"
ON fee_payments FOR ALL TO authenticated
USING (auth.jwt() ->> 'role' IN ('administrator', 'accountant'))
WITH CHECK (auth.jwt() ->> 'role' IN ('administrator', 'accountant'));

-- =============================================
-- ACADEMIC YEAR TRANSITIONS TABLE
-- =============================================
DROP POLICY IF EXISTS "All authenticated users can view academic year transitions" ON academic_year_transitions;
DROP POLICY IF EXISTS "Administrators can manage academic year transitions" ON academic_year_transitions;

CREATE POLICY "All users can read academic year transitions"
ON academic_year_transitions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Administrators can manage academic year transitions"
ON academic_year_transitions FOR ALL TO authenticated
USING (auth.jwt() ->> 'role' = 'administrator')
WITH CHECK (auth.jwt() ->> 'role' = 'administrator');

-- =============================================
-- ACADEMIC YEAR SETTINGS TABLE
-- =============================================
DROP POLICY IF EXISTS "All authenticated users can view academic year settings" ON academic_year_settings;
DROP POLICY IF EXISTS "Administrators can manage academic year settings" ON academic_year_settings;

CREATE POLICY "All users can read academic year settings"
ON academic_year_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Administrators can manage academic year settings"
ON academic_year_settings FOR ALL TO authenticated
USING (auth.jwt() ->> 'role' = 'administrator')
WITH CHECK (auth.jwt() ->> 'role' = 'administrator');

-- =============================================
-- SUMMARY OF POLICIES APPLIED
-- =============================================
/*
  Summary of RLS Policies Applied:

  READ ACCESS (SELECT):
  - All authenticated users can read from all tables
  - Public users can read from essential tables (users, academic_years, classes, villages, admission_fee_settings, students)

  WRITE ACCESS (INSERT/UPDATE/DELETE):
  - Administrators: Full access to all tables
  - Accountants: Can manage students, student history, fee payments, and bus fee adjustments
  - Teachers: Read-only access to all tables

  SPECIAL CASES:
  - Users table: Only administrators can manage other users
  - Fee structure tables: Only administrators can modify
  - Academic year management: Only administrators can modify
  - Villages: Only administrators can modify

  This provides a simple, consistent security model while maintaining proper access controls.
*/