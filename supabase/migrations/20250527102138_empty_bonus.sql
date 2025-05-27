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
    aud,
    role,
    email,
    encrypted_password,
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create auth user
DROP TRIGGER IF EXISTS create_auth_user_trigger ON users;
CREATE TRIGGER create_auth_user_trigger
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_auth_user();