/*
  # Add Native Social Embed Support

  1. Changes to items table
    - Add `embed_metadata` (jsonb) - Store complete oEmbed response data (thumbnail, author, width, height, provider info)
    - Add `embed_fetched_at` (timestamptz) - Track when embed HTML was last fetched for cache invalidation
    - Add `embed_error` (text) - Store error messages if oEmbed fetch fails for debugging
    - Add `platform_type` (text) - Already exists but ensure it's being used consistently
    
  2. Purpose
    - Enable native social media embeds (Twitter, Instagram, TikTok, Facebook, YouTube, Vimeo)
    - Store complete oEmbed API responses for rich interactive content
    - Track fetch status and errors for better reliability
    - Support cache invalidation and refresh workflows
    
  3. Notes
    - embed_html field already exists in items table (added in previous migrations)
    - This migration adds supporting metadata fields for robust embed handling
    - No RLS changes needed - embed data follows same user_id security as parent item
*/

-- Add embed metadata fields to items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'items' AND column_name = 'embed_metadata'
  ) THEN
    ALTER TABLE items ADD COLUMN embed_metadata jsonb DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'items' AND column_name = 'embed_fetched_at'
  ) THEN
    ALTER TABLE items ADD COLUMN embed_fetched_at timestamptz DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'items' AND column_name = 'embed_error'
  ) THEN
    ALTER TABLE items ADD COLUMN embed_error text DEFAULT NULL;
  END IF;
END $$;

-- Create index on platform_type for efficient filtering
CREATE INDEX IF NOT EXISTS idx_items_platform_type ON items(platform_type) WHERE platform_type IS NOT NULL;

-- Create index on embed_fetched_at for refresh workflows
CREATE INDEX IF NOT EXISTS idx_items_embed_fetched_at ON items(embed_fetched_at) WHERE embed_fetched_at IS NOT NULL;

-- Add comment explaining the embed_metadata structure
COMMENT ON COLUMN items.embed_metadata IS 'Complete oEmbed API response including: thumbnail_url, author_name, author_url, provider_name, provider_url, width, height, html, type, version';

COMMENT ON COLUMN items.embed_fetched_at IS 'Timestamp when embed HTML was last fetched from platform oEmbed API. Used for cache invalidation (refresh after 24-48 hours).';

COMMENT ON COLUMN items.embed_error IS 'Error message if oEmbed fetch failed. Examples: rate_limit, content_deleted, private_content, api_error. Helps debug platform-specific issues.';