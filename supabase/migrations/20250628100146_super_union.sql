/*
  # Fix Payment Allocation Table

  This migration adds an index to the payment_allocation table to improve query performance
  and ensures the table has the correct constraints.
  
  1. Changes:
    - Add index for student_id to improve query performance
    - Add index for payment_id to improve query performance
    - Ensure foreign key constraints are properly set up
*/

-- Add indexes for better performance if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_payment_allocation_student_id'
  ) THEN
    CREATE INDEX idx_payment_allocation_student_id ON payment_allocation(student_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_payment_allocation_payment_id'
  ) THEN
    CREATE INDEX idx_payment_allocation_payment_id ON payment_allocation(payment_id);
  END IF;
END $$;

-- Ensure foreign key constraints exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'payment_allocation_payment_id_fkey'
  ) THEN
    ALTER TABLE payment_allocation 
    ADD CONSTRAINT payment_allocation_payment_id_fkey 
    FOREIGN KEY (payment_id) REFERENCES fee_payments(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'payment_allocation_student_id_fkey'
  ) THEN
    ALTER TABLE payment_allocation 
    ADD CONSTRAINT payment_allocation_student_id_fkey 
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enable RLS on payment_allocation if not already enabled
ALTER TABLE payment_allocation ENABLE ROW LEVEL SECURITY;

-- Create policies for payment_allocation
DROP POLICY IF EXISTS "All users can read payment allocations" ON payment_allocation;
CREATE POLICY "All users can read payment allocations"
  ON payment_allocation
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Enable insert access for all users" ON payment_allocation;
CREATE POLICY "Enable insert access for all users"
  ON payment_allocation
  FOR INSERT
  TO public
  WITH CHECK (true);