import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface SimulateRequest {
  action: 'send' | 'list_test_users' | 'load_test' | 'cleanup' | 'get_logs';
  fromPhone?: string;
  body?: string;
  mediaUrls?: string[];
  concurrentUsers?: number;
  messagesPerUser?: number;
}

interface LoadTestResult {
  totalSent: number;
  succeeded: number;
  failed: number;
  userNotFound: number;
  avgDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  isolationViolations: number;
}

async function forwardToWebhook(
  supabaseUrl: string,
  supabaseAnonKey: string,
  fromPhone: string,
  body: string,
  mediaUrls: string[] = []
): Promise<{ status: number; data: unknown; durationMs: number }> {
  const start = Date.now();

  const formData = new URLSearchParams();
  formData.append('From', fromPhone);
  formData.append('Body', body);
  formData.append('NumMedia', String(mediaUrls.length));
  formData.append('MessageSid', `SIM${Date.now()}${Math.random().toString(36).slice(2)}`);
  mediaUrls.forEach((url, i) => formData.append(`MediaUrl${i}`, url));

  const response = await fetch(`${supabaseUrl}/functions/v1/sms-webhook`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'x-memark-test-mode': 'true',
    },
    body: formData.toString(),
  });

  const data = await response.json();
  return { status: response.status, data, durationMs: Date.now() - start };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { data: callerProfile } = await supabase
    .from('users')
    .select('is_superadmin')
    .eq('id', user.id)
    .maybeSingle();

  if (!callerProfile?.is_superadmin) {
    return new Response(
      JSON.stringify({ error: 'Forbidden: superadmin only' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const payload: SimulateRequest = await req.json();

    if (payload.action === 'list_test_users') {
      const { data: testUsers } = await supabase
        .from('test_users')
        .select('user_id, test_label, created_at, users(id, name, email, phone_number)')
        .order('created_at', { ascending: true });

      return new Response(
        JSON.stringify({ testUsers: testUsers || [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (payload.action === 'get_logs') {
      const { data: logs } = await supabase
        .from('webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      return new Response(
        JSON.stringify({ logs: logs || [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (payload.action === 'send') {
      if (!payload.fromPhone || !payload.body) {
        return new Response(
          JSON.stringify({ error: 'fromPhone and body are required for send action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = await forwardToWebhook(
        supabaseUrl,
        supabaseAnonKey,
        payload.fromPhone,
        payload.body,
        payload.mediaUrls || []
      );

      return new Response(
        JSON.stringify({ result }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (payload.action === 'load_test') {
      const { data: testUserRows } = await supabase
        .from('test_users')
        .select('user_id, users(phone_number)')
        .limit(payload.concurrentUsers || 10);

      if (!testUserRows || testUserRows.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No test users found. Run seed first.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const messagesPerUser = payload.messagesPerUser || 3;
      const testMessages = [
        'Check out this article https://example.com/article',
        'Important meeting notes from today tech discussion',
        'Recipe idea for weekend food cooking',
        'https://youtube.com/watch?v=dQw4w9WgXcQ great video',
        'Remember to follow up on this business proposal',
      ];

      const tasks: Promise<{ userId: string; phone: string; status: number; durationMs: number; itemId?: string }>[] = [];

      for (const row of testUserRows) {
        const phone = (row as unknown as { users: { phone_number: string } }).users?.phone_number;
        if (!phone) continue;

        for (let m = 0; m < messagesPerUser; m++) {
          const msg = testMessages[m % testMessages.length];
          tasks.push(
            forwardToWebhook(supabaseUrl, supabaseAnonKey, phone, msg).then(r => ({
              userId: row.user_id,
              phone,
              status: r.status,
              durationMs: r.durationMs,
              itemId: (r.data as { itemId?: string })?.itemId,
            }))
          );
        }
      }

      const results = await Promise.all(tasks);

      const succeeded = results.filter(r => r.status === 200);
      const failed = results.filter(r => r.status === 500);
      const userNotFound = results.filter(r => r.status === 404);
      const durations = results.map(r => r.durationMs);

      const isolationViolations: number[] = [];
      for (const res of succeeded) {
        if (!res.itemId) continue;
        const { data: item } = await supabase
          .from('items')
          .select('user_id')
          .eq('id', res.itemId)
          .maybeSingle();

        if (item && item.user_id !== res.userId) {
          isolationViolations.push(1);
        }
      }

      const loadTestResult: LoadTestResult = {
        totalSent: results.length,
        succeeded: succeeded.length,
        failed: failed.length,
        userNotFound: userNotFound.length,
        avgDurationMs: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
        minDurationMs: Math.min(...durations),
        maxDurationMs: Math.max(...durations),
        isolationViolations: isolationViolations.length,
      };

      return new Response(
        JSON.stringify({ loadTestResult }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (payload.action === 'cleanup') {
      const { data: testUserRows } = await supabase
        .from('test_users')
        .select('user_id');

      if (testUserRows && testUserRows.length > 0) {
        const ids = testUserRows.map(r => r.user_id);
        await supabase.from('items').delete().in('user_id', ids);
        await supabase.from('webhook_logs').delete().eq('source', 'test_simulator');
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Test data cleaned up' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Unknown action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Simulator error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
