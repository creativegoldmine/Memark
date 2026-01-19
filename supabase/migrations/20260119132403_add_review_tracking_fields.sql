/*
  # Add Review Tracking System
  
  1. New Columns on items table
    - `last_reviewed_at` (timestamptz) - When the item was last reviewed by user
    - `is_archived` (boolean) - Whether item is archived (hidden from main feed)
    - `review_count` (integer) - How many times item has been reviewed
    - `is_starred` (boolean) - User-marked as important/favorite
  
  2. New Columns on users table
    - `daily_review_goal` (integer) - Target items to review per day
    - `review_streak` (integer) - Consecutive days with reviews
    - `last_review_date` (date) - Last date user reviewed items
    - `total_items_reviewed` (integer) - Lifetime count of reviewed items
  
  3. New Table: review_history
    - Tracks individual review actions for analytics
    - Links to items and users
    - Records action type (viewed, archived, starred, etc.)
  
  4. Security
    - RLS enabled on review_history
    - Users can only see their own review history
*/

-- Add review tracking columns to items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'last_reviewed_at'
  ) THEN
    ALTER TABLE items ADD COLUMN last_reviewed_at timestamptz DEFAULT NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'is_archived'
  ) THEN
    ALTER TABLE items ADD COLUMN is_archived boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'review_count'
  ) THEN
    ALTER TABLE items ADD COLUMN review_count integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'is_starred'
  ) THEN
    ALTER TABLE items ADD COLUMN is_starred boolean DEFAULT false;
  END IF;
END $$;

-- Add review preference columns to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'daily_review_goal'
  ) THEN
    ALTER TABLE users ADD COLUMN daily_review_goal integer DEFAULT 10;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'review_streak'
  ) THEN
    ALTER TABLE users ADD COLUMN review_streak integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_review_date'
  ) THEN
    ALTER TABLE users ADD COLUMN last_review_date date DEFAULT NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'total_items_reviewed'
  ) THEN
    ALTER TABLE users ADD COLUMN total_items_reviewed integer DEFAULT 0;
  END IF;
END $$;

-- Create review_history table for tracking individual review actions
CREATE TABLE IF NOT EXISTS review_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  item_id uuid NOT NULL REFERENCES items(id),
  action_type text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_items_last_reviewed_at ON items(last_reviewed_at);
CREATE INDEX IF NOT EXISTS idx_items_is_archived ON items(is_archived);
CREATE INDEX IF NOT EXISTS idx_items_is_starred ON items(is_starred);
CREATE INDEX IF NOT EXISTS idx_items_review_count ON items(review_count);
CREATE INDEX IF NOT EXISTS idx_review_history_user_id ON review_history(user_id);
CREATE INDEX IF NOT EXISTS idx_review_history_item_id ON review_history(item_id);
CREATE INDEX IF NOT EXISTS idx_review_history_created_at ON review_history(created_at);

-- Enable RLS on review_history
ALTER TABLE review_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for review_history
CREATE POLICY "Users can view own review history"
  ON review_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own review history"
  ON review_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own review history"
  ON review_history
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);