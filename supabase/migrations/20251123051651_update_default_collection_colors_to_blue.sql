/*
  # Update Default Collection Colors to Blue Theme

  ## Changes
  Update the handle_new_user trigger function to use blue, light blue, and grey colors
  for default collections to match the new calming blue color scheme.

  ## Color Updates
  - Videos to Watch: Blue
  - Articles to Read: Light Blue
  - Work: Dark Blue
  - Personal: Light Grey/Blue
  - Inspiration: Sky Blue
  - Finance: Teal Blue
  - Learning: Blue-Grey
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_name text;
  user_phone text;
BEGIN
  -- Extract metadata with defaults
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', 'User');
  user_phone := COALESCE(NEW.raw_user_meta_data->>'phone_number', '');

  -- Create the public.users record
  INSERT INTO public.users (id, email, name, phone_number, plan_type)
  VALUES (NEW.id, NEW.email, user_name, user_phone, 'free');

  -- Create default collections with blue-themed colors
  INSERT INTO public.collections (user_id, name, icon, color, description, auto_generated) VALUES
    (NEW.id, 'Videos to Watch', '🎥', '#2563EB', 'All your saved videos in one place', true),
    (NEW.id, 'Articles to Read', '📰', '#3B82F6', 'Articles and blog posts to read later', true),
    (NEW.id, 'Work', '💼', '#1E3A8A', 'Work-related content and tasks', true),
    (NEW.id, 'Personal', '🏠', '#64748B', 'Personal notes and reminders', true),
    (NEW.id, 'Inspiration', '✨', '#0EA5E9', 'Creative ideas and inspiration', true),
    (NEW.id, 'Finance', '💰', '#06B6D4', 'Financial content and resources', true),
    (NEW.id, 'Learning', '📚', '#475569', 'Educational content and courses', true);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;
