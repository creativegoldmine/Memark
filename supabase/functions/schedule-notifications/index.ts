import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results = {
      reviewReminders: 0,
      dailyDigests: 0,
      weeklyDigests: 0,
      collectionUpdates: 0,
    };

    await scheduleReviewReminders(supabase, results);
    await scheduleDailyDigests(supabase, results);
    await scheduleWeeklyDigests(supabase, results);
    await scheduleCollectionUpdates(supabase, results);

    return new Response(
      JSON.stringify({
        success: true,
        scheduled: results,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in schedule-notifications:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function scheduleReviewReminders(supabase: any, results: any) {
  try {
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 3600000);

    const { data: dueItems } = await supabase
      .from('items')
      .select(`
        id,
        user_id,
        title,
        next_review_date,
        users!inner (
          id,
          notification_preferences (
            enable_review_reminders,
            review_reminder_time,
            enable_push_notifications
          )
        )
      `)
      .lte('next_review_date', oneHourFromNow.toISOString())
      .gte('next_review_date', now.toISOString())
      .eq('status', 'active')
      .limit(100);

    if (!dueItems || dueItems.length === 0) return;

    const userItems = new Map();
    for (const item of dueItems) {
      const prefs = item.users?.notification_preferences?.[0];
      if (!prefs?.enable_review_reminders || !prefs?.enable_push_notifications) continue;

      if (!userItems.has(item.user_id)) {
        userItems.set(item.user_id, []);
      }
      userItems.get(item.user_id).push(item);
    }

    for (const [userId, items] of userItems) {
      const dedupKey = `review-${userId}-${now.toISOString().split('T')[0]}`;

      const { data: existing } = await supabase
        .from('notification_queue')
        .select('id')
        .eq('dedup_key', dedupKey)
        .eq('status', 'pending')
        .limit(1);

      if (existing && existing.length > 0) continue;

      const title = items.length === 1
        ? 'Time to review an item'
        : `Time to review ${items.length} items`;

      const body = items.length === 1
        ? items[0].title
        : `${items.slice(0, 2).map((i: any) => i.title).join(', ')}${items.length > 2 ? ` and ${items.length - 2} more` : ''}`;

      await supabase
        .from('notification_queue')
        .insert({
          user_id: userId,
          notification_type: 'review_reminder',
          title,
          body,
          data: {
            item_ids: items.map((i: any) => i.id),
            count: items.length,
          },
          channels: ['push', 'in_app'],
          scheduled_for: items[0].next_review_date,
          dedup_key: dedupKey,
        });

      results.reviewReminders++;
    }
  } catch (error) {
    console.error('Error scheduling review reminders:', error);
  }
}

async function scheduleDailyDigests(supabase: any, results: any) {
  try {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);

    const { data: users } = await supabase
      .from('notification_preferences')
      .select('user_id, daily_digest_time, enable_push_notifications')
      .eq('enable_daily_digest', true)
      .eq('enable_push_notifications', true);

    if (!users) return;

    for (const user of users) {
      const digestTime = user.daily_digest_time?.slice(0, 5);
      if (digestTime !== currentTime) continue;

      const dedupKey = `daily-${user.user_id}-${now.toISOString().split('T')[0]}`;

      const { data: existing } = await supabase
        .from('notification_queue')
        .select('id')
        .eq('dedup_key', dedupKey)
        .eq('status', 'pending')
        .limit(1);

      if (existing && existing.length > 0) continue;

      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const { data: todayItems, count } = await supabase
        .from('items')
        .select('id, title, score', { count: 'exact' })
        .eq('user_id', user.user_id)
        .gte('created_at', todayStart.toISOString())
        .order('score', { ascending: false })
        .limit(5);

      if (!todayItems || todayItems.length === 0) continue;

      const title = `Your Daily Memark Digest`;
      const body = `You saved ${count} items today. Here are your top picks!`;

      await supabase
        .from('notification_queue')
        .insert({
          user_id: user.user_id,
          notification_type: 'daily_digest',
          title,
          body,
          data: {
            item_ids: todayItems.map((i: any) => i.id),
            count,
            top_items: todayItems.slice(0, 3),
          },
          channels: ['push', 'in_app'],
          scheduled_for: now.toISOString(),
          dedup_key: dedupKey,
        });

      results.dailyDigests++;
    }
  } catch (error) {
    console.error('Error scheduling daily digests:', error);
  }
}

async function scheduleWeeklyDigests(supabase: any, results: any) {
  try {
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);

    const { data: users } = await supabase
      .from('notification_preferences')
      .select('user_id, weekly_digest_day, weekly_digest_time, enable_push_notifications')
      .eq('enable_weekly_digest', true)
      .eq('enable_push_notifications', true)
      .eq('weekly_digest_day', currentDay);

    if (!users) return;

    for (const user of users) {
      const digestTime = user.weekly_digest_time?.slice(0, 5);
      if (digestTime !== currentTime) continue;

      const dedupKey = `weekly-${user.user_id}-${now.toISOString().split('T')[0]}`;

      const { data: existing } = await supabase
        .from('notification_queue')
        .select('id')
        .eq('dedup_key', dedupKey)
        .eq('status', 'pending')
        .limit(1);

      if (existing && existing.length > 0) continue;

      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const { count: itemCount } = await supabase
        .from('items')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.user_id)
        .gte('created_at', weekAgo.toISOString());

      const { count: collectionCount } = await supabase
        .from('folders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.user_id)
        .gte('created_at', weekAgo.toISOString());

      if ((itemCount || 0) === 0 && (collectionCount || 0) === 0) continue;

      const title = `Your Weekly Memark Roundup`;
      const body = `This week: ${itemCount || 0} items saved, ${collectionCount || 0} collections created`;

      await supabase
        .from('notification_queue')
        .insert({
          user_id: user.user_id,
          notification_type: 'weekly_digest',
          title,
          body,
          data: {
            week_stats: {
              items_saved: itemCount || 0,
              collections_created: collectionCount || 0,
            },
          },
          channels: ['push', 'in_app'],
          scheduled_for: now.toISOString(),
          dedup_key: dedupKey,
        });

      results.weeklyDigests++;
    }
  } catch (error) {
    console.error('Error scheduling weekly digests:', error);
  }
}

async function scheduleCollectionUpdates(supabase: any, results: any) {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);

    const { data: users } = await supabase
      .from('notification_preferences')
      .select('user_id, collection_update_threshold, enable_collection_updates, enable_push_notifications')
      .eq('enable_collection_updates', true)
      .eq('enable_push_notifications', true);

    if (!users) return;

    for (const user of users) {
      const threshold = user.collection_update_threshold || 5;

      const { data: folders } = await supabase
        .from('folders')
        .select(`
          id,
          name,
          item_folders (count)
        `)
        .eq('user_id', user.user_id);

      if (!folders) continue;

      for (const folder of folders) {
        const { count: recentCount } = await supabase
          .from('item_folders')
          .select('id', { count: 'exact', head: true })
          .eq('folder_id', folder.id)
          .gte('created_at', oneHourAgo.toISOString());

        if ((recentCount || 0) < threshold) continue;

        const dedupKey = `collection-${folder.id}-${now.toISOString().split('T')[0]}`;

        const { data: existing } = await supabase
          .from('notification_queue')
          .select('id')
          .eq('dedup_key', dedupKey)
          .eq('status', 'pending')
          .limit(1);

        if (existing && existing.length > 0) continue;

        const title = `Collection Growing`;
        const body = `${folder.name} has ${recentCount} new items`;

        await supabase
          .from('notification_queue')
          .insert({
            user_id: user.user_id,
            notification_type: 'collection_update',
            title,
            body,
            data: {
              folder_id: folder.id,
              folder_name: folder.name,
              new_items_count: recentCount,
            },
            channels: ['push', 'in_app'],
            scheduled_for: now.toISOString(),
            dedup_key: dedupKey,
          });

        results.collectionUpdates++;
      }
    }
  } catch (error) {
    console.error('Error scheduling collection updates:', error);
  }
}
