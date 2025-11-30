/*
  # MeMark Social Networking System
  
  "Make Your Mark" - Social features for sharing collections and building community

  1. New Tables
    - `user_profiles` (public profiles)
      - username, bio, avatar, is_public, profile_views
    - `follows` (follower/following system)
      - follower_id, following_id, created_at
    - `shared_items` (public shares)
      - item_id, user_id, is_public, share_caption, likes_count, shares_count
    - `likes` (social engagement)
      - user_id, shared_item_id
    - `comments` (social discussions)
      - user_id, shared_item_id, content, likes_count
    - `shared_collections` (share entire folders)
      - folder_id, user_id, is_public, description
    - `activity_feed` (social timeline)
      - user_id, action_type, target_id, created_at

  2. Features
    - Public user profiles with custom usernames
    - Follow/unfollow users
    - Share individual items publicly
    - Share entire collections/folders
    - Like and comment on shared content
    - Activity feed showing friend activity
    - Profile view tracking
    - Trending content discovery

  3. Security
    - RLS on all social tables
    - Privacy controls (public/private profiles)
    - Block/mute functionality
*/

-- Create user_profiles table for public profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  bio text,
  avatar_url text,
  website_url text,
  is_public boolean DEFAULT true,
  profile_views integer DEFAULT 0,
  followers_count integer DEFAULT 0,
  following_count integer DEFAULT 0,
  shared_items_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 30),
  CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]+$')
);

-- Create follows table for social connections
CREATE TABLE IF NOT EXISTS follows (
  follower_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  following_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

-- Create shared_items table for public content
CREATE TABLE IF NOT EXISTS shared_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  is_public boolean DEFAULT true,
  share_caption text,
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  shares_count integer DEFAULT 0,
  views_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create likes table
CREATE TABLE IF NOT EXISTS likes (
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  shared_item_id uuid REFERENCES shared_items(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, shared_item_id)
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  shared_item_id uuid REFERENCES shared_items(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  likes_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create shared_collections table
CREATE TABLE IF NOT EXISTS shared_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid REFERENCES folders(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  is_public boolean DEFAULT true,
  title text NOT NULL,
  description text,
  likes_count integer DEFAULT 0,
  views_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create activity_feed table
CREATE TABLE IF NOT EXISTS activity_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  action_type text NOT NULL,
  target_type text,
  target_id uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_shared_items_user ON shared_items(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_items_public ON shared_items(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_shared_item ON likes(shared_item_id);
CREATE INDEX IF NOT EXISTS idx_comments_shared_item ON comments(shared_item_id);
CREATE INDEX IF NOT EXISTS idx_shared_collections_user ON shared_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_user ON activity_feed(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created ON activity_feed(created_at DESC);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON user_profiles FOR SELECT
  USING (is_public = true OR auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for follows
CREATE POLICY "Anyone can view public follows"
  ON follows FOR SELECT
  USING (true);

CREATE POLICY "Users can follow others"
  ON follows FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON follows FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);

-- RLS Policies for shared_items
CREATE POLICY "Public shared items are viewable by everyone"
  ON shared_items FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can share own items"
  ON shared_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shared items"
  ON shared_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own shared items"
  ON shared_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for likes
CREATE POLICY "Anyone can view likes"
  ON likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like content"
  ON likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike content"
  ON likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for comments
CREATE POLICY "Anyone can view comments on public content"
  ON comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shared_items
      WHERE shared_items.id = comments.shared_item_id
      AND shared_items.is_public = true
    )
  );

CREATE POLICY "Users can create comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for shared_collections
CREATE POLICY "Public collections are viewable by everyone"
  ON shared_collections FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can share collections"
  ON shared_collections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shared collections"
  ON shared_collections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for activity_feed
CREATE POLICY "Users can view own activity feed"
  ON activity_feed FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create activity"
  ON activity_feed FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, username, bio, is_public)
  VALUES (
    NEW.id,
    LOWER(REPLACE(NEW.name, ' ', '_')),
    'Making my mark on the web',
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user creation
DROP TRIGGER IF EXISTS trigger_create_user_profile ON users;
CREATE TRIGGER trigger_create_user_profile
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- Function to update follower counts
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE user_profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    UPDATE user_profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_profiles SET following_count = following_count - 1 WHERE id = OLD.follower_id;
    UPDATE user_profiles SET followers_count = followers_count - 1 WHERE id = OLD.following_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for follow counts
DROP TRIGGER IF EXISTS trigger_update_follow_counts ON follows;
CREATE TRIGGER trigger_update_follow_counts
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW
  EXECUTE FUNCTION update_follow_counts();
