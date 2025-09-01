/*
  # Add TC Available column to students table

  1. Changes
    - Add `tc_available` boolean column to `students` table
    - Set default value to false
    - Column is nullable to handle existing records

  2. Security
    - No RLS changes needed as it inherits from existing table policies
*/

-- Add tc_available column to students table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'tc_available'
  ) THEN
    ALTER TABLE students ADD COLUMN tc_available boolean DEFAULT false;
  END IF;
END $$;