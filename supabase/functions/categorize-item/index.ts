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
    const urlMatch = content.match(/https?:\/\/[^\s]+/);

    if (urlMatch) {
      metadata = await fetchLinkMetadata(urlMatch[0]);
    }

    let type = 'text';
    let title = metadata?.title || content.substring(0, 60);
    let summary = metadata?.description || '';
    let tags: string[] = [];
    let category = userMetadata?.contentType || 'General';
    let imagePreview = metadata?.image || null;
    let score = 70;

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

    const { data: item } = await supabase
      .from('items')
      .update({
        type,
        title,
        summary,
        tags,
        category,
        image_preview: imagePreview,
        score,
      })
      .eq('id', itemId)
      .select()
      .single();

    if (item) {
      await supabase.from('ai_event_log').insert({
        user_id: item.user_id,
        item_id: itemId,
        action_type: 'categorize',
        ai_output: {
          type,
          title,
          summary,
          tags,
          category,
          score,
        },
      });

      await autoAssignToCollections(supabase, userId, itemId, category, type, tags);

      try {
        await fetch(`${supabaseUrl}/functions/v1/auto-folder-categorize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            itemId,
            userId,
          }),
        });
      } catch (folderError) {
        console.error('Folder categorization failed:', folderError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, type, title, summary, tags, category, score }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error categorizing item:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        stack: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function fetchLinkMetadata(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const html = await response.text();

    const ogTitle = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i)?.[1];
    const ogDescription = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i)?.[1];
    const ogImage = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i)?.[1];

    const twitterTitle = html.match(/<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']/i)?.[1];
    const twitterDescription = html.match(/<meta\s+name=["']twitter:description["']\s+content=["']([^"']+)["']/i)?.[1];
    const twitterImage = html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i)?.[1];

    const htmlTitle = html.match(/<title>([^<]+)<\/title>/i)?.[1];
    const metaDescription = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)?.[1];

    return {
      title: ogTitle || twitterTitle || htmlTitle,
      description: ogDescription || twitterDescription || metaDescription,
      image: ogImage || twitterImage,
    };
  } catch (error) {
    console.error('Error fetching metadata:', error);
    return null;
  }
}

async function categorizeWithAI(apiKey: string, content: string, metadata: any, userMetadata?: any) {
  try {
    const userContext = userMetadata ? `

User provided context:
- Notes: ${userMetadata.userNotes || 'None'}
- Suggested content type: ${userMetadata.contentType || 'Not specified'}
- Priority: ${userMetadata.priority || 'medium'}
- Importance: ${userMetadata.importance || 'normal'}
- Needs review: ${userMetadata.needsReview ? 'Yes' : 'No'}

Please consider this user context when categorizing. If the user specified a content type or mentioned where to place it, strongly prioritize that information.` : '';

    const prompt = `Analyze this content and categorize it.

Content: ${content}
${metadata ? `\nMetadata: Title: ${metadata.title}\nDescription: ${metadata.description}` : ''}${userContext}

Provide a JSON response with:
- type: "article", "video", "text", "link", "image", or "note"
- title: A concise, descriptive title (max 60 chars)
- summary: A brief summary (max 150 chars)
- tags: Array of 3-5 relevant tags (incorporate user notes if relevant)
- category: One of [Technology, Education, Entertainment, News, Business, Health, Science, Sports, Travel, Food, Other] (prioritize user's suggested content type if provided)
- score: Relevance score 1-100 (boost score if user marked as important)`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a content categorization assistant. Always respond with valid JSON.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    console.error('AI categorization error:', error);
    return null;
  }
}

async function autoAssignToCollections(
  supabase: any,
  userId: string,
  itemId: string,
  category: string,
  type: string,
  tags: string[]
) {
  const { data: collections } = await supabase
    .from('collections')
    .select('id, name')
    .eq('user_id', userId);

  if (!collections || collections.length === 0) return;

  const matchingCollections = collections.filter((col: any) => {
    const colName = col.name.toLowerCase();
    const categoryMatch = colName.includes(category.toLowerCase());
    const typeMatch = colName.includes(type.toLowerCase());
    const tagMatch = tags.some((tag) => colName.includes(tag.toLowerCase()));
    return categoryMatch || typeMatch || tagMatch;
  });

  for (const collection of matchingCollections) {
    await supabase.from('collection_items').insert({
      collection_id: collection.id,
      item_id: itemId,
    }).select();
  }
}