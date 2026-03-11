/*
  # Webhook Audit Log & Test User Infrastructure

  ## Overview
  Adds infrastructure for testing and security auditing of the SMS webhook pipeline.

  ## New Tables

  ### 1. webhook_logs
  - Audit trail for every incoming SMS webhook attempt
  - Stores hashed phone number (never raw), matched user ID, outcome, and request metadata
  - Enables security monitoring and anomaly detection (spike in unknown numbers = probe attempt)

  ### 2. test_users
  - Tracks which users in the system are synthetic test users
  - Allows safe cleanup of test data without touching real users
  - Linked to the users table

  ## Security
  - RLS enabled on both tables
  - webhook_logs: only superadmins can read (service role writes)
  - test_users: service role only (no user-facing access)

  ## Notes
  - phone_hash in webhook_logs uses SHA-256 of the raw phone number (GDPR-safe)
  - outcome values: 'success', 'user_not_found', 'signature_invalid', 'error'
  - source values: 'twilio', 'test_simulator', 'unknown'
*/

CREATE TABLE IF NOT EXISTS webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_hash text NOT NULL,
  matched_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  outcome text NOT NULL DEFAULT 'unknown',
  source text NOT NULL DEFAULT 'unknown',
  item_id uuid,
  processing_duration_ms integer,
  error_message text,
  request_ip text,
  twilio_message_sid text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can view webhook logs"
  ON webhook_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_superadmin = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_outcome ON webhook_logs(outcome);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_matched_user ON webhook_logs(matched_user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_phone_hash ON webhook_logs(phone_hash);

CREATE TABLE IF NOT EXISTS test_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  test_label text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE test_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can view test users"
  ON test_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_superadmin = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_test_users_user_id ON test_users(user_id);
