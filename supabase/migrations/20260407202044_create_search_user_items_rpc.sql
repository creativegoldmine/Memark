/*
  # Create search_user_items RPC Function

  1. New Function
    - `search_user_items(p_user_id, p_query, p_platform, p_date_from, p_date_to, p_tags, p_limit)`
    - Performs full-text search using tsvector with ts_rank scoring
    - Falls back to trigram similarity for fuzzy matching when FTS returns no results
    - Always filters by user_id and active status
    - Supports optional platform, date range, and tag filters
    - Returns items ordered by relevance score descending

  2. Security
    - Function runs with SECURITY INVOKER so RLS policies still apply
    - Only returns items belonging to the specified user
*/

CREATE OR REPLACE FUNCTION search_user_items(
  p_user_id uuid,
  p_query text,
  p_platform text DEFAULT NULL,
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL,
  p_tags text[] DEFAULT NULL,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  raw_content text,
  type text,
  title text,
  summary text,
  tags text[],
  category text,
  image_preview text,
  media_url text,
  score integer,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  og_title text,
  og_description text,
  og_image text,
  og_site_name text,
  og_url text,
  og_type text,
  og_author text,
  og_published_time timestamptz,
  preview_title text,
  preview_desc text,
  preview_image_url text,
  embed_type text,
  embed_html text,
  video_url text,
  author_name text,
  author_avatar text,
  platform_type text,
  content_duration text,
  published_date timestamptz,
  content_topics text[],
  semantic_category text,
  additional_images jsonb,
  media_count integer,
  is_thread boolean,
  thread_preview text,
  thread_length integer,
  engagement_metrics jsonb,
  embed_metadata jsonb,
  media_urls jsonb,
  carousel_images jsonb,
  video_metadata jsonb,
  is_starred boolean,
  is_manual boolean,
  user_notes text,
  is_public boolean,
  shares_count integer,
  review_count integer,
  view_count integer,
  is_archived boolean,
  priority text,
  importance text,
  content_classification text,
  ingestion_source text,
  relevance_score real
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_tsquery tsquery;
  v_query_clean text;
  v_result_count integer;
BEGIN
  v_query_clean := trim(p_query);

  IF v_query_clean = '' OR v_query_clean IS NULL THEN
    RETURN QUERY
    SELECT
      i.id, i.user_id, i.raw_content, i.type, i.title, i.summary,
      i.tags, i.category, i.image_preview, i.media_url, i.score, i.status,
      i.created_at, i.updated_at,
      i.og_title, i.og_description, i.og_image, i.og_site_name, i.og_url,
      i.og_type, i.og_author, i.og_published_time,
      i.preview_title, i.preview_desc, i.preview_image_url,
      i.embed_type, i.embed_html, i.video_url,
      i.author_name, i.author_avatar, i.platform_type,
      i.content_duration, i.published_date,
      i.content_topics, i.semantic_category,
      i.additional_images, i.media_count, i.is_thread, i.thread_preview,
      i.thread_length, i.engagement_metrics, i.embed_metadata,
      i.media_urls, i.carousel_images, i.video_metadata,
      i.is_starred, i.is_manual, i.user_notes, i.is_public,
      i.shares_count, i.review_count, i.view_count, i.is_archived,
      i.priority, i.importance, i.content_classification, i.ingestion_source,
      0.0::real AS relevance_score
    FROM items i
    WHERE i.user_id = p_user_id
      AND i.status = 'active'
      AND i.is_archived = false
    ORDER BY i.created_at DESC
    LIMIT p_limit;
    RETURN;
  END IF;

  BEGIN
    v_tsquery := websearch_to_tsquery('english', v_query_clean);
  EXCEPTION WHEN OTHERS THEN
    v_tsquery := plainto_tsquery('english', v_query_clean);
  END;

  RETURN QUERY
  SELECT
    i.id, i.user_id, i.raw_content, i.type, i.title, i.summary,
    i.tags, i.category, i.image_preview, i.media_url, i.score, i.status,
    i.created_at, i.updated_at,
    i.og_title, i.og_description, i.og_image, i.og_site_name, i.og_url,
    i.og_type, i.og_author, i.og_published_time,
    i.preview_title, i.preview_desc, i.preview_image_url,
    i.embed_type, i.embed_html, i.video_url,
    i.author_name, i.author_avatar, i.platform_type,
    i.content_duration, i.published_date,
    i.content_topics, i.semantic_category,
    i.additional_images, i.media_count, i.is_thread, i.thread_preview,
    i.thread_length, i.engagement_metrics, i.embed_metadata,
    i.media_urls, i.carousel_images, i.video_metadata,
    i.is_starred, i.is_manual, i.user_notes, i.is_public,
    i.shares_count, i.review_count, i.view_count, i.is_archived,
    i.priority, i.importance, i.content_classification, i.ingestion_source,
    ts_rank_cd(i.search_vector, v_tsquery, 32)::real AS relevance_score
  FROM items i
  WHERE i.user_id = p_user_id
    AND i.status = 'active'
    AND i.is_archived = false
    AND i.search_vector @@ v_tsquery
    AND (p_platform IS NULL OR i.platform_type = p_platform)
    AND (p_date_from IS NULL OR i.created_at >= p_date_from)
    AND (p_date_to IS NULL OR i.created_at <= p_date_to)
    AND (p_tags IS NULL OR i.tags && p_tags)
  ORDER BY relevance_score DESC, i.created_at DESC
  LIMIT p_limit;

  GET DIAGNOSTICS v_result_count = ROW_COUNT;

  IF v_result_count = 0 THEN
    RETURN QUERY
    SELECT
      i.id, i.user_id, i.raw_content, i.type, i.title, i.summary,
      i.tags, i.category, i.image_preview, i.media_url, i.score, i.status,
      i.created_at, i.updated_at,
      i.og_title, i.og_description, i.og_image, i.og_site_name, i.og_url,
      i.og_type, i.og_author, i.og_published_time,
      i.preview_title, i.preview_desc, i.preview_image_url,
      i.embed_type, i.embed_html, i.video_url,
      i.author_name, i.author_avatar, i.platform_type,
      i.content_duration, i.published_date,
      i.content_topics, i.semantic_category,
      i.additional_images, i.media_count, i.is_thread, i.thread_preview,
      i.thread_length, i.engagement_metrics, i.embed_metadata,
      i.media_urls, i.carousel_images, i.video_metadata,
      i.is_starred, i.is_manual, i.user_notes, i.is_public,
      i.shares_count, i.review_count, i.view_count, i.is_archived,
      i.priority, i.importance, i.content_classification, i.ingestion_source,
      GREATEST(
        similarity(coalesce(i.title, ''), v_query_clean),
        similarity(coalesce(i.raw_content, ''), v_query_clean),
        similarity(coalesce(i.og_title, ''), v_query_clean),
        similarity(coalesce(i.summary, ''), v_query_clean)
      )::real AS relevance_score
    FROM items i
    WHERE i.user_id = p_user_id
      AND i.status = 'active'
      AND i.is_archived = false
      AND (p_platform IS NULL OR i.platform_type = p_platform)
      AND (p_date_from IS NULL OR i.created_at >= p_date_from)
      AND (p_date_to IS NULL OR i.created_at <= p_date_to)
      AND (
        similarity(coalesce(i.title, ''), v_query_clean) > 0.1
        OR similarity(coalesce(i.raw_content, ''), v_query_clean) > 0.1
        OR similarity(coalesce(i.og_title, ''), v_query_clean) > 0.1
        OR similarity(coalesce(i.summary, ''), v_query_clean) > 0.1
        OR coalesce(i.title, '') ILIKE '%' || v_query_clean || '%'
        OR coalesce(i.raw_content, '') ILIKE '%' || v_query_clean || '%'
        OR coalesce(i.og_title, '') ILIKE '%' || v_query_clean || '%'
        OR coalesce(i.summary, '') ILIKE '%' || v_query_clean || '%'
        OR coalesce(i.og_description, '') ILIKE '%' || v_query_clean || '%'
        OR coalesce(i.user_notes, '') ILIKE '%' || v_query_clean || '%'
        OR coalesce(array_to_string(i.tags, ' '), '') ILIKE '%' || v_query_clean || '%'
        OR coalesce(array_to_string(i.content_topics, ' '), '') ILIKE '%' || v_query_clean || '%'
        OR coalesce(i.author_name, '') ILIKE '%' || v_query_clean || '%'
      )
    ORDER BY relevance_score DESC, i.created_at DESC
    LIMIT p_limit;
  END IF;
END;
$$;
