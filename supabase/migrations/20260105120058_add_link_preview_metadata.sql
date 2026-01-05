/*
  # Add Link Preview Metadata Fields to Items Table

  1. New Columns Added to `items` table
    - `og_title` (text) - Open Graph title from link preview
    - `og_description` (text) - Open Graph description from link preview
    - `og_image` (text) - Open Graph image URL from link preview
    - `og_site_name` (text) - Site name from link preview
    - `og_url` (text) - Canonical URL from Open Graph
    - `og_type` (text) - Content type (article, video, etc.)
    - `og_author` (text) - Author name if available
    - `og_published_time` (timestamptz) - Published date if available

  2. Purpose
    - Enable rich social preview cards for links
    - Display beautiful previews with images and descriptions
    - Improve visual presentation of saved links

  3. Default Values
    - All fields default to null (will be populated when available)
*/

-- Add Open Graph metadata columns to items table
DO $$
BEGIN
  -- Add og_title field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'og_title'
  ) THEN
    ALTER TABLE items ADD COLUMN og_title text;
  END IF;

  -- Add og_description field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'og_description'
  ) THEN
    ALTER TABLE items ADD COLUMN og_description text;
  END IF;

  -- Add og_image field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'og_image'
  ) THEN
    ALTER TABLE items ADD COLUMN og_image text;
  END IF;

  -- Add og_site_name field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'og_site_name'
  ) THEN
    ALTER TABLE items ADD COLUMN og_site_name text;
  END IF;

  -- Add og_url field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'og_url'
  ) THEN
    ALTER TABLE items ADD COLUMN og_url text;
  END IF;

  -- Add og_type field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'og_type'
  ) THEN
    ALTER TABLE items ADD COLUMN og_type text;
  END IF;

  -- Add og_author field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'og_author'
  ) THEN
    ALTER TABLE items ADD COLUMN og_author text;
  END IF;

  -- Add og_published_time field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'og_published_time'
  ) THEN
    ALTER TABLE items ADD COLUMN og_published_time timestamptz;
  END IF;
END $$;

-- Create index on og_image for faster queries (useful for displaying image previews)
CREATE INDEX IF NOT EXISTS idx_items_og_image ON items(og_image) WHERE og_image IS NOT NULL;

-- Create index on og_site_name for grouping by site
CREATE INDEX IF NOT EXISTS idx_items_og_site_name ON items(og_site_name);
