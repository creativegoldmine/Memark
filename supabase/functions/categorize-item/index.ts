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
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { itemId, content, userId, metadata: userMetadata } = await req.json();

    let metadata = null;
    let ogMetadata = null;
    let embedData = null;
    const urlMatch = content.match(/https?:\/\/[^\s]+/);

    if (urlMatch) {
      const url = urlMatch[0];

      embedData = await fetchEmbedData(url);
      metadata = await fetchLinkMetadata(url);
      ogMetadata = metadata?.ogData || null;
    }

    let type = 'text';
    let title = metadata?.title || content.substring(0, 60);
    let summary = metadata?.description || '';
    let tags: string[] = [];
    let category = userMetadata?.contentType || 'General';
    let imagePreview = metadata?.image || null;
    let score = 70;

    let previewTitle = embedData?.title || metadata?.title || title;
    let previewDesc = embedData?.description || metadata?.description || summary;
    let previewImageUrl = embedData?.thumbnail_url || metadata?.image || imagePreview;

    if (openaiApiKey) {
      const aiResult = await categorizeWithAI(openaiApiKey, content, metadata, userMetadata);
      if (aiResult) {
        type = aiResult.type || type;
        title = aiResult.title || title;
        summary = aiResult.summary || summary;
        tags = aiResult.tags || tags;
        category = aiResult.category || category;
        score = aiResult.score || score;
      }
    }

    const updateData: any = {
      type,
      title,
      summary,
      tags,
      category,
      image_preview: imagePreview,
      score,
      preview_title: previewTitle,
      preview_desc: previewDesc,
      preview_image_url: previewImageUrl,
      preview_fetched_at: new Date().toISOString(),
    };

    if (metadata?.videoUrl) {
      updateData.video_url = metadata.videoUrl;
      updateData.type = 'video';
    }

    if (embedData) {
      updateData.embed_type = embedData.type;
      updateData.embed_html = embedData.html;
    }

    if (ogMetadata) {
      updateData.og_title = ogMetadata.og_title;
      updateData.og_description = ogMetadata.og_description;
      updateData.og_image = ogMetadata.og_image;
      updateData.og_site_name = ogMetadata.og_site_name;
      updateData.og_url = ogMetadata.og_url;
      updateData.og_type = ogMetadata.og_type;
      updateData.og_author = ogMetadata.og_author;
      updateData.og_published_time = ogMetadata.og_published_time;
    }

    const { data: item } = await supabase
      .from('items')
      .update(updateData)
      .eq('id', itemId)
      .select()
      .single();

    if (item) {
      await supabase.from('ai_event_log').insert({
        user_id: userId,
        item_id: itemId,
        event_type: 'categorize',
        metadata: {
          type,
          category,
          score,
          hasVideo: !!metadata?.videoUrl,
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        type,
        title,
        summary,
        tags,
        category,
        score,
        preview: {
          title: previewTitle,
          description: previewDesc,
          image: previewImageUrl,
          embedType: embedData?.type,
          videoUrl: metadata?.videoUrl,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in categorize-item:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function fetchLinkMetadata(url: string) {
  try {
    let finalUrl = url;

    if (url.includes('x.com') || url.includes('twitter.com')) {
      finalUrl = url.replace('x.com', 'fxtwitter.com').replace('twitter.com', 'fxtwitter.com');
    }

    const response = await fetch(finalUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Memark/1.0; +http://memark.app)',
      },
    });

    if (!response.ok) return null;

    const html = await response.text();
    const ogData: any = {};
    let videoUrl = null;

    const ogTagRegex = /<meta\s+property=["']og:([^"']+)["']\s+content=["']([^"']+)["']/gi;
    let match;
    while ((match = ogTagRegex.exec(html)) !== null) {
      const [, property, content] = match;
      ogData[`og_${property.replace(':', '_')}`] = content;
    }

    const videoMatch = html.match(/<meta\s+property=["']og:video["']\s+content=["']([^"']+)["']/i);
    if (videoMatch) {
      videoUrl = videoMatch[1];
    }

    const videoSecureMatch = html.match(/<meta\s+property=["']og:video:secure_url["']\s+content=["']([^"']+)["']/i);
    if (videoSecureMatch) {
      videoUrl = videoSecureMatch[1];
    }

    if (!videoUrl) {
      const twitterPlayerMatch = html.match(/<meta\s+property=["']twitter:player:stream["']\s+content=["']([^"']+)["']/i);
      if (twitterPlayerMatch) {
        videoUrl = twitterPlayerMatch[1];
      }
    }

    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
    const imageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);

    return {
      title: ogData.og_title || (titleMatch && titleMatch[1]) || '',
      description: ogData.og_description || (descMatch && descMatch[1]) || '',
      image: ogData.og_image || (imageMatch && imageMatch[1]) || null,
      videoUrl: videoUrl || ogData.og_video || ogData.og_video_secure_url || null,
      ogData,
    };
  } catch (error) {
    console.error('Error fetching metadata:', error);
    return null;
  }
}

async function fetchEmbedData(url: string) {
  try {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/)?.[1];
      if (videoId) {
        return {
          type: 'youtube',
          html: `<iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`,
          title: `YouTube Video: ${videoId}`,
          description: '',
          thumbnail_url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        };
      }
    }

    if (url.includes('x.com') || url.includes('twitter.com')) {
      const tweetId = url.match(/status\/(\d+)/)?.[1];
      if (tweetId) {
        return {
          type: 'twitter',
          html: '',
          title: '',
          description: '',
          thumbnail_url: null,
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching embed data:', error);
    return null;
  }
}

async function categorizeWithAI(apiKey: string, content: string, metadata: any, userMetadata: any) {
  try {
    const prompt = `Analyze this content and provide a JSON response with: type (text/link/article/video/note/screenshot), title, summary, tags (array), category, score (1-100 relevance).

Content: ${content}
Metadata: ${JSON.stringify(metadata || {})}
User context: ${JSON.stringify(userMetadata || {})}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const result = data.choices[0]?.message?.content;

    if (!result) return null;

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return null;
  } catch (error) {
    console.error('Error in AI categorization:', error);
    return null;
  }
}
