/*
  # AI Chat Assistant & Feedback System

  ## Overview
  This migration adds comprehensive AI chat, feedback collection, and enhanced semantic intelligence to Memark.

  ## New Tables
  
  ### 1. chat_sessions
  - Stores user chat sessions with the AI assistant
  - Tracks session metadata and context
  
  ### 2. chat_messages
  - Individual messages within chat sessions
  - Supports user and assistant roles
  - Stores message content and metadata
  
  ### 3. user_feedback
  - Collects explicit user corrections and preferences
  - Tracks categorization accuracy
  - Enables AI learning loop
  
  ### 4. semantic_clusters
  - Identifies emerging topic patterns
  - Groups related items by semantic similarity
  - Auto-suggests folder creation
  
  ### 5. ai_insights
  - Stores AI-generated insights about user's knowledge vault
  - Topic trends, learning patterns, recommendations

  ## Security
  - All tables have RLS enabled
  - Users can only access their own data
  - Authenticated users only

  ## Indexes
  - Optimized for chat message retrieval
  - Fast feedback lookups by item
  - Semantic cluster queries
*/

-- Chat Sessions Table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text,
  context_summary text,
  message_count integer DEFAULT 0,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  tokens_used integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- User Feedback Table
CREATE TABLE IF NOT EXISTS user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id uuid REFERENCES items(id) ON DELETE CASCADE,
  feedback_type text NOT NULL CHECK (feedback_type IN (
    'wrong_category',
    'wrong_topic',
    'missing_keywords',
    'sentiment_mismatch',
    'good_categorization',
    'folder_suggestion_accepted',
    'folder_suggestion_rejected',
    'chat_helpful',
    'chat_not_helpful',
    'correction'
  )),
  original_value text,
  corrected_value text,
  confidence_before double precision,
  context jsonb DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Semantic Clusters Table
CREATE TABLE IF NOT EXISTS semantic_clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cluster_name text NOT NULL,
  primary_topic text NOT NULL,
  related_topics text[] DEFAULT ARRAY[]::text[],
  keywords text[] DEFAULT ARRAY[]::text[],
  item_ids uuid[] DEFAULT ARRAY[]::uuid[],
  item_count integer DEFAULT 0,
  confidence_score double precision DEFAULT 0.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
  suggested_folder_name text,
  suggested_icon text DEFAULT 'folder',
  status text DEFAULT 'detected' CHECK (status IN ('detected', 'suggested', 'folder_created', 'dismissed')),
  folder_id uuid REFERENCES folders(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- AI Insights Table
CREATE TABLE IF NOT EXISTS ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  insight_type text NOT NULL CHECK (insight_type IN (
    'topic_trend',
    'learning_pattern',
    'organization_suggestion',
    'content_gap',
    'review_recommendation',
    'usage_insight'
  )),
  title text NOT NULL,
  description text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'dismissed', 'completed')),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE semantic_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_sessions
CREATE POLICY "Users can view own chat sessions"
  ON chat_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own chat sessions"
  ON chat_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat sessions"
  ON chat_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat sessions"
  ON chat_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for chat_messages
CREATE POLICY "Users can view own chat messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own chat messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat messages"
  ON chat_messages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for user_feedback
CREATE POLICY "Users can view own feedback"
  ON user_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own feedback"
  ON user_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for semantic_clusters
CREATE POLICY "Users can view own semantic clusters"
  ON semantic_clusters FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own semantic clusters"
  ON semantic_clusters FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for ai_insights
CREATE POLICY "Users can view own AI insights"
  ON ai_insights FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own AI insights"
  ON ai_insights FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_feedback_item_id ON user_feedback(item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id, feedback_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_semantic_clusters_user_id ON semantic_clusters(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_insights_user_id ON ai_insights(user_id, status, priority, created_at DESC);

-- Function to update chat session timestamp and message count
CREATE OR REPLACE FUNCTION update_chat_session_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_sessions
  SET 
    last_message_at = NEW.created_at,
    message_count = message_count + 1,
    updated_at = NEW.created_at
  WHERE id = NEW.session_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update chat session
DROP TRIGGER IF EXISTS trigger_update_chat_session ON chat_messages;
CREATE TRIGGER trigger_update_chat_session
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_session_on_message();