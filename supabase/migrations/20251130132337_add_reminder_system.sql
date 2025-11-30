/*
  # Add Reminder/Check-in System

  1. New Tables
    - `reminders`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `item_id` (uuid, foreign key)
      - `reminder_date` (timestamptz) - when to remind
      - `status` (text) - pending/completed/snoozed
      - `created_at` (timestamptz)
      - `completed_at` (timestamptz, nullable)

  2. New Columns on items table
    - `last_viewed_at` (timestamptz) - track when user last opened the link
    - `view_count` (integer) - how many times viewed
    - `is_archived` (boolean) - for hiding without deleting

  3. Security
    - Enable RLS on reminders table
    - Add policies for authenticated users to manage their own reminders
*/

-- Add new columns to items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'last_viewed_at'
  ) THEN
    ALTER TABLE items ADD COLUMN last_viewed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'view_count'
  ) THEN
    ALTER TABLE items ADD COLUMN view_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'is_archived'
  ) THEN
    ALTER TABLE items ADD COLUMN is_archived boolean DEFAULT false;
  END IF;
END $$;

-- Create reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  item_id uuid REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  reminder_date timestamptz NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'snoozed')),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Enable RLS
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reminders
CREATE POLICY "Users can view own reminders"
  ON reminders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own reminders"
  ON reminders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminders"
  ON reminders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reminders"
  ON reminders FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for faster reminder queries
CREATE INDEX IF NOT EXISTS idx_reminders_user_status 
  ON reminders(user_id, status, reminder_date);

CREATE INDEX IF NOT EXISTS idx_items_last_viewed 
  ON items(user_id, last_viewed_at);
