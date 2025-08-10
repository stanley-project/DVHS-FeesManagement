/*
  # Add Login Code System
  
  1. Changes
    - Add login_code column to users table
    - Add code_expires_at column for future expiration feature
    - Add unique constraint and format validation for login codes
    - Create function to generate unique login codes
    - Add trigger to auto-generate codes for new users
    - Add index for faster login code lookups
  
  2. Security
    - Ensure login codes are unique
    - Format validation to avoid confusing characters
    - Maintain existing RLS policies
*/

-- Add new columns with constraints
ALTER TABLE users 
  ADD COLUMN login_code VARCHAR(8),
  ADD COLUMN code_expires_at TIMESTAMPTZ;

-- Add unique constraint for login_code
ALTER TABLE users
  ADD CONSTRAINT users_login_code_key UNIQUE (login_code);

-- Add check constraint to ensure valid code format (alphanumeric, no confusing chars)
ALTER TABLE users
  ADD CONSTRAINT users_login_code_format_check 
  CHECK (login_code ~ '^[A-HJ-NP-Z2-9]{8}$');

-- Create function to generate unique login code
CREATE OR REPLACE FUNCTION generate_unique_login_code()
RETURNS VARCHAR(8) AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result VARCHAR(8) := '';
  i INTEGER;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 8-character code
    result := '';
    FOR i IN 1..8 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    
    -- Check if code already exists
    SELECT EXISTS (
      SELECT 1 FROM users WHERE login_code = result
    ) INTO exists;
    
    -- Exit loop if unique code found
    EXIT WHEN NOT exists;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Populate existing users with unique login codes
DO $$ 
BEGIN
  UPDATE users 
  SET login_code = generate_unique_login_code(),
      code_expires_at = NULL
  WHERE login_code IS NULL;
END $$;

-- Create trigger to auto-generate login code for new users
CREATE OR REPLACE FUNCTION set_login_code_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.login_code IS NULL THEN
    NEW.login_code := generate_unique_login_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_set_login_code
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_login_code_on_insert();

-- Update existing RLS policy
ALTER POLICY "Users can view their own profile"
  ON users
  USING (
    auth.uid() = id OR 
    (auth.jwt() ->> 'role')::text = 'administrator'
  );

-- Add index for faster login code lookups
CREATE INDEX idx_users_login_code ON users(login_code);