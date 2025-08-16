/*
  # Add remarks field to students table

  1. Schema Changes
    - Add `remarks` column to `students` table
    - Column is optional (nullable) text field
    - No default value required

  2. Notes
    - This field will store optional remarks provided during student registration
    - Field is completely optional and can be left empty
*/

-- Add remarks column to students table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'remarks'
  ) THEN
    ALTER TABLE students ADD COLUMN remarks text;
  END IF;
END $$;