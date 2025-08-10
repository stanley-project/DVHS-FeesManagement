/*
  # Miscellaneous Charges Fee Type Setup

  This migration creates the infrastructure for handling miscellaneous charges:
  
  1. New Fee Type
    - Creates "Miscellaneous Charges" fee type with ad-hoc frequency
  
  2. Enhanced Fee Payments
    - Adds description field for itemized charges
    - Adds support for multiple charges per student per period
  
  3. New Tables
    - miscellaneous_charges: Tracks individual miscellaneous charges
    - charge_categories: Predefined categories for common charges
  
  4. Security
    - RLS policies for new tables
    - Access control based on user roles
*/

-- First, add 'ad_hoc' to the fee_frequency enum
ALTER TYPE fee_frequency ADD VALUE IF NOT EXISTS 'ad_hoc';

-- Create charge categories table for common miscellaneous charges
CREATE TABLE IF NOT EXISTS charge_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  default_amount numeric(10,2),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create miscellaneous charges table for detailed tracking
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

-- Add description field to fee_payments table for itemized receipts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fee_payments' AND column_name = 'charge_description'
  ) THEN
    ALTER TABLE fee_payments ADD COLUMN charge_description text;
  END IF;
END $$;

-- Add charge_type field to fee_payments to distinguish regular fees from miscellaneous charges
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fee_payments' AND column_name = 'charge_type'
  ) THEN
    ALTER TABLE fee_payments ADD COLUMN charge_type text DEFAULT 'regular' CHECK (charge_type IN ('regular', 'miscellaneous'));
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_miscellaneous_charges_student ON miscellaneous_charges(student_id);
CREATE INDEX IF NOT EXISTS idx_miscellaneous_charges_academic_year ON miscellaneous_charges(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_miscellaneous_charges_charge_date ON miscellaneous_charges(charge_date);
CREATE INDEX IF NOT EXISTS idx_miscellaneous_charges_is_paid ON miscellaneous_charges(is_paid);

-- Enable Row Level Security
ALTER TABLE charge_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE miscellaneous_charges ENABLE ROW LEVEL SECURITY;

-- Create policies for charge_categories
CREATE POLICY "All users can read charge categories"
ON charge_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Public can read charge categories"
ON charge_categories FOR SELECT TO public USING (true);

CREATE POLICY "Administrators can manage charge categories"
ON charge_categories FOR ALL TO authenticated
USING (auth.jwt() ->> 'role' = 'administrator')
WITH CHECK (auth.jwt() ->> 'role' = 'administrator');

-- Create policies for miscellaneous_charges
CREATE POLICY "All users can read miscellaneous charges"
ON miscellaneous_charges FOR SELECT TO authenticated USING (true);

CREATE POLICY "Administrators and accountants can manage miscellaneous charges"
ON miscellaneous_charges FOR ALL TO authenticated
USING (auth.jwt() ->> 'role' IN ('administrator', 'accountant'))
WITH CHECK (auth.jwt() ->> 'role' IN ('administrator', 'accountant'));

-- Create triggers for updated_at
CREATE TRIGGER update_charge_categories_updated_at
    BEFORE UPDATE ON charge_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_miscellaneous_charges_updated_at
    BEFORE UPDATE ON miscellaneous_charges
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert the Miscellaneous Charges fee type
INSERT INTO fee_types (
  name,
  description,
  frequency,
  category,
  is_monthly,
  is_for_new_students_only,
  effective_from,
  created_at,
  updated_at
) VALUES (
  'Miscellaneous Charges',
  'Variable expenses including books, uniforms, additional educational materials, and other incidental expenses',
  'ad_hoc',
  'school',
  false,
  false,
  CURRENT_DATE,
  now(),
  now()
) ON CONFLICT (name) DO NOTHING;

-- Insert common charge categories
INSERT INTO charge_categories (name, description, default_amount, is_active) VALUES
  ('Books', 'Textbooks and educational materials', 500.00, true),
  ('Uniforms', 'School uniforms and accessories', 800.00, true),
  ('Stationery', 'Notebooks, pens, and other stationery items', 200.00, true),
  ('Sports Equipment', 'Sports gear and equipment', 300.00, true),
  ('Laboratory Materials', 'Science lab materials and equipment', 400.00, true),
  ('Art Supplies', 'Art and craft materials', 250.00, true),
  ('Field Trip', 'Educational excursions and field trips', 1000.00, true),
  ('Extra Classes', 'Additional coaching or tutorial classes', 600.00, true),
  ('Examination Fees', 'External examination and certification fees', 350.00, true),
  ('Other', 'Other miscellaneous expenses', 0.00, true)
ON CONFLICT (name) DO NOTHING;

-- Create function to automatically update miscellaneous_charges when payment is made
CREATE OR REPLACE FUNCTION update_miscellaneous_charge_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is a miscellaneous charge payment, update the corresponding charge record
  IF NEW.charge_type = 'miscellaneous' AND NEW.notes IS NOT NULL THEN
    UPDATE miscellaneous_charges 
    SET 
      is_paid = true,
      payment_id = NEW.id,
      updated_at = now()
    WHERE 
      student_id = NEW.student_id 
      AND description = NEW.charge_description
      AND amount_paid = NEW.amount_paid
      AND is_paid = false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payment updates
DROP TRIGGER IF EXISTS update_miscellaneous_charge_payment_trigger ON fee_payments;
CREATE TRIGGER update_miscellaneous_charge_payment_trigger
  AFTER INSERT ON fee_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_miscellaneous_charge_payment();