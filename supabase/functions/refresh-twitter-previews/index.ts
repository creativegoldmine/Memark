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

    const { userId, limit = 50 } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: items, error } = await supabase
      .from('items')
      .select('id, raw_content')
      .eq('user_id', userId)
      .or('platform_type.eq.twitter,raw_content.ilike.%x.com%,raw_content.ilike.%twitter.com%')
      .is('preview_image_url', null)
      .limit(limit);

    if (error) {
      console.error('Error fetching items:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No Twitter items found without previews',
          processed: 0,
          updated: 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let updated = 0;

    for (const item of items) {
      try {
        const urlMatch = item.raw_content.match(/https?:\/\/[^\s]+/);
        if (!urlMatch) continue;

        const url = urlMatch[0];
        if (!url.includes('x.com') && !url.includes('twitter.com')) continue;

        const metadata = await fetchEnhancedTwitterMetadata(url);

        if (metadata && metadata.preview_image_url) {
          const { error: updateError } = await supabase
            .from('items')
            .update({
              preview_image_url: metadata.preview_image_url,
              preview_title: metadata.preview_title,
              preview_desc: metadata.preview_desc,
              og_image: metadata.og_image,
              og_title: metadata.og_title,
              og_description: metadata.og_description,
              author_name: metadata.author_name,
              author_avatar: metadata.author_avatar,
              platform_type: 'twitter',
              additional_images: metadata.additional_images,
              media_count: metadata.media_count,
              is_thread: metadata.is_thread,
              thread_preview: metadata.thread_preview,
              thread_length: metadata.thread_length,
              preview_fetched_at: new Date().toISOString(),
            })
            .eq('id', item.id);

          if (!updateError) {
            updated++;
          }
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (itemError) {
        console.error(`Error processing item ${item.id}:`, itemError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: items.length,
        updated,
        message: `Refreshed ${updated} of ${items.length} Twitter items`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in refresh-twitter-previews:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function fetchEnhancedTwitterMetadata(url: string) {
  try {
    const fxUrl = url.replace('twitter.com', 'fxtwitter.com').replace('x.com', 'fxtwitter.com');

    const response = await fetch(fxUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Memark/1.0; +http://memark.app)',
      },
    });

    if (!response.ok) return null;

    const html = await response.text();

    const ogData: any = {};
    const ogTagRegex = /<meta\s+property=["']og:([^"']+)["']\s+content=["']([^"']+)["']/gi;
    let match;
    while ((match = ogTagRegex.exec(html)) !== null) {
      const [, property, content] = match;
      ogData[`og_${property.replace(':', '_')}`] = content;
    }

    const imageUrls: string[] = [];
    const twitterImageRegex = /<meta\s+(?:property|name)=["']twitter:image:?(\d*)["']\s+content=["']([^"']+)["']/gi;
    while ((match = twitterImageRegex.exec(html)) !== null) {
      const imageUrl = match[2];
      if (imageUrl && !imageUrls.includes(imageUrl)) {
        imageUrls.push(imageUrl);
      }
    }

    const authorMatch = html.match(/<meta\s+(?:property|name)=["'](?:twitter:creator|og:site_name)["']\s+content=["']([^"']+)["']/i);
    const authorName = authorMatch ? authorMatch[1].replace('@', '').trim() : null;

    const avatarMatch = html.match(/<meta\s+property=["']twitter:creator:image["']\s+content=["']([^"']+)["']/i);
    const authorAvatar = avatarMatch ? avatarMatch[1] : null;

    const videoMatch = html.match(/<meta\s+property=["']og:video(?::secure_url)?["']\s+content=["']([^"']+)["']/i);
    const videoUrl = videoMatch ? videoMatch[1] : null;

    let description = ogData.og_description || '';
    description = description
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');

    const threadPatterns = [
      /\b\d+\/\d+\b/,
      /thread:/i,
      /🧵/,
      /\(thread\)/i,
    ];
    const isThread = threadPatterns.some(pattern => pattern.test(description));

    let threadPreview = null;
    let threadLength = null;
    if (isThread) {
      threadPreview = description.substring(0, 500);
      const threadMatch = description.match(/\b(\d+)\/(\d+)\b/);
      if (threadMatch) {
        threadLength = parseInt(threadMatch[2], 10);
      }
    }

    const previewImage = imageUrls[0] || ogData.og_image || null;
    const additionalImages = imageUrls.length > 1 ? imageUrls.slice(1) : [];
    const mediaCount = imageUrls.length + (videoUrl ? 1 : 0);

    return {
      preview_image_url: previewImage,
      preview_title: ogData.og_title || (authorName ? `${authorName} on X` : 'Post on X'),
      preview_desc: description,
      og_image: previewImage,
      og_title: ogData.og_title || '',
      og_description: description,
      author_name: authorName,
      author_avatar: authorAvatar,
      additional_images: additionalImages,
      media_count: mediaCount,
      is_thread: isThread,
      thread_preview: threadPreview,
      thread_length: threadLength,
    };
  } catch (error) {
    console.error('Error fetching enhanced Twitter metadata:', error);
    return null;
  }
}
