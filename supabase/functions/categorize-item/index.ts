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
    const urlMatch = content.match(/https?:\/\/[^\s]+/);

    if (urlMatch) {
      metadata = await fetchLinkMetadata(urlMatch[0]);
      ogMetadata = metadata?.ogData || null;
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

    const updateData: any = {
      type,
      title,
      summary,
      tags,
      category,
      image_preview: imagePreview,
      score,
    };

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
      title: ogTitle || twitterTitle || htmlTitle,
      description: ogDescription || twitterDescription || metaDescription,
      image: ogImage || twitterImage,
      ogData: {
        og_title: ogTitle || twitterTitle || htmlTitle,
        og_description: ogDescription || twitterDescription || metaDescription,
        og_image: ogImage || twitterImage,
        og_site_name: ogSiteName,
        og_url: ogUrl || url,
        og_type: ogType,
        og_author: ogAuthor,
        og_published_time: ogPublishedTime,
      },
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

    const prompt = `Analyze this content and categorize it for FUNCTIONAL USE. The user wants to retrieve and USE this information later, so be specific about what VALUE it provides.

Content: ${content}
${metadata ? `\nMetadata: Title: ${metadata.title}\nDescription: ${metadata.description}` : ''}${userContext}

CRITICAL: Avoid generic "Entertainment" categorization. Think about WHY someone saved this and HOW they'll use it:
- Is it educational content they want to learn from? → Education/Tutorial/Learning
- Is it coding/development content? → Development/Programming/Tech-Tutorial
- Is it inspirational/vibe content for creative work? → Inspiration/Creative/Vibe
- Is it news about specific people/topics? → News-[Topic] (e.g., News-Politics, News-Celebrity, News-Tech)
- Is it business strategy/growth content? → Business/Strategy/Growth
- Is it social/cultural commentary? → Social/Culture/Commentary
- Is it actually just entertainment with no functional value? → Entertainment (use sparingly)

Provide a JSON response with:
- type: "article", "video", "text", "link", "image", or "note"
- title: A concise, descriptive title (max 60 chars)
- summary: A brief summary (max 150 chars)
- tags: Array of 5-8 SPECIFIC, FUNCTIONAL tags that describe the content's value and use case (e.g., "coding-tutorial", "react", "trump-news", "business-strategy", "vibe-coding", "celebrity-gossip", "learning-resource")
- category: ONE SPECIFIC category from [Development, Programming, Tutorial, Education, Learning, Business, Strategy, News-Politics, News-Tech, News-Celebrity, Inspiration, Creative, Design, Health, Fitness, Social, Culture, Finance, Career, Personal-Growth, Entertainment] (prioritize user's suggested content type if provided)
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