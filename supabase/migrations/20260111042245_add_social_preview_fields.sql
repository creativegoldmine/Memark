/*
  # Add Social Preview Fields for Enhanced Link Sharing

  1. Schema Changes
    - Add `preview_title` to items table (for social preview card titles)
    - Add `preview_desc` to items table (for social preview descriptions)
    - Add `preview_image_url` to items table (for social preview thumbnails)
    - Add `preview_fetched_at` to items table (timestamp when preview was fetched)
    - Add `embed_type` to items table (youtube, twitter, instagram, tiktok, generic)
    - Add `embed_html` to items table (for oEmbed HTML content)

  2. Purpose
    - Enable rich social previews for links (like Facebook/Twitter cards)
    - Store fetched metadata separately from OG tags for flexibility
    - Support oEmbed content for platforms like Twitter/YouTube
    - Track when previews were fetched for cache invalidation

  3. Security
    - No RLS changes needed (inherits from items table policies)
    - Fields are nullable (legacy items won't break)
*/

-- Add preview fields to items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'preview_title'
  ) THEN
    ALTER TABLE items ADD COLUMN preview_title TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'preview_desc'
  ) THEN
    ALTER TABLE items ADD COLUMN preview_desc TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'preview_image_url'
  ) THEN
    ALTER TABLE items ADD COLUMN preview_image_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'preview_fetched_at'
  ) THEN
    ALTER TABLE items ADD COLUMN preview_fetched_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'embed_type'
  ) THEN
    ALTER TABLE items ADD COLUMN embed_type TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'embed_html'
  ) THEN
    ALTER TABLE items ADD COLUMN embed_html TEXT;
  END IF;
END $$;

-- Create index for faster preview queries
CREATE INDEX IF NOT EXISTS idx_items_preview_image ON items(preview_image_url) WHERE preview_image_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_items_embed_type ON items(embed_type) WHERE embed_type IS NOT NULL;

-- Function to backfill preview fields from OG data (optional migration helper)
CREATE OR REPLACE FUNCTION backfill_preview_from_og()
RETURNS void AS $$
BEGIN
  UPDATE items
  SET
    preview_title = COALESCE(preview_title, og_title, title),
    preview_desc = COALESCE(preview_desc, og_description, summary),
    preview_image_url = COALESCE(preview_image_url, og_image, image_preview)
  WHERE
    (preview_title IS NULL OR preview_desc IS NULL OR preview_image_url IS NULL)
    AND (og_title IS NOT NULL OR og_description IS NOT NULL OR og_image IS NOT NULL);
END;
$$ LANGUAGE plpgsql;

-- Run backfill (comment out if you don't want to run immediately)
SELECT backfill_preview_from_og();
