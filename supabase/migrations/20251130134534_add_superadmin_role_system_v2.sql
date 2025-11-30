/*
  # Add SuperAdmin Role System

  1. Changes to Users Table
    - Add `is_superadmin` column (boolean)
    - Add `active_role` column (text: 'user' or 'superadmin')
    - Add `superadmin_mode_enabled_at` timestamp

  2. New Table: admin_actions
    - Track all admin actions for audit log
    - `id`, `admin_user_id`, `action_type`, `target_user_id`, `details`, `created_at`

  3. Security
    - RLS policies for admin actions
    - Only superadmins can view admin actions
    - All admin actions are logged

  4. Features
    - SuperAdmins can switch between user and admin modes
    - Admin mode is tracked with timestamp
    - All administrative actions are audited
*/

-- Add superadmin columns to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_superadmin'
  ) THEN
    ALTER TABLE users ADD COLUMN is_superadmin boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'active_role'
  ) THEN
    ALTER TABLE users ADD COLUMN active_role text DEFAULT 'user';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'superadmin_mode_enabled_at'
  ) THEN
    ALTER TABLE users ADD COLUMN superadmin_mode_enabled_at timestamptz;
  END IF;
END $$;

-- Create admin_actions table for audit log
CREATE TABLE IF NOT EXISTS admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  action_type text NOT NULL,
  target_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  target_resource_type text,
  target_resource_id uuid,
  details jsonb DEFAULT '{}',
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_user ON admin_actions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target_user ON admin_actions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON admin_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_is_superadmin ON users(is_superadmin) WHERE is_superadmin = true;

-- Enable RLS
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_actions
CREATE POLICY "SuperAdmins can view all admin actions"
  ON admin_actions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_superadmin = true
    )
  );

CREATE POLICY "SuperAdmins can insert admin actions"
  ON admin_actions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_superadmin = true
    )
    AND admin_user_id = auth.uid()
  );

-- Function to log admin action
CREATE OR REPLACE FUNCTION log_admin_action(
  p_action_type text,
  p_target_user_id uuid DEFAULT NULL,
  p_target_resource_type text DEFAULT NULL,
  p_target_resource_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT '{}'
)
RETURNS uuid AS $$
DECLARE
  v_action_id uuid;
BEGIN
  INSERT INTO admin_actions (
    admin_user_id,
    action_type,
    target_user_id,
    target_resource_type,
    target_resource_id,
    details
  ) VALUES (
    auth.uid(),
    p_action_type,
    p_target_user_id,
    p_target_resource_type,
    p_target_resource_id,
    p_details
  ) RETURNING id INTO v_action_id;

  RETURN v_action_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to switch to superadmin mode
CREATE OR REPLACE FUNCTION enable_superadmin_mode()
RETURNS boolean AS $$
BEGIN
  UPDATE users
  SET 
    active_role = 'superadmin',
    superadmin_mode_enabled_at = now()
  WHERE id = auth.uid()
  AND is_superadmin = true;

  IF FOUND THEN
    PERFORM log_admin_action('enable_superadmin_mode');
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to switch to user mode
CREATE OR REPLACE FUNCTION disable_superadmin_mode()
RETURNS boolean AS $$
BEGIN
  UPDATE users
  SET 
    active_role = 'user',
    superadmin_mode_enabled_at = NULL
  WHERE id = auth.uid()
  AND is_superadmin = true;

  IF FOUND THEN
    PERFORM log_admin_action('disable_superadmin_mode');
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION log_admin_action TO authenticated;
GRANT EXECUTE ON FUNCTION enable_superadmin_mode TO authenticated;
GRANT EXECUTE ON FUNCTION disable_superadmin_mode TO authenticated;

-- Set the existing admin user as superadmin
UPDATE users
SET is_superadmin = true, active_role = 'user'
WHERE email = 'admin@memark.app';
