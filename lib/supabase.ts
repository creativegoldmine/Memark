import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  console.error('EXPO_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('EXPO_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing');
}

export { supabaseUrl };

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
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
  shares_count?: number;
  is_archived?: boolean;
  is_public?: boolean;
  preview_title?: string;
  preview_desc?: string;
  preview_image_url?: string;
  preview_fetched_at?: string;
  embed_type?: string;
  embed_html?: string;
  embed_metadata?: any;
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
  media_urls?: string[];
  media_count?: number;
  media_storage_paths?: string[];
  thumbnail_urls?: string[];
  content_classification?: 'text_only' | 'text_with_photo' | 'link_only' | 'link_with_text' | 'link_with_photo' | 'social_post' | 'direct_share';
  ingestion_source?: 'sms' | 'ios_share' | 'android_share' | 'web' | 'api';
  processing_status?: 'pending' | 'processing' | 'completed' | 'failed';
  processing_error?: string;
  carousel_images?: string[];
  video_metadata?: {
    duration?: string;
    quality?: string;
    codec?: string;
    width?: number;
    height?: number;
  };
  api_version?: string;
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
