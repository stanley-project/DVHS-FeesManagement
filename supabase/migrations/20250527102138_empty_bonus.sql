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

<<<<<<< HEAD
-- Create function to create auth user
CREATE OR REPLACE FUNCTION create_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  auth_uid uuid;
BEGIN
  -- Create user in auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
=======
-- Create a function to create a user in auth.users when a new user is inserted into public.users
CREATE OR REPLACE FUNCTION create_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  auth_user_id UUID;
BEGIN
  -- Create a user in auth.users with the phone number as email and login_code as password
  INSERT INTO auth.users (
    instance_id,
>>>>>>> fees_source/main
    aud,
    role,
    email,
    encrypted_password,
<<<<<<< HEAD
    email_confirmed_at,
    phone,
    phone_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change_token_current,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    is_sso_user,
    deleted_at
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',  -- instance_id
    NEW.id,                                   -- id (use same ID as public.users)
    'authenticated',                          -- aud
    NEW.role::text,                          -- role
    NEW.email,                               -- email
    '',                                      -- encrypted_password (empty for phone auth)
    NULL,                                    -- email_confirmed_at
    NEW.phone_number,                        -- phone
    NOW(),                                   -- phone_confirmed_at (auto-confirm for admin creation)
    NEW.created_at,                          -- created_at
    NEW.updated_at,                          -- updated_at
    '',                                      -- confirmation_token
    '',                                      -- recovery_token
    '',                                      -- email_change_token_new
    '',                                      -- email_change_token_current
    NULL,                                    -- last_sign_in_at
    jsonb_build_object(                      -- raw_app_meta_data
      'provider', 'phone',
      'providers', ARRAY['phone']
    ),
    jsonb_build_object(                      -- raw_user_meta_data
      'name', NEW.name,
      'role', NEW.role
    ),
    false,                                   -- is_super_admin
    false,                                   -- is_sso_user
    NULL                                     -- deleted_at
  )
  RETURNING id INTO auth_uid;

  -- Create entry in auth.identities
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    auth_uid,                                -- id (same as user_id)
    auth_uid,                                -- user_id
    jsonb_build_object(                      -- identity_data
      'phone', NEW.phone_number,
      'sub', auth_uid
    ),
    'phone',                                 -- provider
    NULL,                                    -- last_sign_in_at
    NEW.created_at,                          -- created_at
    NEW.updated_at                           -- updated_at
  );
=======
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
>>>>>>> fees_source/main

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

<<<<<<< HEAD
-- Create trigger to automatically create auth user
DROP TRIGGER IF EXISTS create_auth_user_trigger ON users;
CREATE TRIGGER create_auth_user_trigger
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_auth_user();
=======
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
>>>>>>> fees_source/main
