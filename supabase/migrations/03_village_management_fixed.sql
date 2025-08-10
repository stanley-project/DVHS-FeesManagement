/*
  # Village Management Module

  This consolidated migration establishes the village management schema including:
  
  1. Core Tables
    - villages: Village information with distance from school and bus details
  
  2. Relationships
    - Referenced by students table for village-based registration
    - Referenced by bus_fee_structure for village-specific bus fees
  
  3. Security
    - RLS policies for village management
    - Access control based on user roles

  Consolidated from:
  - 20250522102945_quick_sound.sql
  - 20250522114320_teal_base.sql
  - 20250522140320_icy_salad.sql
  - 20250522150455_delicate_portal.sql
  - 20250522155145_gentle_crystal.sql
  - 20250522160745_stark_temple.sql
  - 20250522162221_lucky_lodge.sql
  - 20250522162325_weathered_villa.sql
  - 20250522162823_jolly_peak.sql
*/

-- Create villages table
CREATE TABLE IF NOT EXISTS villages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  distance_from_school numeric(5,2) NOT NULL,
  is_active boolean DEFAULT true,
  bus_number VARCHAR(10) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT villages_bus_number_check CHECK (bus_number IN ('Bus1', 'Bus2', 'Bus3', 'Bus4', 'Winger'))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_villages_name ON villages USING btree (name);
CREATE INDEX IF NOT EXISTS idx_villages_bus_number ON villages(bus_number);

-- Enable Row Level Security
ALTER TABLE villages ENABLE ROW LEVEL SECURITY;

-- Create final consolidated policies for villages
-- These are the final policies after all the incremental changes and fixes
DROP POLICY IF EXISTS "Administrators can manage villages" ON villages;
CREATE POLICY "Administrators can manage villages"
ON villages
FOR ALL
TO authenticated
USING (auth.jwt() ->> 'role' = 'administrator')
WITH CHECK (auth.jwt() ->> 'role' = 'administrator');

DROP POLICY IF EXISTS "All authenticated users can view villages" ON villages;
CREATE POLICY "All authenticated users can view villages"
ON villages
FOR SELECT
TO authenticated
USING (true);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_villages_updated_at ON villages;
CREATE TRIGGER update_villages_updated_at
    BEFORE UPDATE ON villages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
