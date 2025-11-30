/*
  # Create Hierarchical Folder System

  1. New Tables
    - `folders`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `parent_folder_id` (uuid, nullable, self-reference for hierarchy)
      - `name` (text, folder name)
      - `path` (text, full path like 'x.com/AI/Articles')
      - `icon` (text, emoji or icon identifier)
      - `color` (text, hex color)
      - `is_auto_generated` (boolean, created by AI)
      - `auto_rule` (text, domain or category rule like 'x.com')
      - `sort_order` (integer)
      - `created_at`, `updated_at`
    
    - `item_folders` (many-to-many relationship)
      - `item_id` (uuid, references items)
      - `folder_id` (uuid, references folders)
      - `added_by_ai` (boolean, auto-categorized vs manual)
      - `created_at`

  2. Security
    - Enable RLS on all new tables
    - Users can only access their own folders
    - Users can only link their own items to their own folders

  3. Features
    - Hierarchical folder structure (unlimited depth)
    - Auto-generated folders based on domain (x.com, youtube.com, etc.)
    - AI-based subfolder categorization
    - Manual folder creation and management
    - Items can be in multiple folders
*/

-- Create folders table
CREATE TABLE IF NOT EXISTS folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  parent_folder_id uuid REFERENCES folders(id) ON DELETE CASCADE,
  name text NOT NULL,
  path text NOT NULL,
  icon text DEFAULT '📁',
  color text DEFAULT '#3B82F6',
  is_auto_generated boolean DEFAULT false,
  auto_rule text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create item_folders junction table
CREATE TABLE IF NOT EXISTS item_folders (
  item_id uuid REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  folder_id uuid REFERENCES folders(id) ON DELETE CASCADE NOT NULL,
  added_by_ai boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (item_id, folder_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_folder_id);
CREATE INDEX IF NOT EXISTS idx_folders_path ON folders(path);
CREATE INDEX IF NOT EXISTS idx_item_folders_item ON item_folders(item_id);
CREATE INDEX IF NOT EXISTS idx_item_folders_folder ON item_folders(folder_id);

-- Enable RLS
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_folders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for folders
CREATE POLICY "Users can view own folders"
  ON folders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own folders"
  ON folders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders"
  ON folders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders"
  ON folders FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for item_folders
CREATE POLICY "Users can view own item-folder links"
  ON item_folders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = item_folders.item_id
      AND items.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own item-folder links"
  ON item_folders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = item_folders.item_id
      AND items.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own item-folder links"
  ON item_folders FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = item_folders.item_id
      AND items.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_folder_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_folder_timestamp ON folders;
CREATE TRIGGER trigger_update_folder_timestamp
  BEFORE UPDATE ON folders
  FOR EACH ROW
  EXECUTE FUNCTION update_folder_updated_at();

-- Function to create default root folders for new users
CREATE OR REPLACE FUNCTION create_default_folders_for_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create "All Items" folder
  INSERT INTO folders (user_id, name, path, icon, is_auto_generated, sort_order)
  VALUES (NEW.id, 'All Items', 'All Items', '📌', true, 0);
  
  -- Create "Uncategorized" folder
  INSERT INTO folders (user_id, name, path, icon, is_auto_generated, sort_order)
  VALUES (NEW.id, 'Uncategorized', 'Uncategorized', '❓', true, 999);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create default folders on user creation
DROP TRIGGER IF EXISTS trigger_create_default_folders ON users;
CREATE TRIGGER trigger_create_default_folders
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_folders_for_user();
