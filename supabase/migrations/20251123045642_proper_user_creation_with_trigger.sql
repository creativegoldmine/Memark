/*
  # Proper User Creation System

  ## Problem
  Manual user record creation after auth signup is error-prone and can fail,
  leaving users in a partial state.

  ## Solution
  Use a database trigger that automatically creates the user profile when
  a new auth.users record is created. This is the standard Supabase pattern.

  ## Changes
  1. Drop the existing manual insert approach policies
  2. Create a trigger function that runs on auth.users insert
  3. Function creates the public.users record automatically
  4. Update RLS policies to allow this pattern
*/

-- Drop existing INSERT policy since we'll use a trigger instead
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, phone_number)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Allow service role to manage users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
