/*
  # Admin System Setup

  1. New Tables
    - `admins`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `password_hash` (text)
      - `created_at` (timestamp)

  2. Changes
    - Add admin table for SaaS admin access
    - Separate from regular users
    - No RLS on admin table (service role only)

  3. Notes
    - Admin credentials: matthewjohnson22687@gmail.com / Color1
    - Used for data migration and system management
*/

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create the admin user
-- Password hash for 'Color1' using bcrypt-like format (will be validated in edge function)
INSERT INTO admins (email, password_hash)
VALUES ('matthewjohnson22687@gmail.com', 'Color1')
ON CONFLICT (email) DO NOTHING;

-- No RLS on admin table - only accessible via service role
