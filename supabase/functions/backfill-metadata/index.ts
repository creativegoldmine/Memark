import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

async function fetchLinkMetadata(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    const ogTitle = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i)?.[1];
    const ogDescription = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i)?.[1];
    const ogImage = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i)?.[1];
    const ogSiteName = html.match(/<meta\s+property=["']og:site_name["']\s+content=["']([^"']+)["']/i)?.[1];
    const ogUrl = html.match(/<meta\s+property=["']og:url["']\s+content=["']([^"']+)["']/i)?.[1];
    const ogType = html.match(/<meta\s+property=["']og:type["']\s+content=["']([^"']+)["']/i)?.[1];
    const ogAuthor = html.match(/<meta\s+property=["'](?:og:author|article:author)["']\s+content=["']([^"']+)["']/i)?.[1];
    const ogPublishedTime = html.match(/<meta\s+property=["']article:published_time["']\s+content=["']([^"']+)["']/i)?.[1];

    const twitterTitle = html.match(/<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']/i)?.[1];
    const twitterDescription = html.match(/<meta\s+name=["']twitter:description["']\s+content=["']([^"']+)["']/i)?.[1];
    const twitterImage = html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i)?.[1];

    const htmlTitle = html.match(/<title>([^<]+)<\/title>/i)?.[1];
    const metaDescription = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)?.[1];

    return {
      og_title: ogTitle || twitterTitle || htmlTitle,
      og_description: ogDescription || twitterDescription || metaDescription,
      og_image: ogImage || twitterImage,
      og_site_name: ogSiteName,
      og_url: ogUrl || url,
      og_type: ogType,
      og_author: ogAuthor,
      og_published_time: ogPublishedTime,
    };
  } catch (error) {
    console.error(`Error fetching metadata for ${url}:`, error);
    return null;
  }
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

    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('id, raw_content, type')
      .eq('user_id', userId)
      .eq('type', 'link')
      .is('og_title', null)
      .order('created_at', { ascending: false });

    if (itemsError) {
      throw itemsError;
    }

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No items need metadata', processed: 0 }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let processed = 0;
    let failed = 0;
    let skipped = 0;
    const batchSize = 5;

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      const promises = batch.map(async (item) => {
        try {
          const urlMatch = item.raw_content.match(/https?:\/\/[^\s]+/);
          if (!urlMatch) {
            skipped++;
            return;
          }

          const url = urlMatch[0];
          const metadata = await fetchLinkMetadata(url);

          if (!metadata || !metadata.og_title) {
            failed++;
            return;
          }

          await supabase
            .from('items')
            .update({
              og_title: metadata.og_title,
              og_description: metadata.og_description,
              og_image: metadata.og_image,
              og_site_name: metadata.og_site_name,
              og_url: metadata.og_url,
              og_type: metadata.og_type,
              og_author: metadata.og_author,
              og_published_time: metadata.og_published_time,
            })
            .eq('id', item.id);

          processed++;
        } catch (error) {
          failed++;
          console.error(`Error processing item ${item.id}:`, error);
        }
      });

      await Promise.all(promises);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalItems: items.length,
        processed,
        failed,
        skipped,
        message: `Processed ${processed} items, ${failed} failed, ${skipped} skipped`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in backfill-metadata:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});