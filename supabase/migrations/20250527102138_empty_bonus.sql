/*
  # Auth User Creation System

  This migration adds functionality to automatically create auth users when public users are created:
  
  1. New Function
    - create_auth_user: Creates a user in auth.users table
  
  2. New Trigger
    - Automatically creates auth user when public user is created
    
  3. Security
    - Function executes with security definer to access auth schema
*/

-- Create a function to create a user in auth.users when a new user is inserted into public.users
CREATE OR REPLACE FUNCTION create_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  auth_user_id UUID;
BEGIN
  -- Create a user in auth.users with the phone number as email and login_code as password
  INSERT INTO auth.users (
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    phone,
    email_confirmed_at,
    phone_confirmed_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_sso_user,
    deleted_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', -- Default instance_id
    'authenticated',
    'authenticated',
    NEW.phone_number || '@deepthischool.edu', -- Dummy email
    crypt(NEW.login_code, gen_salt('bf')), -- Hash the login_code as password
    NEW.phone_number,
    NOW(),
    NOW(), -- Mark phone as confirmed
    NOW(),
    jsonb_build_object('provider', 'phone', 'providers', '{"phone"}'),
    jsonb_build_object('full_name', NEW.name, 'role', NEW.role),
    false,
    NULL
  ) RETURNING id INTO auth_user_id;

  -- Update the public.users table with the auth.users ID
  UPDATE public.users
  SET id = auth_user_id
  WHERE phone_number = NEW.phone_number;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to call the function after insert on public.users
CREATE OR REPLACE TRIGGER create_auth_user_trigger
AFTER INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION create_auth_user();

-- Create a function to update auth.users when public.users is updated
CREATE OR REPLACE FUNCTION update_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Update auth.users email and password if phone_number or login_code changes
  IF OLD.phone_number IS DISTINCT FROM NEW.phone_number OR OLD.login_code IS DISTINCT FROM NEW.login_code THEN
    UPDATE auth.users
    SET
      email = NEW.phone_number || '@deepthischool.edu',
      phone = NEW.phone_number,
      encrypted_password = crypt(NEW.login_code, gen_salt('bf')),
      raw_user_meta_data = jsonb_build_object('full_name', NEW.name, 'role', NEW.role)
    WHERE id = NEW.id;
  END IF;
  
  -- Update auth.users raw_user_meta_data if name or role changes
  IF OLD.name IS DISTINCT FROM NEW.name OR OLD.role IS DISTINCT FROM NEW.role THEN
    UPDATE auth.users
    SET
      raw_user_meta_data = jsonb_build_object('full_name', NEW.name, 'role', NEW.role)
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to call the function after update on public.users
CREATE OR REPLACE TRIGGER update_auth_user_trigger
AFTER UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION update_auth_user();

-- Create a function to delete user from auth.users when deleted from public.users
CREATE OR REPLACE FUNCTION delete_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM auth.users
  WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to call the function after delete on public.users
CREATE OR REPLACE TRIGGER delete_auth_user_trigger
AFTER DELETE ON public.users
FOR EACH ROW
EXECUTE FUNCTION delete_auth_user();