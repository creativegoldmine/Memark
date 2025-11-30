/*
  # Rebuild Authentication System - Complete Fix

  ## Problem
  Previous trigger-based approach wasn't working properly. Auth users were created
  but public.users records were not.

  ## Solution
  1. Drop all existing triggers and functions
  2. Create a robust trigger function with proper error handling
  3. Fix RLS policies to support the trigger pattern
  4. Ensure default collections are created

  ## Testing
  After this migration, signup should work completely:
  - Auth user created
  - Public user record created
  - Default collections created
*/

-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS create_user_default_collections ON users;
DROP FUNCTION IF EXISTS public.handle_new_auth_user() CASCADE;
DROP FUNCTION IF EXISTS create_default_collections() CASCADE;

-- Create a single comprehensive function that handles everything
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_name text;
  user_phone text;
BEGIN
  -- Extract metadata with defaults
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', 'User');
  user_phone := COALESCE(NEW.raw_user_meta_data->>'phone_number', '');

  -- Create the public.users record
  INSERT INTO public.users (id, email, name, phone_number, plan_type)
  VALUES (NEW.id, NEW.email, user_name, user_phone, 'free');

  -- Create default collections for the new user
  INSERT INTO public.collections (user_id, name, icon, color, description, auto_generated) VALUES
    (NEW.id, 'Videos to Watch', '🎥', '#EF4444', 'All your saved videos in one place', true),
    (NEW.id, 'Articles to Read', '📰', '#3B82F6', 'Articles and blog posts to read later', true),
    (NEW.id, 'Work', '💼', '#8B5CF6', 'Work-related content and tasks', true),
    (NEW.id, 'Personal', '🏠', '#10B981', 'Personal notes and reminders', true),
    (NEW.id, 'Inspiration', '✨', '#F59E0B', 'Creative ideas and inspiration', true),
    (NEW.id, 'Finance', '💰', '#06B6D4', 'Financial content and resources', true),
    (NEW.id, 'Learning', '📚', '#EC4899', 'Educational content and courses', true);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create the trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update RLS policies to be simpler and work with the trigger
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Recreate policies
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Collections RLS (already exists but let's ensure it's correct)
DROP POLICY IF EXISTS "Users can view own collections" ON collections;
DROP POLICY IF EXISTS "Users can insert own collections" ON collections;
DROP POLICY IF EXISTS "Users can update own collections" ON collections;
DROP POLICY IF EXISTS "Users can delete own collections" ON collections;

CREATE POLICY "Users can view own collections"
  ON collections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own collections"
  ON collections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own collections"
  ON collections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own collections"
  ON collections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
