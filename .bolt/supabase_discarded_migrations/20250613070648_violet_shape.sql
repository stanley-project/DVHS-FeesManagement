/*
  # Miscellaneous Charges System

  This migration establishes the miscellaneous charges system including:
  
  1. Enum Updates
    - Add 'ad_hoc' to fee_frequency enum type
  
  2. Core Tables
    - charge_categories: Predefined categories for common charges
    - miscellaneous_charges: Individual charge records with detailed tracking
  
  3. Fee Payments Enhancement
    - Add charge_description field for itemized receipts
    - Add charge_type field to distinguish charge types
  
  4. Security
    - RLS policies for all new tables
    - Access control based on user roles
  
  5. Data Population
    - Create Miscellaneous Charges fee type
    - Insert common charge categories
*/

-- Step 1: Add 'ad_hoc' to the fee_frequency enum
-- This must be done in a separate transaction to be committed before use
DO $$
BEGIN
  -- Check if 'ad_hoc' already exists in the enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'ad_hoc' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'fee_frequency')
  ) THEN
    ALTER TYPE fee_frequency ADD VALUE 'ad_hoc';
  END IF;
END $$;

-- Step 2: Create charge categories table for common miscellaneous charges
CREATE TABLE IF NOT EXISTS charge_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  default_amount numeric(10,2),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 3: Create miscellaneous charges table for detailed tracking
CREATE TABLE IF NOT EXISTS miscellaneous_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id),
  academic_year_id uuid NOT NULL REFERENCES academic_years(id),
  charge_category_id uuid REFERENCES charge_categories(id),
  amount numeric(10,2) NOT NULL,
  description text NOT NULL,
  charge_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  is_paid boolean DEFAULT false,
  payment_id uuid REFERENCES fee_payments(id),
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 4: Add description field to fee_payments table for itemized receipts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fee_payments' AND column_name = 'charge_description'
  ) THEN
    ALTER TABLE fee_payments ADD COLUMN charge_description text;
  END IF;
END $$;

-- Step 5: Add charge_type field to fee_payments to distinguish regular fees from miscellaneous charges
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fee_payments' AND column_name = 'charge_type'
  ) THEN
    ALTER TABLE fee_payments ADD COLUMN charge_type text DEFAULT 'regular';
    ALTER TABLE fee_payments ADD CONSTRAINT fee_payments_charge_type_check 
      CHECK (charge_type IN ('regular', 'miscellaneous'));
  END IF;
END $$;

-- Step 6: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_miscellaneous_charges_student ON miscellaneous_charges(student_id);
CREATE INDEX IF NOT EXISTS idx_miscellaneous_charges_academic_year ON miscellaneous_charges(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_miscellaneous_charges_charge_date ON miscellaneous_charges(charge_date);
CREATE INDEX IF NOT EXISTS idx_miscellaneous_charges_is_paid ON miscellaneous_charges(is_paid);

-- Step 7: Enable Row Level Security
ALTER TABLE charge_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE miscellaneous_charges ENABLE ROW LEVEL SECURITY;

-- Step 8: Create policies for charge_categories
DROP POLICY IF EXISTS "All users can read charge categories" ON charge_categories;
CREATE POLICY "All users can read charge categories"
ON charge_categories FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Public can read charge categories" ON charge_categories;
CREATE POLICY "Public can read charge categories"
ON charge_categories FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Administrators can manage charge categories" ON charge_categories;
CREATE POLICY "Administrators can manage charge categories"
ON charge_categories FOR ALL TO authenticated
USING (auth.jwt() ->> 'role' = 'administrator')
WITH CHECK (auth.jwt() ->> 'role' = 'administrator');

-- Step 9: Create policies for miscellaneous_charges
DROP POLICY IF EXISTS "All users can read miscellaneous charges" ON miscellaneous_charges;
CREATE POLICY "All users can read miscellaneous charges"
ON miscellaneous_charges FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Administrators and accountants can manage miscellaneous charges" ON miscellaneous_charges;
CREATE POLICY "Administrators and accountants can manage miscellaneous charges"
ON miscellaneous_charges FOR ALL TO authenticated
USING (auth.jwt() ->> 'role' IN ('administrator', 'accountant'))
WITH CHECK (auth.jwt() ->> 'role' IN ('administrator', 'accountant'));

-- Step 10: Create triggers for updated_at
DROP TRIGGER IF EXISTS update_charge_categories_updated_at ON charge_categories;
CREATE TRIGGER update_charge_categories_updated_at
    BEFORE UPDATE ON charge_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_miscellaneous_charges_updated_at ON miscellaneous_charges;
CREATE TRIGGER update_miscellaneous_charges_updated_at
    BEFORE UPDATE ON miscellaneous_charges
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 11: Create function to automatically update miscellaneous_charges when payment is made
CREATE OR REPLACE FUNCTION update_miscellaneous_charge_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is a miscellaneous charge payment, update the corresponding charge record
  IF NEW.charge_type = 'miscellaneous' AND NEW.charge_description IS NOT NULL THEN
    UPDATE miscellaneous_charges 
    SET 
      is_paid = true,
      payment_id = NEW.id,
      updated_at = now()
    WHERE 
      student_id = NEW.student_id 
      AND description = NEW.charge_description
      AND amount = NEW.amount_paid
      AND is_paid = false
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 12: Create trigger for payment updates
DROP TRIGGER IF EXISTS update_miscellaneous_charge_payment_trigger ON fee_payments;
CREATE TRIGGER update_miscellaneous_charge_payment_trigger
  AFTER INSERT ON fee_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_miscellaneous_charge_payment();