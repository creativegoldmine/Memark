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

    const body = await req.json();
    const { limit = 50, platforms, onlyStale = false } = body;

    let query = supabase
      .from('items')
      .select('id, raw_content, user_id, og_image, og_title, og_description, preview_fetched_at')
      .eq('user_id', user.id)
      .not('raw_content', 'is', null);

    if (platforms && platforms.length > 0) {
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

      if (platformConditions) {
        query = query.or(platformConditions);
      }
    } else {
      query = query.like('raw_content', '%http%');
    }

    if (onlyStale) {
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 7);
      query = query.or(`preview_fetched_at.is.null,preview_fetched_at.lt.${staleDate.toISOString()}`);
    }

    const { data: items, error: itemsError } = await query
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
          }),
        });

        if (response.ok) {
          const result = await response.json();

          if (result.success && result.metadata) {
            const metadata = result.metadata;

            const updateData: any = {
              preview_fetched_at: new Date().toISOString(),
            };

            if (metadata.og_title) updateData.og_title = metadata.og_title;
            if (metadata.og_description) updateData.og_description = metadata.og_description;
            if (metadata.og_image) updateData.og_image = metadata.og_image;
            if (metadata.og_site_name) updateData.og_site_name = metadata.og_site_name;
            if (metadata.og_url) updateData.og_url = metadata.og_url;
            if (metadata.og_type) updateData.og_type = metadata.og_type;
            if (metadata.og_author) updateData.og_author = metadata.og_author;
            if (metadata.author_name) updateData.author_name = metadata.author_name;
            if (metadata.author_avatar) updateData.author_avatar = metadata.author_avatar;
            if (metadata.platform_type) updateData.platform_type = metadata.platform_type;
            if (metadata.embed_html) updateData.embed_html = metadata.embed_html;
            if (metadata.embed_metadata) updateData.embed_metadata = metadata.embed_metadata;
            if (metadata.content_duration) updateData.content_duration = metadata.content_duration;
            if (metadata.published_date) updateData.published_date = metadata.published_date;

            const { error: updateError } = await supabase
              .from('items')
              .update(updateData)
              .eq('id', item.id);

            if (updateError) {
              results.failed++;
              results.errors.push({
                itemId: item.id,
                error: `Database update failed: ${updateError.message}`,
              });
            } else {
              results.updated++;
            }
          } else {
            results.failed++;
            results.errors.push({
              itemId: item.id,
              error: 'No metadata returned',
            });
          }
        } else {
          results.failed++;
          const errorText = await response.text();
          results.errors.push({
            itemId: item.id,
            error: `HTTP ${response.status}: ${errorText}`,
          });
        }
      } catch (error) {
        console.error(`Failed to process item ${item.id}:`, error);
        results.failed++;
        results.errors.push({
          itemId: item.id,
          url: item.raw_content?.substring(0, 100),
          error: error.message,
        });
      }

      await new Promise(resolve => setTimeout(resolve, 300));
    }

    const message = `Refresh complete: ${results.updated} embeds updated, ${results.failed} failed out of ${results.processed} items processed`;
    console.log('Batch refresh complete:', { processed: results.processed, updated: results.updated, failed: results.failed });

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.processed,
        updated: results.updated,
        failed: results.failed,
        message,
        errors: results.errors.length > 0 ? results.errors.slice(0, 10) : undefined,
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
        details: error.stack?.substring(0, 200),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
