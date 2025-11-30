import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ImportRequest {
  bookmarks: Array<{
    url: string;
    title?: string;
    created_at?: string;
  }>;
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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { bookmarks } = await req.json() as ImportRequest;

    if (!bookmarks || !Array.isArray(bookmarks) || bookmarks.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No bookmarks provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const imported: string[] = [];
    const failed: Array<{ url: string; error: string }> = [];

    for (const bookmark of bookmarks) {
      try {
        const { data: item, error: insertError } = await supabase
          .from('items')
          .insert({
            user_id: user.id,
            raw_content: bookmark.url,
            type: 'article',
            title: bookmark.title || null,
            status: 'active',
            review_stage: 1,
            next_review_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            created_at: bookmark.created_at || new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) {
          failed.push({ url: bookmark.url, error: insertError.message });
          continue;
        }

        await fetch(
          `${supabaseUrl}/functions/v1/categorize-item`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              itemId: item.id, 
              content: bookmark.url,
              userId: user.id
            }),
          }
        );

        imported.push(item.id);
      } catch (error) {
        failed.push({ url: bookmark.url, error: String(error) });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        imported: imported.length,
        failed: failed.length,
        details: { imported, failed }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error importing bookmarks:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});