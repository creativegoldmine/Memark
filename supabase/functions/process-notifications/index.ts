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
      processed: 0,
      failed: 0,
      skipped: 0,
    };

    await processPendingNotifications(supabase, results);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in process-notifications:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function processPendingNotifications(supabase: any, results: any) {
  try {
    const now = new Date();

    const { data: pending } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', now.toISOString())
      .limit(100);

    if (!pending || pending.length === 0) return;

    for (const notification of pending) {
      try {
        const inQuietHours = await checkQuietHours(notification.user_id, supabase);

        if (inQuietHours) {
          const nextScheduleTime = await getNextAvailableTime(notification.user_id, supabase);

          await supabase
            .from('notification_queue')
            .update({
              scheduled_for: nextScheduleTime,
            })
            .eq('id', notification.id);

          results.skipped++;
          continue;
        }

        if (notification.channels.includes('push')) {
          await sendPushNotification(notification, supabase);
        }

        if (notification.channels.includes('in_app')) {
          await createInAppNotification(notification, supabase);
        }

        await supabase
          .from('notification_queue')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', notification.id);

        results.processed++;
      } catch (error) {
        console.error(`Failed to process notification ${notification.id}:`, error);
        await handleNotificationFailure(notification, error, supabase);
        results.failed++;
      }
    }
  } catch (error) {
    console.error('Error processing pending notifications:', error);
  }
}

async function sendPushNotification(notification: any, supabase: any) {
  try {
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('push_tokens, enable_push_notifications')
      .eq('user_id', notification.user_id)
      .single();

    if (!prefs?.enable_push_notifications || !prefs?.push_tokens?.length) {
      return;
    }

    const expoApiUrl = 'https://exp.host/--/api/v2/push/send';

    const messages = prefs.push_tokens
      .filter((token: string) => token && token.startsWith('ExponentPushToken'))
      .map((token: string) => ({
        to: token,
        sound: 'default',
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        priority: 'high',
        channelId: 'default',
      }));

    if (messages.length === 0) return;

    const response = await fetch(expoApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Expo push failed: ${errorText}`);
    }

    const result = await response.json();

    await supabase
      .from('notification_analytics')
      .insert({
        user_id: notification.user_id,
        event_type: 'sent',
        channel: 'push',
      });

  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
}

async function createInAppNotification(notification: any, supabase: any) {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: notification.user_id,
        notification_type: notification.notification_type,
        title: notification.title,
        body: notification.body,
        data: notification.data,
        is_read: false,
      });

    if (error) {
      console.error('Error creating in-app notification:', error);
      throw error;
    }

    await supabase
      .from('notification_analytics')
      .insert({
        user_id: notification.user_id,
        event_type: 'delivered',
        channel: 'in_app',
      });
  } catch (error) {
    console.error('Error in createInAppNotification:', error);
    throw error;
  }
}

async function handleNotificationFailure(notification: any, error: any, supabase: any) {
  try {
    const retryCount = (notification.retry_count || 0) + 1;
    const maxRetries = notification.max_retries || 3;

    if (retryCount < maxRetries) {
      const retryDelay = Math.pow(2, retryCount) * 60 * 1000;
      const nextRetry = new Date(Date.now() + retryDelay);

      await supabase
        .from('notification_queue')
        .update({
          retry_count: retryCount,
          scheduled_for: nextRetry.toISOString(),
        })
        .eq('id', notification.id);
    } else {
      await supabase
        .from('notification_queue')
        .update({
          status: 'failed',
          failed_reason: error.message || 'Unknown error',
        })
        .eq('id', notification.id);
    }
  } catch (updateError) {
    console.error('Error updating failed notification:', updateError);
  }
}

async function checkQuietHours(userId: string, supabase: any): Promise<boolean> {
  try {
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('quiet_hours_enabled, quiet_hours_start, quiet_hours_end')
      .eq('user_id', userId)
      .single();

    if (!prefs?.quiet_hours_enabled) return false;

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    const startTime = prefs.quiet_hours_start?.slice(0, 5) || '22:00';
    const endTime = prefs.quiet_hours_end?.slice(0, 5) || '08:00';

    if (startTime < endTime) {
      return currentTime >= startTime && currentTime < endTime;
    } else {
      return currentTime >= startTime || currentTime < endTime;
    }
  } catch (error) {
    console.error('Error checking quiet hours:', error);
    return false;
  }
}

async function getNextAvailableTime(userId: string, supabase: any): Promise<string> {
  try {
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('quiet_hours_end')
      .eq('user_id', userId)
      .single();

    const endTime = prefs?.quiet_hours_end || '08:00:00';
    const now = new Date();
    const [hours, minutes] = endTime.split(':').map(Number);

    const nextAvailable = new Date(now);
    nextAvailable.setHours(hours, minutes, 0, 0);

    if (nextAvailable <= now) {
      nextAvailable.setDate(nextAvailable.getDate() + 1);
    }

    return nextAvailable.toISOString();
  } catch (error) {
    console.error('Error getting next available time:', error);
    const oneHour = new Date(Date.now() + 3600000);
    return oneHour.toISOString();
  }
}
