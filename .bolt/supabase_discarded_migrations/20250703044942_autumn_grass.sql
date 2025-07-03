/*
  # Add Current Academic Year

  1. New Data
    - Creates a new academic year for 2025-2026 and sets it as current
    - Ensures there's at least one active academic year for the system to function

  2. Changes
    - Sets is_current to false for any existing academic years
    - Adds a new academic year with is_current set to true
*/

-- First, set all existing academic years to not current
UPDATE academic_years
SET is_current = false;

-- Check if we already have a 2025-2026 academic year
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM academic_years WHERE year_name = '2025-2026') THEN
    -- Insert a new academic year for 2025-2026
    INSERT INTO academic_years (
      year_name,
      start_date,
      end_date,
      is_current,
      transition_status
    ) VALUES (
      '2025-2026',
      '2025-06-01',
      '2026-04-30',
      true,
      'pending'
    );
  ELSE
    -- Update the existing 2025-2026 academic year to be current
    UPDATE academic_years
    SET is_current = true
    WHERE year_name = '2025-2026';
  END IF;
END $$;

-- Verify we have at least one current academic year
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM academic_years WHERE is_current = true) THEN
    -- If no current year exists, set the most recent one as current
    UPDATE academic_years
    SET is_current = true
    WHERE id = (
      SELECT id FROM academic_years
      ORDER BY start_date DESC
      LIMIT 1
    );
  END IF;
END $$;