/*
  # Add Metadata Fields to Items Table

  1. New Columns Added to `items` table
    - `priority` (text) - Priority level: low, medium, high, urgent
    - `importance` (text) - Importance marker: normal, important, extremely_important
    - `user_notes` (text) - User-provided context and notes for better categorization
    - `content_type` (text) - Content classification: educational, work, personal, entertainment, etc.
    - `needs_review` (boolean) - Flag to mark items that need review
    - `review_alert_date` (timestamptz) - Optional date to alert user for review

  2. Purpose
    - Enable users to provide context when saving items
    - Improve AI categorization with user-provided metadata
    - Support priority and importance markers
    - Add review alerts and flags

  3. Default Values
    - priority: 'medium'
    - importance: 'normal'
    - needs_review: false
    - user_notes: null (optional)
    - content_type: null (will be auto-detected or user-provided)
    - review_alert_date: null (optional)
*/

-- Add new metadata columns to items table
DO $$
BEGIN
  -- Add priority field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'priority'
  ) THEN
    ALTER TABLE items ADD COLUMN priority text DEFAULT 'medium'
      CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
  END IF;

  -- Add importance field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'importance'
  ) THEN
    ALTER TABLE items ADD COLUMN importance text DEFAULT 'normal'
      CHECK (importance IN ('normal', 'important', 'extremely_important'));
  END IF;

  -- Add user_notes field for custom context
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'user_notes'
  ) THEN
    ALTER TABLE items ADD COLUMN user_notes text;
  END IF;

  -- Add content_type field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'content_type'
  ) THEN
    ALTER TABLE items ADD COLUMN content_type text;
  END IF;

  -- Add needs_review flag
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'needs_review'
  ) THEN
    ALTER TABLE items ADD COLUMN needs_review boolean DEFAULT false;
  END IF;

  -- Add review_alert_date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'review_alert_date'
  ) THEN
    ALTER TABLE items ADD COLUMN review_alert_date timestamptz;
  END IF;
END $$;

-- Create index on priority for faster filtering
CREATE INDEX IF NOT EXISTS idx_items_priority ON items(priority);

-- Create index on importance for faster filtering
CREATE INDEX IF NOT EXISTS idx_items_importance ON items(importance);

-- Create index on needs_review for faster filtering
CREATE INDEX IF NOT EXISTS idx_items_needs_review ON items(needs_review) WHERE needs_review = true;

-- Create index on content_type for faster filtering
CREATE INDEX IF NOT EXISTS idx_items_content_type ON items(content_type);

-- Create index on review_alert_date for reminder queries
CREATE INDEX IF NOT EXISTS idx_items_review_alert_date ON items(review_alert_date) WHERE review_alert_date IS NOT NULL;