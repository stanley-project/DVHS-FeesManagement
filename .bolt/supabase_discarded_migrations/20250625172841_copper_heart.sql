/*
  # Remove Admission Fees from Fee Management System

  This migration removes admission fees from the system, leaving only school and bus fees.
  
  1. Changes
    - Update fee_category enum to remove 'admission'
    - Drop admission fee tables
    - Remove admission fee columns from fee calculations
    - Update existing fee types to ensure none use 'admission' category
    - Update RLS policies to remove admission fee references
*/

-- 1. First, update any existing fee types to change category from 'admission' to 'school'
UPDATE fee_types
SET category = 'school'
WHERE category = 'admission';

-- 2. Drop admission fee tables
DROP TABLE IF EXISTS admission_fee_history;
DROP TABLE IF EXISTS admission_fee_settings;

-- 3. Remove admission fee columns from fee calculations if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'fee_calculations' AND column_name = 'total_admission_fees'
  ) THEN
    ALTER TABLE fee_calculations DROP COLUMN total_admission_fees;
  END IF;
END $$;

-- 4. Update fee_category enum type to remove 'admission'
-- This is a complex operation in PostgreSQL as we need to:
-- a. Create a new enum type
-- b. Update columns to use the new type
-- c. Drop the old type

-- Create new enum type without 'admission'
CREATE TYPE fee_category_new AS ENUM ('school', 'bus');

-- Update fee_types table to use the new enum
ALTER TABLE fee_types 
  ALTER COLUMN category TYPE fee_category_new 
  USING (
    CASE 
      WHEN category::text = 'admission' THEN 'school'::fee_category_new
      ELSE category::text::fee_category_new
    END
  );

-- Drop the old enum type
DROP TYPE fee_category;

-- Rename the new enum type to the original name
ALTER TYPE fee_category_new RENAME TO fee_category;

-- 5. Clean up any RLS policies that might reference admission fees
-- No specific action needed as we're not changing policy names,
-- just ensuring the tables they reference no longer exist