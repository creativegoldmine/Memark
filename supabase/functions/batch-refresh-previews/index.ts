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

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { itemIds, onlyStale } = await req.json();

    let query = supabase
      .from('items')
      .select('id, raw_content, user_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (itemIds && itemIds.length > 0) {
      query = query.in('id', itemIds);
    }

    if (onlyStale) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      query = query.or(`preview_fetched_at.is.null,preview_fetched_at.lt.${sevenDaysAgo.toISOString()}`);
    }

    const { data: items, error: itemsError } = await query.limit(100);

    if (itemsError) throw itemsError;

    const results = {
      total: items?.length || 0,
      refreshed: 0,
      failed: 0,
      errors: [] as any[],
    };

    for (const item of items || []) {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/categorize-item`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            itemId: item.id,
            content: item.raw_content,
            userId: item.user_id,
          }),
        });

        if (response.ok) {
          results.refreshed++;
        } else {
          results.failed++;
          results.errors.push({
            itemId: item.id,
            error: `HTTP ${response.status}`,
          });
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          itemId: item.id,
          error: error.message,
        });
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Batch refresh error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
