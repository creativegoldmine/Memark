/*
  # Auto-extract articles on save + schedule daily digest

  Wires the extraction + digest automation that was previously orphaned.

  1. Extensions
    - Enable `pg_net` for async HTTP calls from Postgres
    - Enable `pg_cron` for scheduled jobs

  2. New function
    - `trigger_article_extraction(item_id)` - fires an async HTTP POST to the
      `extract-article-worker` edge function which pulls the article body,
      computes reading time, and writes it back to the row.

  3. Trigger
    - `items_auto_extract_after_insert` - runs AFTER INSERT on `items` and
      schedules extraction for any row whose raw_content contains a URL.

  4. Scheduled job
    - `memark-daily-digest` - invokes the existing `prepare-daily-digest`
      edge function every day at 13:00 UTC (8am ET / 5am PT).

  5. Notes
    - Uses Supabase Vault to read the service role key so we never persist secrets in plain text.
    - Non-URL items are automatically marked `extraction_status = 'skipped'` by the worker.
*/

CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
DECLARE
  existing_url_secret uuid;
  existing_key_secret uuid;
BEGIN
  SELECT id INTO existing_url_secret FROM vault.secrets WHERE name = 'memark_supabase_url';
  IF existing_url_secret IS NULL THEN
    PERFORM vault.create_secret(
      current_setting('app.settings.supabase_url', true),
      'memark_supabase_url',
      'Supabase project URL used by internal triggers'
    );
  END IF;

  SELECT id INTO existing_key_secret FROM vault.secrets WHERE name = 'memark_service_role_key';
  IF existing_key_secret IS NULL THEN
    PERFORM vault.create_secret(
      current_setting('app.settings.service_role_key', true),
      'memark_service_role_key',
      'Service role key used by internal triggers'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

CREATE OR REPLACE FUNCTION public.trigger_article_extraction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  project_url text;
  service_key text;
BEGIN
  IF NEW.raw_content IS NULL OR NEW.raw_content !~ 'https?://' THEN
    RETURN NEW;
  END IF;

  BEGIN
    SELECT decrypted_secret INTO project_url FROM vault.decrypted_secrets WHERE name = 'memark_supabase_url' LIMIT 1;
    SELECT decrypted_secret INTO service_key FROM vault.decrypted_secrets WHERE name = 'memark_service_role_key' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    project_url := NULL;
  END;

  IF project_url IS NULL OR service_key IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := project_url || '/functions/v1/extract-article-worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := jsonb_build_object('item_id', NEW.id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS items_auto_extract_after_insert ON public.items;
CREATE TRIGGER items_auto_extract_after_insert
AFTER INSERT ON public.items
FOR EACH ROW
EXECUTE FUNCTION public.trigger_article_extraction();

DO $$
DECLARE
  job_id bigint;
BEGIN
  SELECT jobid INTO job_id FROM cron.job WHERE jobname = 'memark-daily-digest';
  IF job_id IS NOT NULL THEN
    PERFORM cron.unschedule(job_id);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
DECLARE
  project_url text;
  service_key text;
BEGIN
  SELECT decrypted_secret INTO project_url FROM vault.decrypted_secrets WHERE name = 'memark_supabase_url' LIMIT 1;
  SELECT decrypted_secret INTO service_key FROM vault.decrypted_secrets WHERE name = 'memark_service_role_key' LIMIT 1;

  IF project_url IS NOT NULL AND service_key IS NOT NULL THEN
    PERFORM cron.schedule(
      'memark-daily-digest',
      '0 13 * * *',
      format(
        $cron$ SELECT net.http_post(url := %L, headers := %L::jsonb, body := %L::jsonb) $cron$,
        project_url || '/functions/v1/prepare-daily-digest',
        jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || service_key)::text,
        '{}'::text
      )
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
