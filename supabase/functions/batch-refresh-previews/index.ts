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

    const { userId, limit = 50, platforms = ['twitter', 'instagram', 'youtube', 'tiktok', 'vimeo', 'facebook'] } = await req.json();

    if (userId && userId !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized to refresh other users items' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const platformPatterns = {
      twitter: "raw_content ILIKE '%twitter.com%' OR raw_content ILIKE '%x.com%'",
      instagram: "raw_content ILIKE '%instagram.com%'",
      youtube: "raw_content ILIKE '%youtube.com%' OR raw_content ILIKE '%youtu.be%'",
      tiktok: "raw_content ILIKE '%tiktok.com%'",
      vimeo: "raw_content ILIKE '%vimeo.com%'",
      facebook: "raw_content ILIKE '%facebook.com%'"
    };

    const platformConditions = platforms
      .filter(p => platformPatterns[p])
      .map(p => `(${platformPatterns[p]})`)
      .join(' OR ');

    if (!platformConditions) {
      return new Response(
        JSON.stringify({ error: 'No valid platforms specified' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('id, raw_content, user_id')
      .eq('user_id', user.id)
      .or(platformConditions)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (itemsError) throw itemsError;

    const results = {
      processed: items?.length || 0,
      updated: 0,
      failed: 0,
      errors: [] as any[],
    };

    for (const item of items || []) {
      try {
        const urlMatch = item.raw_content.match(/(https?:\/\/[^\s]+)/);
        if (!urlMatch) {
          results.failed++;
          continue;
        }

        const response = await fetch(`${supabaseUrl}/functions/v1/fetch-link-metadata`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            url: urlMatch[0],
            itemId: item.id,
          }),
        });

        if (response.ok) {
          results.updated++;
        } else {
          results.failed++;
          const errorText = await response.text();
          results.errors.push({
            itemId: item.id,
            error: `HTTP ${response.status}: ${errorText}`,
          });
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          itemId: item.id,
          error: error.message,
        });
      }

      await new Promise(resolve => setTimeout(resolve, 300));
    }

    const message = `Refresh complete: ${results.updated} embeds updated, ${results.failed} failed out of ${results.processed} items processed`;

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.processed,
        updated: results.updated,
        failed: results.failed,
        message,
        errors: results.errors.length > 0 ? results.errors.slice(0, 5) : undefined,
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
        success: false,
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
