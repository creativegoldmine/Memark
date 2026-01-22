/*
  # Add Shares Count Field for Public Sharing

  1. Changes
    - Add `shares_count` integer field to items table (default 0)
    - Add index on `is_public` for faster public queries
    - Add index on `shares_count` for sorting by popularity
  
  2. Purpose
    - Track how many times each item has been shared publicly
    - Enable sorting items by popularity (shares + views)
    - Optimize queries for public posts
  
  3. Security
    - No RLS changes needed (existing policies handle is_public)
*/

-- Add shares_count field to items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'shares_count'
  ) THEN
    ALTER TABLE items ADD COLUMN shares_count integer DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- Add index on is_public for faster public queries
CREATE INDEX IF NOT EXISTS idx_items_is_public ON items(is_public) WHERE is_public = true;

-- Add index on shares_count for sorting by popularity
CREATE INDEX IF NOT EXISTS idx_items_shares_count ON items(shares_count DESC);

-- Add composite index for public items sorted by shares
CREATE INDEX IF NOT EXISTS idx_items_public_shares ON items(is_public, shares_count DESC) WHERE is_public = true;