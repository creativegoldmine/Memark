/*
  # Fix ambiguous column reference in generate_unique_username

  ## Problem
  The `generate_unique_username` function uses a local variable named `username`
  which conflicts with the `profiles.username` column in the EXISTS subquery,
  causing a PostgreSQL ambiguity error when the trigger fires on auth.users insert.

  ## Fix
  Rename the local variable to `candidate_username` to eliminate the ambiguity.
  This is a non-destructive fix — no data is changed, only the function definition.
*/

CREATE OR REPLACE FUNCTION generate_unique_username(base_name TEXT)
RETURNS TEXT AS $$
DECLARE
  candidate_username TEXT;
  counter INTEGER := 0;
  done BOOLEAN := false;
BEGIN
  candidate_username := lower(regexp_replace(base_name, '[^a-z0-9_]', '', 'g'));
  candidate_username := substring(candidate_username from 1 for 20);

  IF char_length(candidate_username) < 3 THEN
    candidate_username := 'user';
  END IF;

  WHILE NOT done LOOP
    IF counter = 0 THEN
      IF NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.username = candidate_username) THEN
        done := true;
      END IF;
    ELSE
      candidate_username := substring(candidate_username from 1 for 25) || counter::text;
      IF NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.username = candidate_username) THEN
        done := true;
      END IF;
    END IF;
    counter := counter + 1;

    IF counter > 9999 THEN
      candidate_username := 'user' || floor(random() * 1000000)::text;
      done := true;
    END IF;
  END LOOP;

  RETURN candidate_username;
END;
$$ LANGUAGE plpgsql;
