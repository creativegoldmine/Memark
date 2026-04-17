/*
  # Add Article Full-Text Extraction Storage

  Adds columns so Memark can store the readable body of saved articles.
  This powers offline reading and preserves content if source URLs go dead.

  1. Changes to `items`
    - `full_text` (text, nullable) - Clean extracted article body
    - `reading_time_minutes` (int, nullable) - Estimated read time
    - `extracted_at` (timestamptz, nullable) - When extraction ran
    - `extraction_status` (text, default 'pending') - pending | success | failed | skipped
    - `word_count` (int, nullable) - Word count of extracted text

  2. Security
    - No RLS changes needed; existing item policies already protect these rows.

  3. Notes
    - All columns are additive and nullable - safe for existing data.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'full_text'
  ) THEN
    ALTER TABLE items ADD COLUMN full_text text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'reading_time_minutes'
  ) THEN
    ALTER TABLE items ADD COLUMN reading_time_minutes integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'extracted_at'
  ) THEN
    ALTER TABLE items ADD COLUMN extracted_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'extraction_status'
  ) THEN
    ALTER TABLE items ADD COLUMN extraction_status text DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'word_count'
  ) THEN
    ALTER TABLE items ADD COLUMN word_count integer;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_items_extraction_status ON items(extraction_status) WHERE extraction_status = 'pending';
