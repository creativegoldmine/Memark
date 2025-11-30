/*
  # Auto-Create Default Collections for New Users

  ## Overview
  This migration creates a trigger that automatically creates default "Smart Collections"
  for each new user upon signup. These AI-powered collections help organize content
  automatically.

  ## Changes
  1. Function to create default collections
  2. Trigger to run function on new user insertion

  ## Default Collections Created
  - Videos to Watch
  - Articles to Read
  - Work
  - Personal
  - Inspiration
  - Finance
  - Learning
*/

-- Function to create default collections for new users
CREATE OR REPLACE FUNCTION create_default_collections()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default auto-generated collections
  INSERT INTO collections (user_id, name, icon, color, description, auto_generated) VALUES
    (NEW.id, 'Videos to Watch', '🎥', '#EF4444', 'All your saved videos in one place', true),
    (NEW.id, 'Articles to Read', '📰', '#3B82F6', 'Articles and blog posts to read later', true),
    (NEW.id, 'Work', '💼', '#8B5CF6', 'Work-related content and tasks', true),
    (NEW.id, 'Personal', '🏠', '#10B981', 'Personal notes and reminders', true),
    (NEW.id, 'Inspiration', '✨', '#F59E0B', 'Creative ideas and inspiration', true),
    (NEW.id, 'Finance', '💰', '#06B6D4', 'Financial content and resources', true),
    (NEW.id, 'Learning', '📚', '#EC4899', 'Educational content and courses', true);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run after user insertion
CREATE TRIGGER create_user_default_collections
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_collections();
