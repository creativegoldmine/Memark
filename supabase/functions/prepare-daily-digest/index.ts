import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface DigestItem {
  id: string;
  title: string;
  url: string;
  category: string;
  days_overdue: number;
  review_stage: number;
  score?: number;
}

interface UserDigest {
  user_id: string;
  email: string;
  due_today: DigestItem[];
  overdue: DigestItem[];
  high_priority: DigestItem[];
  stats: {
    total_due: number;
    total_overdue: number;
    streak: number;
  };
}

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

    const { user_id, send_email = false } = await req.json();

    let userIds: string[] = [];

    if (user_id) {
      userIds = [user_id];
    } else {
      const { data: users } = await supabase
        .from('users')
        .select('id')
        .eq('plan_type', 'pro');

      if (users) {
        userIds = users.map(u => u.id);
      }
    }

    const digests: UserDigest[] = [];

    for (const userId of userIds) {
      const { data: user } = await supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .single();

      if (!user) continue;

      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('enable_daily_digest')
        .eq('user_id', userId)
        .maybeSingle();

      if (prefs && !prefs.enable_daily_digest) continue;

      const now = new Date();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: items } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .lte('next_review_date', now.toISOString())
        .order('next_review_date', { ascending: true })
        .limit(50);

      if (!items || items.length === 0) continue;

      const dueToday: DigestItem[] = [];
      const overdue: DigestItem[] = [];
      const highPriority: DigestItem[] = [];

      for (const item of items) {
        const reviewDate = new Date(item.next_review_date);
        const daysOverdue = Math.floor((now.getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24));

        const digestItem: DigestItem = {
          id: item.id,
          title: item.title || item.raw_content.substring(0, 100),
          url: item.raw_content.startsWith('http') ? item.raw_content : '',
          category: item.category || 'Uncategorized',
          days_overdue: daysOverdue,
          review_stage: item.review_stage || 1,
          score: item.score,
        };

        if (reviewDate >= today && reviewDate < tomorrow) {
          dueToday.push(digestItem);
        }

        if (daysOverdue > 0) {
          overdue.push(digestItem);
        }

        if (item.score && item.score >= 80) {
          highPriority.push(digestItem);
        } else if (daysOverdue > 7) {
          highPriority.push(digestItem);
        }
      }

      const { data: reviewHistory } = await supabase
        .from('items')
        .select('last_reviewed_at')
        .eq('user_id', userId)
        .not('last_reviewed_at', 'is', null)
        .order('last_reviewed_at', { ascending: false })
        .limit(100);

      let streak = 0;
      if (reviewHistory && reviewHistory.length > 0) {
        let currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);

        for (let i = 0; i < 365; i++) {
          const dateStr = currentDate.toISOString().split('T')[0];
          const hasReview = reviewHistory.some((item) => {
            if (!item.last_reviewed_at) return false;
            const reviewDate = new Date(item.last_reviewed_at).toISOString().split('T')[0];
            return reviewDate === dateStr;
          });

          if (hasReview) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
          } else {
            if (i === 0) {
              currentDate.setDate(currentDate.getDate() - 1);
              continue;
            }
            break;
          }
        }
      }

      const digest: UserDigest = {
        user_id: userId,
        email: user.email,
        due_today: dueToday.slice(0, 10),
        overdue: overdue.slice(0, 10),
        high_priority: highPriority.slice(0, 5),
        stats: {
          total_due: dueToday.length,
          total_overdue: overdue.length,
          streak,
        },
      };

      digests.push(digest);

      if (send_email && (dueToday.length > 0 || overdue.length > 0)) {
        await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            type: 'daily_digest',
            title: `Daily Review: ${dueToday.length + overdue.length} items waiting`,
            message: generateDigestMessage(digest),
            data: {
              due_count: dueToday.length,
              overdue_count: overdue.length,
              streak,
            },
            scheduled_for: new Date().toISOString(),
          });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        digests_prepared: digests.length,
        digests: digests.length <= 10 ? digests : digests.slice(0, 10),
        total_users: userIds.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error preparing daily digest:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function generateDigestMessage(digest: UserDigest): string {
  let message = '';

  if (digest.stats.streak > 0) {
    message += `You're on a ${digest.stats.streak}-day review streak! `;
  }

  if (digest.due_today.length > 0) {
    message += `${digest.due_today.length} item${digest.due_today.length !== 1 ? 's' : ''} due today. `;
  }

  if (digest.overdue.length > 0) {
    message += `${digest.overdue.length} item${digest.overdue.length !== 1 ? 's' : ''} overdue. `;
  }

  if (digest.high_priority.length > 0) {
    message += `${digest.high_priority.length} high-priority item${digest.high_priority.length !== 1 ? 's' : ''} need attention.`;
  }

  return message.trim();
}
