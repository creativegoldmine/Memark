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
        break;
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

  return metadata;
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