/*
  # MeMark Core Database Schema

  ## Overview
  This migration creates the foundational database structure for MeMark/MeSend,
  a Personal Inbound Knowledge Manager (PIKM) that allows users to send content
  to themselves via SMS or share sheet, with AI-powered organization and review.

  ## New Tables

  ### users
  Core user account information
  - `id` (uuid, primary key) - Unique user identifier
  - `phone_number` (text, unique) - User's phone number for SMS identification
  - `email` (text, unique) - User's email address
  - `name` (text) - User's full name
  - `avatar_url` (text) - Profile picture URL
  - `plan_type` (text) - Subscription plan (free, pro, premium)
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### items
  All content sent by users (links, videos, notes, screenshots, etc.)
  - `id` (uuid, primary key) - Unique item identifier
  - `user_id` (uuid, foreign key) - References users table
  - `raw_content` (text) - Original message/link content
  - `type` (text) - Content type (article, video, text, note, screenshot, task, unknown)
  - `title` (text) - AI-generated or extracted title
  - `summary` (text) - AI-generated summary
  - `tags` (text[]) - Array of tags
  - `category` (text) - Auto-assigned category
  - `image_preview` (text) - Preview image URL
  - `media_url` (text) - Original media URL if applicable
  - `score` (integer) - AI relevance score (0-100)
  - `status` (text) - Item status (active, archived, done, snoozed)
  - `review_stage` (integer) - Spaced repetition stage (1-5)
  - `next_review_date` (timestamptz) - When to surface this item next
  - `created_at` (timestamptz) - Item creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### collections
  User-created or AI-generated collections of items
  - `id` (uuid, primary key) - Unique collection identifier
  - `user_id` (uuid, foreign key) - References users table
  - `name` (text) - Collection name
  - `icon` (text) - Emoji or icon identifier
  - `color` (text) - Color theme
  - `description` (text) - Collection description
  - `auto_generated` (boolean) - Whether AI created this collection
  - `created_at` (timestamptz) - Collection creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### collection_items
  Junction table linking items to collections (many-to-many)
  - `id` (uuid, primary key) - Unique relationship identifier
  - `collection_id` (uuid, foreign key) - References collections table
  - `item_id` (uuid, foreign key) - References items table
  - `added_at` (timestamptz) - When item was added to collection

  ### ai_event_log
  Tracks all AI operations for debugging and analytics
  - `id` (uuid, primary key) - Unique log identifier
  - `user_id` (uuid, foreign key) - References users table
  - `item_id` (uuid, foreign key) - References items table
  - `action_type` (text) - Type of AI action (categorize, summarize, tag, etc.)
  - `ai_output` (jsonb) - Full AI response
  - `created_at` (timestamptz) - When AI action occurred

  ## Security
  - Enable Row Level Security (RLS) on all tables
  - Users can only access their own data
  - Authenticated access required for all operations
  
  ## Indexes
  - Performance indexes on foreign keys and frequently queried columns
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  avatar_url text,
  plan_type text DEFAULT 'free',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create items table
CREATE TABLE IF NOT EXISTS items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  raw_content text NOT NULL,
  type text DEFAULT 'unknown',
  title text,
  summary text,
  tags text[] DEFAULT '{}',
  category text,
  image_preview text,
  media_url text,
  score integer DEFAULT 50,
  status text DEFAULT 'active',
  review_stage integer DEFAULT 1,
  next_review_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create collections table
CREATE TABLE IF NOT EXISTS collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  icon text,
  color text,
  description text,
  auto_generated boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create collection_items junction table
CREATE TABLE IF NOT EXISTS collection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid REFERENCES collections(id) ON DELETE CASCADE NOT NULL,
  item_id uuid REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  added_at timestamptz DEFAULT now(),
  UNIQUE(collection_id, item_id)
);

-- Create ai_event_log table
CREATE TABLE IF NOT EXISTS ai_event_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  item_id uuid REFERENCES items(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  ai_output jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_next_review_date ON items(next_review_date);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_collection_id ON collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_item_id ON collection_items(item_id);
CREATE INDEX IF NOT EXISTS idx_ai_event_log_user_id ON ai_event_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_event_log_item_id ON ai_event_log(item_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_event_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS Policies for items table
CREATE POLICY "Users can view own items"
  ON items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own items"
  ON items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own items"
  ON items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own items"
  ON items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for collections table
CREATE POLICY "Users can view own collections"
  ON collections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own collections"
  ON collections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own collections"
  ON collections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own collections"
  ON collections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for collection_items table
CREATE POLICY "Users can view own collection items"
  ON collection_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_items.collection_id
      AND collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own collection items"
  ON collection_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_items.collection_id
      AND collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own collection items"
  ON collection_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_items.collection_id
      AND collections.user_id = auth.uid()
    )
  );

-- RLS Policies for ai_event_log table
CREATE POLICY "Users can view own AI logs"
  ON ai_event_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI logs"
  ON ai_event_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collections_updated_at
  BEFORE UPDATE ON collections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();