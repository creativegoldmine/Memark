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

    console.log('🔄 Starting admin batch refresh for ALL users...');

    // Get all items with URLs
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('id, raw_content, user_id, og_image, og_title, platform_type')
      .not('raw_content', 'is', null)
      .like('raw_content', '%http%')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (itemsError) {
      console.error('Error fetching items:', itemsError);
      throw itemsError;
    }

    console.log(`📊 Found ${items?.length || 0} items with URLs to refresh`);

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

        console.log(`Processing item ${item.id}: ${urlMatch[0].substring(0, 50)}...`);

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
              console.error(`Failed to update item ${item.id}:`, updateError);
              results.failed++;
              results.errors.push({
                itemId: item.id,
                error: `Database update failed: ${updateError.message}`,
              });
            } else {
              results.updated++;
              console.log(`✅ Updated item ${item.id} - ${results.updated}/${results.processed}`);
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
          console.error(`Failed to fetch metadata for item ${item.id}:`, errorText);
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

      // Rate limiting - 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const message = `Admin batch refresh complete: ${results.updated} items updated, ${results.failed} failed out of ${results.processed} processed`;
    console.log('✅', message);

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.processed,
        updated: results.updated,
        failed: results.failed,
        message,
        errors: results.errors.length > 0 ? results.errors.slice(0, 20) : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Admin batch refresh error:', error);
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
