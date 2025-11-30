/*
  # Fix User Insert Policy

  ## Problem
  New users cannot create their user record because there's no INSERT policy.

  ## Solution
  Add an INSERT policy that allows authenticated users to create their own record.
*/

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Allow authenticated users to insert their own record
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
