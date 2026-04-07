import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CRITICAL: Missing Supabase environment variables. Auth will not work.');
  console.error('EXPO_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'MISSING');
  console.error('EXPO_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'MISSING');
}

export { supabaseUrl };

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

export interface User {
  id: string;
  phone_number: string;
  email: string;
  name: string;
  avatar_url?: string;
  plan_type: string;
  is_superadmin?: boolean;
  active_role?: string;
  superadmin_mode_enabled_at?: string;
  public_profile_enabled?: boolean;
  referral_code?: string;
  review_streak?: number;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: string;
  user_id: string;
  raw_content: string;
  type: 'article' | 'video' | 'text' | 'note' | 'screenshot' | 'task' | 'unknown';
  title?: string;
  summary?: string;
  tags: string[];
  category?: string;
  image_preview?: string;
  media_url?: string;
  url?: string;
  score: number;
  status: 'active' | 'archived' | 'done' | 'snoozed';
  review_stage: number;
  next_review_date: string;
  created_at: string;
  updated_at: string;
  last_viewed_at?: string;
  last_reviewed_at?: string;
  view_count?: number;
  review_count?: number;
  shares_count?: number;
  is_archived?: boolean;
  is_public?: boolean;
  is_starred?: boolean;
  is_manual?: boolean;
  priority?: string;
  importance?: string;
  user_notes?: string;
  content_type?: string;
  preview_title?: string;
  preview_desc?: string;
  preview_image_url?: string;
  preview_fetched_at?: string;
  embed_type?: string;
  embed_html?: string;
  embed_metadata?: Record<string, any>;
  embed_fetched_at?: string;
  embed_error?: string;
  platform_type?: string;
  video_url?: string;
  og_title?: string;
  og_description?: string;
  og_image?: string;
  og_site_name?: string;
  og_url?: string;
  og_type?: string;
  og_author?: string;
  og_published_time?: string;
  author_name?: string;
  author_avatar?: string;
  content_duration?: string;
  published_date?: string;
  content_topics?: string[];
  semantic_category?: string;
  topic_confidence?: number;
  additional_images?: string[];
  media_count?: number;
  is_thread?: boolean;
  thread_preview?: string;
  thread_length?: number;
  engagement_metrics?: Record<string, any>;
  media_urls?: any[];
  media_storage_paths?: string[];
  thumbnail_urls?: string[];
  carousel_images?: any[];
  video_metadata?: Record<string, any>;
  content_classification?: string;
  ingestion_source?: string;
  processing_status?: string;
  processing_error?: string;
  api_version?: string;
  relevance_score?: number;
}

export interface Profile {
  user_id: string;
  username: string;
  bio: string;
  avatar_url?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface Referral {
  id: string;
  referrer_user_id: string;
  referred_user_id?: string;
  referral_code: string;
  status: 'pending' | 'completed' | 'rewarded';
  reward_amount: number;
  created_at: string;
  completed_at?: string;
}

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  icon?: string;
  color?: string;
  description?: string;
  auto_generated: boolean;
  created_at: string;
  updated_at: string;
}

export interface AIEventLog {
  id: string;
  user_id: string;
  item_id?: string;
  action_type: string;
  ai_output?: any;
  created_at: string;
}
