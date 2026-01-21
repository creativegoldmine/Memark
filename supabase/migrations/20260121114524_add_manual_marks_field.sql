/*
  # Add Manual Marks Support

  1. Changes
    - Add `is_manual` boolean field to items table
    - Default to false for existing SMS/share-sheet items
    - Manual marks created via app UI will set this to true

  2. Purpose
    - Allow filtering between auto-captured marks and manually created ones
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'is_manual'
  ) THEN
    ALTER TABLE items ADD COLUMN is_manual boolean DEFAULT false;
  END IF;
END $$;