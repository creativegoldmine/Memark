/*
  # Add Public Profiles and Sharing System

  1. New Tables
    - `profiles`
      - `user_id` (uuid, primary key, foreign key to users)
      - `username` (text, unique, lowercase)
      - `bio` (text, optional)
      - `avatar_url` (text, optional)
      - `is_public` (boolean, default false)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `referrals`
      - `id` (uuid, primary key)
      - `referrer_user_id` (uuid, foreign key to users)
      - `referred_user_id` (uuid, foreign key to users, nullable)
      - `referral_code` (text, unique)
      - `status` (text: 'pending', 'completed', 'rewarded')
      - `reward_amount` (integer, default 0)
      - `created_at` (timestamptz)
      - `completed_at` (timestamptz, nullable)

  2. Schema Changes
    - Add `is_public` column to items table
    - Add `public_profile_enabled` to users table
    - Add `referral_code` to users table

  3. Security
    - Enable RLS on all new tables
    - Profiles: Public read if is_public = true, owner can update
    - Items: Public read if is_public = true, owner can update
    - Referrals: Users can only view their own referrals

  4. Indexes
    - Index on profiles.username for fast lookups
    - Index on items.is_public for public feed queries
    - Index on referrals.referral_code for quick lookups
*/

-- Add columns to existing tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'is_public'
  ) THEN
    ALTER TABLE items ADD COLUMN is_public BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'public_profile_enabled'
  ) THEN
    ALTER TABLE users ADD COLUMN public_profile_enabled BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'referral_code'
  ) THEN
    ALTER TABLE users ADD COLUMN referral_code TEXT UNIQUE;
  END IF;
END $$;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  bio TEXT DEFAULT '',
  avatar_url TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 30),
  CONSTRAINT username_format CHECK (username ~* '^[a-z0-9_]+$')
);

-- Create referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  referral_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded')),
  reward_amount INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_is_public ON profiles(is_public);
CREATE INDEX IF NOT EXISTS idx_items_is_public ON items(is_public);
CREATE INDEX IF NOT EXISTS idx_items_user_public ON items(user_id, is_public);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_user_id);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile"
  ON profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Items RLS Policies (add to existing policies)
CREATE POLICY "Public items are viewable by everyone"
  ON items FOR SELECT
  USING (is_public = true);

-- Referrals RLS Policies
CREATE POLICY "Users can view their own referrals"
  ON referrals FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_user_id);

CREATE POLICY "Users can insert their own referrals"
  ON referrals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = referrer_user_id);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  done BOOLEAN := false;
BEGIN
  WHILE NOT done LOOP
    code := upper(substring(md5(random()::text) from 1 for 8));
    IF NOT EXISTS (SELECT 1 FROM referrals WHERE referral_code = code) THEN
      done := true;
    END IF;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to generate username from user data
CREATE OR REPLACE FUNCTION generate_unique_username(base_name TEXT)
RETURNS TEXT AS $$
DECLARE
  username TEXT;
  counter INTEGER := 0;
  done BOOLEAN := false;
BEGIN
  -- Clean the base name
  username := lower(regexp_replace(base_name, '[^a-z0-9_]', '', 'g'));
  username := substring(username from 1 for 20);
  
  -- If empty or too short, use 'user'
  IF char_length(username) < 3 THEN
    username := 'user';
  END IF;
  
  -- Try to find unique username
  WHILE NOT done LOOP
    IF counter = 0 THEN
      IF NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.username = username) THEN
        done := true;
      END IF;
    ELSE
      username := substring(username from 1 for 25) || counter::text;
      IF NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.username = username) THEN
        done := true;
      END IF;
    END IF;
    counter := counter + 1;
    
    -- Safety check
    IF counter > 9999 THEN
      username := 'user' || floor(random() * 1000000)::text;
      done := true;
    END IF;
  END LOOP;
  
  RETURN username;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create profile when user signs up
CREATE OR REPLACE FUNCTION create_profile_for_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  new_username TEXT;
BEGIN
  -- Try to get username from metadata or email
  base_username := COALESCE(
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1),
    'user'
  );
  
  -- Generate unique username
  new_username := generate_unique_username(base_username);
  
  -- Create profile
  INSERT INTO profiles (user_id, username, is_public)
  VALUES (NEW.id, new_username, false);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created_create_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_create_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_for_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger to profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
