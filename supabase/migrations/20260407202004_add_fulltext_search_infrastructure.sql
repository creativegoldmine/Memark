/*
  # Add Full-Text Search Infrastructure

  1. Extensions
    - Enable `pg_trgm` for fuzzy/trigram text matching
    - Enable `unaccent` for accent-insensitive search

  2. Changes to `items` table
    - Add `search_vector` (tsvector) column for combined full-text search
    - Column combines: title, summary, raw_content, tags, content_topics,
      category, semantic_category, og_title, og_description, og_site_name,
      author_name, user_notes, preview_title, preview_desc, thread_preview

  3. Indexes
    - GIN index on `search_vector` for fast full-text search
    - GIN trigram index on `raw_content` for fuzzy substring matching
    - GIN trigram index on `title` for fuzzy title matching

  4. Trigger
    - Auto-updates `search_vector` on every INSERT and UPDATE
    - Ensures old and new items always have up-to-date search vectors

  5. Backfill
    - Updates all existing items to populate `search_vector`
*/

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'search_vector'
  ) THEN
    ALTER TABLE items ADD COLUMN search_vector tsvector;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION items_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.og_title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.preview_title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.og_description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.preview_desc, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.user_notes, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.raw_content, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.thread_preview, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.category, '')), 'D') ||
    setweight(to_tsvector('english', coalesce(NEW.semantic_category, '')), 'D') ||
    setweight(to_tsvector('english', coalesce(NEW.og_site_name, '')), 'D') ||
    setweight(to_tsvector('english', coalesce(NEW.author_name, '')), 'D') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.tags, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.content_topics, ' '), '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS items_search_vector_trigger ON items;
CREATE TRIGGER items_search_vector_trigger
  BEFORE INSERT OR UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION items_search_vector_update();

CREATE INDEX IF NOT EXISTS idx_items_search_vector ON items USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_items_raw_content_trgm ON items USING gin(raw_content gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_items_title_trgm ON items USING gin(title gin_trgm_ops);

UPDATE items SET search_vector =
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(og_title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(preview_title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(og_description, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(preview_desc, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(user_notes, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(raw_content, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(thread_preview, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(category, '')), 'D') ||
  setweight(to_tsvector('english', coalesce(semantic_category, '')), 'D') ||
  setweight(to_tsvector('english', coalesce(og_site_name, '')), 'D') ||
  setweight(to_tsvector('english', coalesce(author_name, '')), 'D') ||
  setweight(to_tsvector('english', coalesce(array_to_string(tags, ' '), '')), 'B') ||
  setweight(to_tsvector('english', coalesce(array_to_string(content_topics, ' '), '')), 'B')
WHERE search_vector IS NULL;
