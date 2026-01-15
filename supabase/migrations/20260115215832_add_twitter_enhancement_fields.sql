/*
  # Add Twitter/X Enhancement Fields for Rich Social Previews

  1. New Fields
    - `additional_images` (jsonb): Array of additional image URLs for multi-image tweets (stores images 2-4)
    - `media_count` (integer): Total number of media items in the tweet (images + videos)
    - `is_thread` (boolean): Whether this is a Twitter thread (1/n format)
    - `thread_preview` (text): Preview text of the first 3 tweets in a thread
    - `thread_length` (integer): Total number of tweets in the thread
    - `engagement_metrics` (jsonb): Optional engagement data (likes, retweets, replies)

  2. Purpose
    - Enable multi-image tweet support (Twitter allows up to 4 images per tweet)
    - Detect and indicate thread content for better user experience
    - Store engagement metrics for relevance scoring
    - Enhance social preview cards with complete tweet context

  3. Changes
    - Add columns to `items` table for enhanced Twitter/X metadata
    - Create indexes for filtering by thread status and media presence
    - Fields are nullable to support existing data

  4. Security
    - No RLS changes needed (inherits from items table)
    - All fields are optional and nullable
*/

-- Add Twitter enhancement fields to items table
DO $$
BEGIN
  -- Add additional_images column for multi-image tweets
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'additional_images'
  ) THEN
    ALTER TABLE items ADD COLUMN additional_images jsonb DEFAULT '[]'::jsonb;
  END IF;

  -- Add media_count column to track total media items
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'media_count'
  ) THEN
    ALTER TABLE items ADD COLUMN media_count integer DEFAULT 0;
  END IF;

  -- Add is_thread column to identify Twitter threads
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'is_thread'
  ) THEN
    ALTER TABLE items ADD COLUMN is_thread boolean DEFAULT false;
  END IF;

  -- Add thread_preview column for thread content preview
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'thread_preview'
  ) THEN
    ALTER TABLE items ADD COLUMN thread_preview text;
  END IF;

  -- Add thread_length column to store thread size
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'thread_length'
  ) THEN
    ALTER TABLE items ADD COLUMN thread_length integer;
  END IF;

  -- Add engagement_metrics column for social metrics
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'engagement_metrics'
  ) THEN
    ALTER TABLE items ADD COLUMN engagement_metrics jsonb;
  END IF;
END $$;

-- Create indexes for filtering and performance
CREATE INDEX IF NOT EXISTS idx_items_is_thread ON items(is_thread) WHERE is_thread = true;
CREATE INDEX IF NOT EXISTS idx_items_media_count ON items(media_count) WHERE media_count > 0;
CREATE INDEX IF NOT EXISTS idx_items_additional_images ON items USING gin(additional_images) WHERE additional_images != '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN items.additional_images IS 'Array of additional image URLs for multi-image tweets (images 2-4)';
COMMENT ON COLUMN items.media_count IS 'Total count of media items (images + videos) in the tweet';
COMMENT ON COLUMN items.is_thread IS 'Whether this item is part of a Twitter thread';
COMMENT ON COLUMN items.thread_preview IS 'Preview text of the first 3 tweets in a thread';
COMMENT ON COLUMN items.thread_length IS 'Total number of tweets in the thread';
COMMENT ON COLUMN items.engagement_metrics IS 'Social engagement metrics (likes, retweets, replies)';
