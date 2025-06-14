/*
  # Fee Collection Module Rehaul - Payment Allocation System

  This migration implements the new payment allocation system that:
  
  1. Creates payment_allocation table to track payment distribution
  2. Implements automatic payment allocation based on priority (bus fees first)
  3. Removes fee_type column from fee_payments table
  4. Adds receipt number generation function
  5. Creates triggers for automatic payment allocation

  Changes:
  - Add payment_allocation table
  - Add receipt number generation function
  - Add payment allocation trigger
  - Remove fee_type column from fee_payments
  - Update RLS policies for new table
*/

-- Create payment_allocation table to track payment priority
CREATE TABLE IF NOT EXISTS payment_allocation (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id uuid REFERENCES fee_payments(id) ON DELETE CASCADE,
    student_id uuid REFERENCES students(id) ON DELETE CASCADE,
    bus_fee_amount numeric(10,2) DEFAULT 0,
    school_fee_amount numeric(10,2) DEFAULT 0,
    allocation_date timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_allocation_payment_id ON payment_allocation(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocation_student_id ON payment_allocation(student_id);

-- Enable RLS
ALTER TABLE payment_allocation ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for payment_allocation
CREATE POLICY "All users can read payment allocations"
ON payment_allocation FOR SELECT TO authenticated USING (true);

CREATE POLICY "Administrators and accountants can manage payment allocations"
ON payment_allocation FOR ALL TO authenticated
USING (auth.jwt() ->> 'role' IN ('administrator', 'accountant'))
WITH CHECK (auth.jwt() ->> 'role' IN ('administrator', 'accountant'));

-- Create function to generate unique receipt numbers
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS text AS $$
DECLARE
    receipt_num text;
    year_part text;
    sequence_num integer;
BEGIN
    -- Get current year
    year_part := EXTRACT(YEAR FROM CURRENT_DATE)::text;
    
    -- Get next sequence number for this year
    SELECT COALESCE(MAX(
        CASE 
            WHEN receipt_number ~ ('^RC-' || year_part || '-[0-9]+$') 
            THEN CAST(SUBSTRING(receipt_number FROM '[0-9]+$') AS integer)
            ELSE 0
        END
    ), 0) + 1
    INTO sequence_num
    FROM fee_payments
    WHERE receipt_number LIKE 'RC-' || year_part || '-%';
    
    -- Format: RC-YYYY-NNNN (e.g., RC-2025-0001)
    receipt_num := 'RC-' || year_part || '-' || LPAD(sequence_num::text, 4, '0');
    
    RETURN receipt_num;
END;
$$ LANGUAGE plpgsql;

-- Create function to allocate payments based on priority
CREATE OR REPLACE FUNCTION allocate_payment()
RETURNS TRIGGER AS $$
DECLARE
    pending_bus_fee numeric(10,2) := 0;
    bus_allocation numeric(10,2) := 0;
    school_allocation numeric(10,2) := 0;
    student_village_id uuid;
    current_academic_year_id uuid;
BEGIN
    -- Get student's village_id
    SELECT village_id INTO student_village_id
    FROM students
    WHERE id = NEW.student_id;
    
    -- Get current academic year
    SELECT id INTO current_academic_year_id
    FROM academic_years
    WHERE is_current = true
    LIMIT 1;
    
    -- Skip allocation if student has no village or no current academic year
    IF student_village_id IS NULL OR current_academic_year_id IS NULL THEN
        INSERT INTO payment_allocation (
            payment_id,
            student_id,
            bus_fee_amount,
            school_fee_amount
        ) VALUES (
            NEW.id,
            NEW.student_id,
            0,
            NEW.amount_paid
        );
        RETURN NEW;
    END IF;
    
    -- Calculate pending bus fees
    SELECT COALESCE(SUM(bs.fee_amount), 0) - COALESCE(
        (SELECT SUM(pa.bus_fee_amount) 
         FROM payment_allocation pa 
         JOIN fee_payments fp ON pa.payment_id = fp.id
         WHERE pa.student_id = NEW.student_id
        ), 0) INTO pending_bus_fee
    FROM bus_fee_structure bs
    WHERE bs.village_id = student_village_id
    AND bs.academic_year_id = current_academic_year_id
    AND bs.is_active = true;
    
    -- Only allocate to bus fees if student uses school bus
    IF EXISTS (SELECT 1 FROM students WHERE id = NEW.student_id AND has_school_bus = true) THEN
        -- Allocate to bus fees first (priority)
        bus_allocation := LEAST(NEW.amount_paid, pending_bus_fee);
        school_allocation := NEW.amount_paid - bus_allocation;
    ELSE
        -- If student doesn't use bus, allocate everything to school fees
        bus_allocation := 0;
        school_allocation := NEW.amount_paid;
    END IF;
    
    -- Insert allocation record
    INSERT INTO payment_allocation (
        payment_id,
        student_id,
        bus_fee_amount,
        school_fee_amount
    ) VALUES (
        NEW.id,
        NEW.student_id,
        bus_allocation,
        school_allocation
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payment allocation
CREATE TRIGGER tr_allocate_payment
AFTER INSERT ON fee_payments
FOR EACH ROW
EXECUTE FUNCTION allocate_payment();

-- Create trigger for updated_at on payment_allocation
CREATE TRIGGER update_payment_allocation_updated_at
BEFORE UPDATE ON payment_allocation
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Remove fee_type column from fee_payments if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'fee_payments' AND column_name = 'fee_type'
    ) THEN
        ALTER TABLE fee_payments DROP COLUMN fee_type;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'fee_payments' AND column_name = 'fee_structure_id'
    ) THEN
        ALTER TABLE fee_payments DROP COLUMN fee_structure_id;
    END IF;
END $$;