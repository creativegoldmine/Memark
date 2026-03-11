/*
  # Add Stripe Subscription Fields

  ## Summary
  Adds Stripe-specific fields to the users table to track subscriptions.
  Also creates a stripe_events table to log webhook events for idempotency.

  ## Changes
  ### Modified: users table
  - `stripe_customer_id` - Stripe customer ID for billing
  - `stripe_subscription_id` - Active subscription ID
  - `stripe_price_id` - Current price/plan ID
  - `subscription_status` - active, trialing, canceled, past_due, etc.
  - `subscription_period_end` - When current subscription period ends
  - `trial_ends_at` - Trial end date
  - `items_count` - Cached count of active items for limit checks

  ### New: stripe_events table
  - Logs processed Stripe webhook events to prevent duplicate processing

  ## Security
  - RLS enabled on stripe_events
  - Only service role can write to stripe_events
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE users ADD COLUMN stripe_customer_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'stripe_subscription_id'
  ) THEN
    ALTER TABLE users ADD COLUMN stripe_subscription_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'stripe_price_id'
  ) THEN
    ALTER TABLE users ADD COLUMN stripe_price_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE users ADD COLUMN subscription_status text DEFAULT 'free';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'subscription_period_end'
  ) THEN
    ALTER TABLE users ADD COLUMN subscription_period_end timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'trial_ends_at'
  ) THEN
    ALTER TABLE users ADD COLUMN trial_ends_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'items_count'
  ) THEN
    ALTER TABLE users ADD COLUMN items_count integer DEFAULT 0;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS stripe_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  processed_at timestamptz DEFAULT now(),
  payload jsonb
);

ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert stripe events"
  ON stripe_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_stripe_events_stripe_event_id ON stripe_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription_id ON users(stripe_subscription_id);
