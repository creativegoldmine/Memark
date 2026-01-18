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
  embed_metadata?: any;
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
  if (urlLower.includes('facebook.com') || urlLower.includes('fb.com')) {
    return 'facebook';
  }
  if (urlLower.includes('vimeo.com')) {
    return 'vimeo';
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

    const thumbnailOptions = [
      `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      `https://img.youtube.com/vi/${videoId}/sddefault.jpg`,
      `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      data.thumbnail_url,
    ];

    let bestThumbnail = data.thumbnail_url || thumbnailOptions[0];

    for (const thumbnailUrl of thumbnailOptions) {
      if (!thumbnailUrl) continue;
      try {
        const thumbResponse = await fetch(thumbnailUrl, { method: 'HEAD' });
        if (thumbResponse.ok) {
          bestThumbnail = thumbnailUrl;
          break;
        }
      } catch {
        continue;
      }
    }

    return {
      og_title: data.title || '',
      og_description: `YouTube video by ${data.author_name}`,
      og_image: bestThumbnail,
      og_site_name: 'YouTube',
      og_url: url,
      og_type: 'video',
      author_name: data.author_name || '',
      author_avatar: '',
      platform_type: 'youtube',
      embed_html: `<iframe width="${data.width || 560}" height="${data.height || 315}" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`,
      embed_metadata: {
        video_id: videoId,
        title: data.title,
        author_name: data.author_name,
        author_url: data.author_url,
        thumbnail_url: data.thumbnail_url,
        thumbnail_options: thumbnailOptions,
        best_thumbnail: bestThumbnail,
        width: data.width,
        height: data.height,
        type: data.type,
        provider_name: data.provider_name,
        provider_url: data.provider_url,
        version: data.version,
      },
    };
  } catch (error) {
    console.error('YouTube embed error:', error);
    return null;
  }
}

async function fetchTwitterEmbed(url: string): Promise<Metadata | null> {
  try {
    const oembedData = await fetchTwitterOembed(url);
    if (!oembedData) {
      return null;
    }

    const tweetIdMatch = url.match(/status\/(\d+)/);
    if (!tweetIdMatch) {
      return oembedData;
    }

    const tweetId = tweetIdMatch[1];
    const usernameMatch = url.match(/(?:twitter\.com|x\.com)\/([^\/]+)\/status/);
    const username = usernameMatch ? usernameMatch[1] : '';

    if (!username) {
      return oembedData;
    }

    try {
      const fxApiUrl = `https://api.fxtwitter.com/${username}/status/${tweetId}`;
      const fxResponse = await fetch(fxApiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MeMarkBot/1.0)',
        },
      });

      if (fxResponse.ok) {
        const fxData = await fxResponse.json();
        const tweet = fxData?.tweet;

        if (tweet) {
          if (tweet.author?.avatar_url) {
            oembedData.author_avatar = tweet.author.avatar_url;
          }

          const imageUrls: string[] = [];

          if (tweet.media?.photos && Array.isArray(tweet.media.photos)) {
            for (const photo of tweet.media.photos) {
              if (photo.url) {
                imageUrls.push(photo.url);
              }
            }
          }

          if (tweet.media?.videos && Array.isArray(tweet.media.videos) && tweet.media.videos.length > 0) {
            const video = tweet.media.videos[0];
            if (video.thumbnail_url) {
              imageUrls.push(video.thumbnail_url);
            }
            if (video.url) {
              oembedData.og_type = 'video';
              if (!oembedData.embed_metadata) {
                oembedData.embed_metadata = {};
              }
              oembedData.embed_metadata.video_url = video.url;
            }
          }

          if (tweet.quote?.media?.photos && Array.isArray(tweet.quote.media.photos)) {
            for (const photo of tweet.quote.media.photos) {
              if (photo.url) {
                imageUrls.push(photo.url);
              }
            }
          }

          if (imageUrls.length > 0) {
            oembedData.og_image = imageUrls[0];
            if (!oembedData.embed_metadata) {
              oembedData.embed_metadata = {};
            }
            oembedData.embed_metadata.additional_images = imageUrls;
          }
        }
      }
    } catch (fxError) {
      console.log('FxTwitter API enrichment failed, using oEmbed data only:', fxError);
    }

    return oembedData;
  } catch (error) {
    console.error('Twitter embed error:', error);
    return null;
  }
}

async function fetchTwitterOembed(url: string): Promise<Metadata | null> {
  try {
    const twitterOembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`;
    const response = await fetch(twitterOembedUrl);

    if (!response.ok) return null;

    const data = await response.json();

    const htmlText = data.html?.replace(/<[^>]*>/g, '').substring(0, 280) || '';

    return {
      og_title: data.author_name ? `${data.author_name} on X` : 'Post on X',
      og_description: htmlText,
      og_image: '',
      og_site_name: 'X (formerly Twitter)',
      og_url: url,
      og_type: 'article',
      og_author: data.author_name || '',
      author_name: data.author_name || '',
      author_avatar: '',
      platform_type: 'twitter',
      embed_html: data.html || '',
      embed_metadata: {
        url: data.url,
        author_name: data.author_name,
        author_url: data.author_url,
        html: data.html,
        width: data.width,
        height: data.height,
        type: data.type,
        cache_age: data.cache_age,
        provider_name: data.provider_name,
        provider_url: data.provider_url,
        version: data.version,
      },
    };
  } catch (error) {
    console.error('Twitter oEmbed fallback error:', error);
    return null;
  }
}

async function fetchInstagramData(url: string): Promise<Metadata | null> {
  try {
    const oembedUrl = `https://graph.facebook.com/v18.0/instagram_oembed?url=${encodeURIComponent(url)}&omitscript=true&access_token=`;

    const response = await fetch(oembedUrl);
    if (response.ok) {
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
        embed_metadata: {
          author_name: data.author_name,
          author_url: data.author_url,
          thumbnail_url: data.thumbnail_url,
          width: data.width,
          height: data.height,
          type: data.type,
          provider_name: data.provider_name,
          provider_url: data.provider_url,
          version: data.version,
        },
      };
    }
  } catch (error) {
    console.log('Instagram oEmbed failed, trying fallback:', error);
  }

  try {
    const shortcodeMatch = url.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
    if (!shortcodeMatch) return null;

    const shortcode = shortcodeMatch[1];
    const apiUrl = `https://www.instagram.com/p/${shortcode}/?__a=1&__d=dis`;

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      const media = data?.items?.[0] || data?.graphql?.shortcode_media;

      if (media) {
        const carouselImages: string[] = [];

        if (media.carousel_media) {
          media.carousel_media.forEach((item: any) => {
            if (item.image_versions2?.candidates?.[0]?.url) {
              carouselImages.push(item.image_versions2.candidates[0].url);
            }
          });
        }

        const displayUrl = media.image_versions2?.candidates?.[0]?.url ||
                          media.display_url ||
                          media.thumbnail_url;

        return {
          og_title: `${media.user?.username || 'Instagram'} on Instagram`,
          og_description: media.caption?.text || 'Instagram post',
          og_image: displayUrl || '',
          og_site_name: 'Instagram',
          og_url: url,
          og_type: media.media_type === 2 ? 'video' : 'photo',
          author_name: media.user?.username || '',
          author_avatar: media.user?.profile_pic_url || '',
          platform_type: 'instagram',
          embed_html: `<blockquote class="instagram-media" data-instgrm-permalink="${url}" data-instgrm-version="14"></blockquote>`,
          embed_metadata: {
            shortcode: shortcode,
            carousel_images: carouselImages,
            like_count: media.like_count,
            comment_count: media.comment_count,
            is_video: media.media_type === 2,
          },
        };
      }
    }
  } catch (fallbackError) {
    console.error('Instagram fallback API error:', fallbackError);
  }

  try {
    const htmlResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (htmlResponse.ok) {
      const html = await htmlResponse.text();
      const metadata = extractMetadata(html, url);

      metadata.platform_type = 'instagram';
      metadata.og_site_name = 'Instagram';

      if (!metadata.og_image && html.includes('og:image')) {
        const imgMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
        if (imgMatch) metadata.og_image = imgMatch[1];
      }

      return metadata;
    }
  } catch (htmlError) {
    console.error('Instagram HTML scraping error:', htmlError);
  }

  return null;
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
      embed_metadata: {
        title: data.title,
        author_name: data.author_name,
        author_url: data.author_url,
        thumbnail_url: data.thumbnail_url,
        thumbnail_width: data.thumbnail_width,
        thumbnail_height: data.thumbnail_height,
        width: data.width,
        height: data.height,
        type: data.type,
        provider_name: data.provider_name,
        provider_url: data.provider_url,
        version: data.version,
      },
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
      embed_metadata: {
        video_id: data.video_id,
        title: data.title,
        description: data.description,
        author_name: data.author_name,
        author_url: data.author_url,
        thumbnail_url: data.thumbnail_url,
        thumbnail_width: data.thumbnail_width,
        thumbnail_height: data.thumbnail_height,
        duration: data.duration,
        width: data.width,
        height: data.height,
        type: data.type,
        provider_name: data.provider_name,
        provider_url: data.provider_url,
        version: data.version,
      },
    };
  } catch (error) {
    console.error('Vimeo embed error:', error);
    return null;
  }
}

async function fetchFacebookData(url: string): Promise<Metadata | null> {
  try {
    const oembedUrl = `https://www.facebook.com/plugins/post/oembed.json/?url=${encodeURIComponent(url)}`;

    const response = await fetch(oembedUrl);
    if (!response.ok) return null;

    const data = await response.json();

    return {
      og_title: 'Facebook Post',
      og_description: '',
      og_image: '',
      og_site_name: 'Facebook',
      og_url: url,
      og_type: 'article',
      author_name: data.author_name || '',
      author_avatar: '',
      platform_type: 'facebook',
      embed_html: data.html || '',
      embed_metadata: {
        author_name: data.author_name,
        author_url: data.author_url,
        width: data.width,
        height: data.height,
        type: data.type,
        provider_name: data.provider_name,
        provider_url: data.provider_url,
        version: data.version,
      },
    };
  } catch (error) {
    console.error('Facebook embed error:', error);
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

    if (platform === 'facebook') {
      const facebookData = await fetchFacebookData(url);
      if (facebookData) {
        return new Response(
          JSON.stringify({ success: true, metadata: facebookData }),
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
