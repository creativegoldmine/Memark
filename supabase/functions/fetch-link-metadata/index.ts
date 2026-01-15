const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface Metadata {
  og_title?: string;
  og_description?: string;
  og_image?: string;
  og_site_name?: string;
  og_url?: string;
  og_type?: string;
  og_author?: string;
  og_published_time?: string;
  author_name?: string;
  author_avatar?: string;
  platform_type?: string;
  embed_html?: string;
  content_duration?: string;
  published_date?: string;
}

function detectPlatform(url: string): string | null {
  const urlLower = url.toLowerCase();

  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
    return 'youtube';
  }
  if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) {
    return 'twitter';
  }
  if (urlLower.includes('instagram.com')) {
    return 'instagram';
  }
  if (urlLower.includes('tiktok.com')) {
    return 'tiktok';
  }
  if (urlLower.includes('reddit.com')) {
    return 'reddit';
  }
  if (urlLower.includes('linkedin.com')) {
    return 'linkedin';
  }
  if (urlLower.includes('medium.com')) {
    return 'medium';
  }
  if (urlLower.includes('github.com')) {
    return 'github';
  }
  if (urlLower.includes('vimeo.com')) {
    return 'vimeo';
  }

  return null;
}

function extractMetadata(html: string, url: string): Metadata {
  const metadata: Metadata = {};

  const ogTagRegex = /<meta\s+property=["']og:([^"']+)["']\s+content=["']([^"']+)["']/gi;
  let match;
  while ((match = ogTagRegex.exec(html)) !== null) {
    const property = match[1];
    const content = match[2];

    switch (property) {
      case 'title':
        metadata.og_title = content;
        break;
      case 'description':
        metadata.og_description = content;
        break;
      case 'image':
        metadata.og_image = content;
        break;
      case 'site_name':
        metadata.og_site_name = content;
        break;
      case 'url':
        metadata.og_url = content;
        break;
      case 'type':
        metadata.og_type = content;
        break;
      case 'author':
        metadata.og_author = content;
        break;
      case 'article:published_time':
        metadata.og_published_time = content;
        metadata.published_date = content;
        break;
      case 'video:duration':
        metadata.content_duration = content;
        break;
    }
  }

  const twitterTagRegex = /<meta\s+name=["']twitter:([^"']+)["']\s+content=["']([^"']+)["']/gi;
  while ((match = twitterTagRegex.exec(html)) !== null) {
    const property = match[1];
    const content = match[2];

    if (property === 'creator' && !metadata.author_name) {
      metadata.author_name = content.replace('@', '');
    }
    if (property === 'image' && !metadata.og_image) {
      metadata.og_image = content;
    }
  }

  if (!metadata.og_title) {
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) {
      metadata.og_title = titleMatch[1];
    }
  }

  if (!metadata.og_description) {
    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
    if (descMatch) {
      metadata.og_description = descMatch[1];
    }
  }

  if (!metadata.og_url) {
    metadata.og_url = url;
  }

  metadata.platform_type = detectPlatform(url);

  return metadata;
}

async function fetchYouTubeData(url: string): Promise<Metadata | null> {
  try {
    const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?\/]+)/);
    if (!videoIdMatch) return null;

    const videoId = videoIdMatch[1];
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;

    const response = await fetch(oembedUrl);
    if (!response.ok) return null;

    const data = await response.json();

    return {
      og_title: data.title || '',
      og_description: `YouTube video by ${data.author_name}`,
      og_image: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      og_site_name: 'YouTube',
      og_url: url,
      og_type: 'video',
      author_name: data.author_name || '',
      author_avatar: '',
      platform_type: 'youtube',
      embed_html: data.html || '',
    };
  } catch (error) {
    console.error('YouTube embed error:', error);
    return null;
  }
}

async function fetchTwitterEmbed(url: string): Promise<Metadata | null> {
  try {
    const twitterOembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`;
    const response = await fetch(twitterOembedUrl);

    if (!response.ok) return null;

    const data = await response.json();

    const htmlText = data.html?.replace(/<[^>]*>/g, '').substring(0, 200) || '';

    return {
      og_title: data.author_name ? `${data.author_name} on X` : 'Post on X',
      og_description: htmlText,
      og_image: data.thumbnail_url || '',
      og_site_name: 'X (formerly Twitter)',
      og_url: url,
      og_type: 'article',
      og_author: data.author_name || '',
      author_name: data.author_name || '',
      author_avatar: '',
      platform_type: 'twitter',
      embed_html: data.html || '',
    };
  } catch (error) {
    console.error('Twitter embed error:', error);
    return null;
  }
}

async function fetchInstagramData(url: string): Promise<Metadata | null> {
  try {
    const oembedUrl = `https://graph.facebook.com/v12.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=INSTAGRAM_ACCESS_TOKEN`;

    const response = await fetch(oembedUrl);
    if (!response.ok) return null;

    const data = await response.json();

    return {
      og_title: data.author_name ? `${data.author_name} on Instagram` : 'Instagram Post',
      og_description: 'Instagram post',
      og_image: data.thumbnail_url || '',
      og_site_name: 'Instagram',
      og_url: url,
      og_type: 'photo',
      author_name: data.author_name || '',
      author_avatar: '',
      platform_type: 'instagram',
      embed_html: data.html || '',
    };
  } catch (error) {
    console.error('Instagram embed error:', error);
    return null;
  }
}

async function fetchTikTokData(url: string): Promise<Metadata | null> {
  try {
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;

    const response = await fetch(oembedUrl);
    if (!response.ok) return null;

    const data = await response.json();

    return {
      og_title: data.title || 'TikTok Video',
      og_description: data.author_name ? `Video by ${data.author_name}` : '',
      og_image: data.thumbnail_url || '',
      og_site_name: 'TikTok',
      og_url: url,
      og_type: 'video',
      author_name: data.author_name || '',
      author_avatar: '',
      platform_type: 'tiktok',
      embed_html: data.html || '',
    };
  } catch (error) {
    console.error('TikTok embed error:', error);
    return null;
  }
}

async function fetchVimeoData(url: string): Promise<Metadata | null> {
  try {
    const oembedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`;

    const response = await fetch(oembedUrl);
    if (!response.ok) return null;

    const data = await response.json();

    const durationSeconds = data.duration;
    let durationString = '';
    if (durationSeconds) {
      const minutes = Math.floor(durationSeconds / 60);
      const seconds = durationSeconds % 60;
      durationString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    return {
      og_title: data.title || 'Vimeo Video',
      og_description: data.description || `Video by ${data.author_name}`,
      og_image: data.thumbnail_url || '',
      og_site_name: 'Vimeo',
      og_url: url,
      og_type: 'video',
      author_name: data.author_name || '',
      author_avatar: '',
      platform_type: 'vimeo',
      embed_html: data.html || '',
      content_duration: durationString,
    };
  } catch (error) {
    console.error('Vimeo embed error:', error);
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
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const platform = detectPlatform(url);

    if (platform === 'youtube') {
      const youtubeData = await fetchYouTubeData(url);
      if (youtubeData) {
        return new Response(
          JSON.stringify({ success: true, metadata: youtubeData }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    if (platform === 'twitter') {
      const twitterMetadata = await fetchTwitterEmbed(url);
      if (twitterMetadata) {
        return new Response(
          JSON.stringify({ success: true, metadata: twitterMetadata }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    if (platform === 'instagram') {
      const instagramData = await fetchInstagramData(url);
      if (instagramData) {
        return new Response(
          JSON.stringify({ success: true, metadata: instagramData }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    if (platform === 'tiktok') {
      const tiktokData = await fetchTikTokData(url);
      if (tiktokData) {
        return new Response(
          JSON.stringify({ success: true, metadata: tiktokData }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    if (platform === 'vimeo') {
      const vimeoData = await fetchVimeoData(url);
      if (vimeoData) {
        return new Response(
          JSON.stringify({ success: true, metadata: vimeoData }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MeMarkBot/1.0)',
      },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch URL', metadata: {} }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const html = await response.text();
    const metadata = extractMetadata(html, url);

    return new Response(
      JSON.stringify({ success: true, metadata }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error fetching metadata:', error);
    return new Response(
      JSON.stringify({ error: error.message, metadata: {} }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
