/*
  # Seed Test Users for SMS Simulation

  ## Overview
  Creates 10 synthetic test users with fake US phone numbers (+1555000000X format).
  These numbers are reserved by the ITU/NANP for fictional use in TV/film and will
  never belong to a real subscriber, making them safe for testing.

  ## What This Does
  - Creates auth.users entries for each test user (so RLS auth.uid() checks work)
  - Creates matching public.users entries linked to each auth user
  - Registers each user in the test_users tracking table with a descriptive label
  - Each test user has a unique email in the format testuser-N@test.memark.internal

  ## Test Users Created
  - testuser-1 through testuser-10
  - Phone numbers: +15550000001 through +15550000010
  - All marked plan_type = 'free' by default

  ## Notes
  - These users are identified in the test_users table for easy cleanup
  - Their items can be wiped via the sms-simulator cleanup action
  - DO NOT use these users in production — their auth passwords are known
*/

DO $$
DECLARE
  v_auth_user_id uuid;
  v_i integer;
  v_email text;
  v_phone text;
  v_name text;
BEGIN
  FOR v_i IN 1..10 LOOP
    v_email := 'testuser-' || v_i || '@test.memark.internal';
    v_phone := '1555000000' || v_i;
    v_name := 'Test User ' || v_i;

    SELECT id INTO v_auth_user_id
    FROM auth.users
    WHERE email = v_email;

    IF v_auth_user_id IS NULL THEN
      v_auth_user_id := gen_random_uuid();

      INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        role,
        aud,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data
      ) VALUES (
        v_auth_user_id,
        '00000000-0000-0000-0000-000000000000',
        v_email,
        crypt('TestPassword123!', gen_salt('bf')),
        now(),
        'authenticated',
        'authenticated',
        now(),
        now(),
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object('name', v_name)
      );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_auth_user_id) THEN
      INSERT INTO public.users (id, email, name, phone_number, plan_type, created_at, updated_at)
      VALUES (v_auth_user_id, v_email, v_name, v_phone, 'free', now(), now());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM test_users WHERE user_id = v_auth_user_id) THEN
      INSERT INTO test_users (user_id, test_label)
      VALUES (v_auth_user_id, 'Auto-seeded test user ' || v_i || ' (phone: +' || v_phone || ')');
    END IF;
  END LOOP;
END $$;
