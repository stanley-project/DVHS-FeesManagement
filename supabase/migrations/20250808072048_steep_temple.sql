/*
  # Fix Existing Auth Users Passwords

  This migration updates all existing auth.users records to have properly hashed
  login codes as their encrypted_password.
  
  1. Updates
    - Hash login codes from public.users and store as encrypted_password in auth.users
    - Set proper authentication fields for existing users
    - Ensure all existing users can log in with their login codes
  
  2. Security
    - Uses SECURITY DEFINER to access auth schema
    - Only processes users with matching public.users records
*/

-- Create a function to fix existing auth users passwords
CREATE OR REPLACE FUNCTION fix_existing_auth_passwords()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- For each user in public.users that has a matching auth.users record
  FOR user_record IN 
    SELECT 
      pu.id,
      pu.phone_number,
      pu.login_code,
      pu.name,
      pu.role
    FROM public.users pu
    JOIN auth.users au ON pu.id = au.id
    WHERE pu.login_code IS NOT NULL
  LOOP
    -- Update the auth.users record with hashed password and proper fields
    UPDATE auth.users
    SET 
      encrypted_password = crypt(user_record.login_code, gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      phone_confirmed_at = COALESCE(phone_confirmed_at, NOW()),
      raw_app_meta_data = COALESCE(raw_app_meta_data, jsonb_build_object('provider', 'phone', 'providers', '{"phone"}')),
      raw_user_meta_data = jsonb_build_object('full_name', user_record.name, 'role', user_record.role),
      aud = COALESCE(aud, 'authenticated'),
      role = COALESCE(role, 'authenticated'),
      instance_id = COALESCE(instance_id, '00000000-0000-0000-0000-000000000000'),
      is_sso_user = COALESCE(is_sso_user, false),
      updated_at = NOW()
    WHERE id = user_record.id;
    
    RAISE NOTICE 'Updated auth user: % (phone: %, code: %)', user_record.name, user_record.phone_number, user_record.login_code;
  END LOOP;
  
  RAISE NOTICE 'Fixed passwords for all existing auth users';
END;
$$;

-- Execute the function to fix existing passwords
SELECT fix_existing_auth_passwords();

-- Drop the function as it's no longer needed
DROP FUNCTION fix_existing_auth_passwords();