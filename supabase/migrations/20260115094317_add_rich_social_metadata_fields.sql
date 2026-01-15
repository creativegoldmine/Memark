/*
  # Add Rich Social Metadata Fields

  1. New Fields
    - `author_name` (text): Name of the content author (for Twitter, YouTube, etc.)
    - `author_avatar` (text): URL to the author's avatar image
    - `platform_type` (text): Platform identifier (youtube, twitter, instagram, tiktok, etc.)
    - `embed_html` (text): HTML embed code for rich previews (web platform)
    - `content_duration` (text): Duration for video/audio content (e.g., "5:30")
    - `published_date` (timestamptz): When the content was originally published
    
  2. Changes
    - Add columns to `items` table for rich social preview data
    - These fields enhance the existing preview system with platform-specific metadata
    - Allows ItemCard to display platform-native previews (YouTube thumbnails, Twitter avatars, etc.)
    
  3. Security
    - No RLS changes needed (inherits from items table)
    - Fields are optional and nullable
*/

-- Add rich social metadata fields to items table
DO $$
BEGIN
  -- Add author_name column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'items' AND column_name = 'author_name'
  ) THEN
    ALTER TABLE items ADD COLUMN author_name text;
  END IF;

  -- Add author_avatar column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'items' AND column_name = 'author_avatar'
  ) THEN
    ALTER TABLE items ADD COLUMN author_avatar text;
  END IF;

  -- Add platform_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'items' AND column_name = 'platform_type'
  ) THEN
    ALTER TABLE items ADD COLUMN platform_type text;
  END IF;

  -- Add embed_html column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'items' AND column_name = 'embed_html'
  ) THEN
    ALTER TABLE items ADD COLUMN embed_html text;
  END IF;

  -- Add content_duration column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'items' AND column_name = 'content_duration'
  ) THEN
    ALTER TABLE items ADD COLUMN content_duration text;
  END IF;

  -- Add published_date column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'items' AND column_name = 'published_date'
  ) THEN
    ALTER TABLE items ADD COLUMN published_date timestamptz;
  END IF;
END $$;

-- Create index on platform_type for filtering
CREATE INDEX IF NOT EXISTS idx_items_platform_type ON items(platform_type);

-- Create index on published_date for sorting
CREATE INDEX IF NOT EXISTS idx_items_published_date ON items(published_date);
