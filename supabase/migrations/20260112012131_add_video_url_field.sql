/*
  # Add video URL support for social media previews
  
  1. Changes
    - Add `video_url` field to items table to store direct video URLs from X/Twitter and other platforms
    - This enables displaying video thumbnails with playback capability in ItemCard
  
  2. Security
    - No RLS changes needed (inherits from items table)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'video_url'
  ) THEN
    ALTER TABLE items ADD COLUMN video_url text;
  END IF;
END $$;