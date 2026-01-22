/*
  # Recreate Increment Functions for View and Share Counts

  1. Changes
    - Drop and recreate increment functions with consistent naming
    - `increment_view_count(item_id)` - Atomically increments view count
    - `increment_shares_count(item_id)` - Atomically increments shares count
  
  2. Purpose
    - Provide atomic increment operations for tracking
    - Prevent race conditions
  
  3. Security
    - Functions are public (anyone can increment)
    - View count only increments for public items
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS increment_shares_count(uuid);
DROP FUNCTION IF EXISTS increment_view_count(uuid);

-- Function to increment view count (only for public items)
CREATE OR REPLACE FUNCTION increment_view_count(item_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE items
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = item_id AND is_public = true;
END;
$$;

-- Function to increment shares count
CREATE OR REPLACE FUNCTION increment_shares_count(item_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE items
  SET shares_count = COALESCE(shares_count, 0) + 1
  WHERE id = item_id;
END;
$$;