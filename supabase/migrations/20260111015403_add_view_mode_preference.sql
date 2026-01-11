/*
  # Add View Mode Preference to Users

  1. Changes
    - Add `view_mode` column to users table to store list/grid preference
    - Default to 'list' view
    - Allow users to persist their view preference

  2. Security
    - Users can only update their own view_mode
    - RLS policies already in place for users table
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'view_mode'
  ) THEN
    ALTER TABLE users ADD COLUMN view_mode text DEFAULT 'list' CHECK (view_mode IN ('list', 'grid'));
  END IF;
END $$;
