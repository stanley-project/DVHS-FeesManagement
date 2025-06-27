/*
  # Add academic_year_id to fee_payments table

  1. Changes
    - Add `academic_year_id` column to `fee_payments` table
    - Set up foreign key relationship with `academic_years` table
    - Add index for performance
    - Backfill existing records with current academic year

  2. Security
    - No changes to RLS policies needed
*/

-- Add the academic_year_id column to fee_payments table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fee_payments' AND column_name = 'academic_year_id'
  ) THEN
    ALTER TABLE fee_payments ADD COLUMN academic_year_id uuid;
  END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fee_payments_academic_year_id_fkey'
  ) THEN
    ALTER TABLE fee_payments 
    ADD CONSTRAINT fee_payments_academic_year_id_fkey 
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id);
  END IF;
END $$;

-- Add index for performance if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_fee_payments_academic_year_id'
  ) THEN
    CREATE INDEX idx_fee_payments_academic_year_id ON fee_payments(academic_year_id);
  END IF;
END $$;

-- Backfill existing records with current academic year
UPDATE fee_payments 
SET academic_year_id = (
  SELECT id FROM academic_years WHERE is_current = true LIMIT 1
)
WHERE academic_year_id IS NULL;

-- Make the column NOT NULL after backfilling
ALTER TABLE fee_payments ALTER COLUMN academic_year_id SET NOT NULL;