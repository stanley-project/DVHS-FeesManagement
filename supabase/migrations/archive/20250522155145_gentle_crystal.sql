/*
  # Update Villages Table Schema

  1. Changes
    - Remove description column
    - Add bus_number column
    - Add constraint for valid bus numbers

  2. Security
    - Maintain existing RLS policies
*/

-- Remove description column if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'villages' 
    AND column_name = 'description'
  ) THEN
    ALTER TABLE villages DROP COLUMN description;
  END IF;
END $$;

-- Add bus_number column
ALTER TABLE villages
  ADD COLUMN IF NOT EXISTS bus_number VARCHAR(10) NOT NULL,
  ADD CONSTRAINT villages_bus_number_check CHECK (bus_number IN ('Bus1', 'Bus2', 'Bus3', 'Bus4', 'Winger'));

-- Create index for bus_number
CREATE INDEX IF NOT EXISTS idx_villages_bus_number ON villages(bus_number);