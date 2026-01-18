/*
  # Enhanced Content Ingestion System

  1. New Fields Added to Items Table
    - `media_urls` (jsonb): Array of all media URLs from MMS messages
    - `media_count` (integer): Quick count of media items for filtering
    - `media_storage_paths` (jsonb): Paths to stored media in Supabase Storage
    - `thumbnail_urls` (jsonb): Generated thumbnail URLs for performance
    - `content_classification` (text): Type classification (text_only, text_with_photo, link_only, social_post, etc.)
    - `ingestion_source` (text): Where content came from (sms, ios_share, android_share, web, api)
    - `processing_status` (text): Current processing state (pending, processing, completed, failed)
    - `processing_error` (text): Error details for debugging
    - `carousel_images` (jsonb): Instagram carousels, Twitter image grids
    - `video_metadata` (jsonb): Duration, quality, codec for videos
    - `api_version` (text): Track which API version was used

  2. Performance Indexes
    - Index on media_count for filtering
    - Index on platform_type for platform-specific queries
    - Index on processing_status for monitoring
    - Index on content_classification for filtering

  3. Security
    - Maintains existing RLS policies (inherited from table)
    - No new policies needed as these are additional columns
*/

-- Add new fields for enhanced content ingestion
DO $$
BEGIN
  -- Multi-media support
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'media_urls') THEN
    ALTER TABLE items ADD COLUMN media_urls jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'media_count') THEN
    ALTER TABLE items ADD COLUMN media_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'media_storage_paths') THEN
    ALTER TABLE items ADD COLUMN media_storage_paths jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'thumbnail_urls') THEN
    ALTER TABLE items ADD COLUMN thumbnail_urls jsonb DEFAULT '[]'::jsonb;
  END IF;

  -- Content classification
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'content_classification') THEN
    ALTER TABLE items ADD COLUMN content_classification text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'ingestion_source') THEN
    ALTER TABLE items ADD COLUMN ingestion_source text DEFAULT 'sms';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'processing_status') THEN
    ALTER TABLE items ADD COLUMN processing_status text DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'processing_error') THEN
    ALTER TABLE items ADD COLUMN processing_error text;
  END IF;

  -- Platform-specific enhancements
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'carousel_images') THEN
    ALTER TABLE items ADD COLUMN carousel_images jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'video_metadata') THEN
    ALTER TABLE items ADD COLUMN video_metadata jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'api_version') THEN
    ALTER TABLE items ADD COLUMN api_version text;
  END IF;
END $$;

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_items_media_count ON items(media_count) WHERE media_count > 0;
CREATE INDEX IF NOT EXISTS idx_items_platform_type ON items(platform_type) WHERE platform_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_items_processing_status ON items(processing_status);
CREATE INDEX IF NOT EXISTS idx_items_content_classification ON items(content_classification);
CREATE INDEX IF NOT EXISTS idx_items_ingestion_source ON items(ingestion_source);

-- Create composite index for feed queries (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_items_user_status_created ON items(user_id, status, created_at DESC) WHERE is_archived = false;

-- Add comment explaining the new structure
COMMENT ON COLUMN items.media_urls IS 'Array of all media URLs from MMS or direct shares';
COMMENT ON COLUMN items.media_count IS 'Number of media items for quick filtering';
COMMENT ON COLUMN items.content_classification IS 'Classification: text_only, text_with_photo, link_only, link_with_text, link_with_photo, social_post, direct_share';
COMMENT ON COLUMN items.processing_status IS 'Processing state: pending, processing, completed, failed';
COMMENT ON COLUMN items.carousel_images IS 'Array of images for Instagram carousels or Twitter media grids';
