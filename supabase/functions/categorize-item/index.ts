import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CategorizeRequest {
  itemId: string;
  content: string;
  userId: string;
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
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { itemId, content, userId } = await req.json() as CategorizeRequest;

    console.log('OpenAI key present:', !!openaiApiKey);

    let type = detectType(content);
    let title = generateTitle(content, type);
    let summary = generateSummary(content, type);
    let tags = generateTags(content);
    let category = assignCategory(content, tags);
    let score = calculateScore(content, type);
    let imagePreview = extractImageUrl(content);

    const urlMatch = content.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      try {
        const cleanUrl = urlMatch[0].split('?')[0];
        const metadata = await fetchLinkMetadata(urlMatch[0]);
        if (metadata.title) title = metadata.title;
        if (metadata.description) summary = metadata.description;
        if (metadata.image) imagePreview = metadata.image;

        if (!metadata.title || !metadata.description) {
          const fallbackMetadata = await fetchWithJSONLD(urlMatch[0]);
          if (!metadata.title && fallbackMetadata.title) title = fallbackMetadata.title;
          if (!metadata.description && fallbackMetadata.description) summary = fallbackMetadata.description;
          if (!metadata.image && fallbackMetadata.image) imagePreview = fallbackMetadata.image;
        }
      } catch (error) {
        console.error('Link metadata fetch failed:', error);
      }
    }

    if (openaiApiKey) {
      try {
        console.log('Calling OpenAI...');
        const aiResult = await categorizeWithAI(content, openaiApiKey);
        console.log('AI result:', aiResult);
        type = aiResult.type || type;
        title = aiResult.title || title;
        summary = aiResult.summary || summary;
        tags = aiResult.tags && aiResult.tags.length > 0 ? aiResult.tags : tags;
        category = aiResult.category || category;
      } catch (error) {
        console.error('AI categorization failed, using fallback:', error);
      }
    }

    const { error: updateError } = await supabase
      .from('items')
      .update({
        type,
        title,
        summary,
        tags,
        category,
        score,
        image_preview: imagePreview,
      })
      .eq('id', itemId);

    if (updateError) {
      throw updateError;
    }

    const { data: item } = await supabase
      .from('items')
      .select('user_id')
      .eq('id', itemId)
      .maybeSingle();

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

    const title = ogTitle || twitterTitle || htmlTitle || null;
    const description = ogDescription || twitterDescription || metaDescription || null;
    const image = ogImage || twitterImage || null;

    return {
      title: title ? decodeHTMLEntities(title) : null,
      description: description ? decodeHTMLEntities(description) : null,
      image: image,
    };
  } catch (error) {
    console.error('Error fetching link metadata:', error);
    return { title: null, description: null, image: null };
  }
}

async function fetchWithJSONLD(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      return { title: null, description: null, image: null };
    }

    const html = await response.text();
    const jsonldMatch = html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/i);

    if (jsonldMatch) {
      try {
        const jsonld = JSON.parse(jsonldMatch[1]);
        return {
          title: jsonld.headline || jsonld.name || null,
          description: jsonld.description || null,
          image: jsonld.image?.url || jsonld.image || null,
        };
      } catch {
        return { title: null, description: null, image: null };
      }
    }

    return { title: null, description: null, image: null };
  } catch (error) {
    return { title: null, description: null, image: null };
  }
}

function decodeHTMLEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
  };
  return text.replace(/&[#\w]+;/g, (entity) => entities[entity] || entity);
}

async function categorizeWithAI(content: string, apiKey: string) {
  const urlMatch = content.match(/https?:\/\/[^\s]+/);
  const isUrl = !!urlMatch;

  const systemPrompt = isUrl
    ? `You are a smart link analyzer for MeMark. Analyze the URL and any text.\nReturn JSON with: type (video/article/note/task/text), title (concise, 60 chars max, describe what the link is about),\nsummary (150 chars, explain what value this content provides), tags (3-5 relevant, specific tags),\ncategory (Work/Personal/Finance/Learning/Tech/Entertainment/News/Shopping/Social).\nFor Twitter/X links, infer the topic from the URL or text. Be specific and helpful.`
    : `You are a smart categorization assistant for MeMark.\nReturn JSON with: type (note/task/text/idea), title (60 chars, descriptive),\nsummary (150 chars, key points), tags (3-5 relevant tags),\ncategory (Work/Personal/Finance/Learning/Ideas/Tasks).`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: isUrl
            ? `Analyze this link and provide useful context:\n\n${content.substring(0, 2000)}`
            : `Categorize this content:\n\n${content.substring(0, 2000)}`,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
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

  const collectionMatches: string[] = [];

  for (const collection of collections) {
    const collectionName = collection.name.toLowerCase();
    const categoryLower = category.toLowerCase();
    const typeLower = type.toLowerCase();

    if (collectionName.includes(categoryLower) ||
        categoryLower.includes(collectionName)) {
      collectionMatches.push(collection.id);
    } else if (typeLower === 'video' && collectionName.includes('video')) {
      collectionMatches.push(collection.id);
    } else if (typeLower === 'article' && collectionName.includes('article')) {
      collectionMatches.push(collection.id);
    } else {
      for (const tag of tags) {
        if (collectionName.includes(tag.toLowerCase())) {
          collectionMatches.push(collection.id);
          break;
        }
      }
    }
  }

  for (const collectionId of collectionMatches) {
    const { error } = await supabase
      .from('collection_items')
      .insert({
        collection_id: collectionId,
        item_id: itemId,
      });

    if (error && !error.message.includes('duplicate')) {
      console.error('Error adding item to collection:', error);
    }
  }
}

function detectType(content: string): string {
  const lowerContent = content.toLowerCase();

  if (lowerContent.includes('youtube.com') || lowerContent.includes('youtu.be') ||
      lowerContent.includes('vimeo.com') || lowerContent.includes('tiktok.com')) {
    return 'video';
  }

  if (lowerContent.includes('http') &&
      (lowerContent.includes('article') || lowerContent.includes('blog') ||
       lowerContent.includes('.com') || lowerContent.includes('.org'))) {
    return 'article';
  }

  if (lowerContent.includes('todo') || lowerContent.includes('task') ||
      lowerContent.includes('remind')) {
    return 'task';
  }

  if (lowerContent.includes('note:') || lowerContent.length > 100) {
    return 'note';
  }

  return 'text';
}

function generateTitle(content: string, type: string): string {
  const urlMatch = content.match(/https?:\/\/[^\s]+/);

  if (urlMatch) {
    try {
      const url = new URL(urlMatch[0]);
      const hostname = url.hostname.replace('www.', '');
      return `${type.charAt(0).toUpperCase() + type.slice(1)} from ${hostname}`;
    } catch {
      return content.substring(0, 60) + (content.length > 60 ? '...' : '');
    }
  }

  const firstLine = content.split('\n')[0];
  return firstLine.substring(0, 60) + (firstLine.length > 60 ? '...' : '');
}

function generateSummary(content: string, type: string): string {
  const cleanContent = content.replace(/https?:\/\/[^\s]+/g, '').trim();

  if (cleanContent.length === 0) {
    return `A ${type} shared via MeMark`;
  }
  
  const sentences = cleanContent.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const summary = sentences.slice(0, 2).join('. ').trim();

  return summary.substring(0, 200) + (summary.length > 200 ? '...' : '');
}

function generateTags(content: string): string[] {
  const tags: string[] = [];
  const lowerContent = content.toLowerCase();

  const tagMap: Record<string, string[]> = {
    work: ['work', 'job', 'meeting', 'office', 'project', 'deadline'],
    personal: ['personal', 'family', 'home', 'health', 'fitness'],
    finance: ['finance', 'money', 'invest', 'stock', 'budget', 'crypto'],
    learning: ['learn', 'course', 'tutorial', 'education', 'study'],
    inspiration: ['inspire', 'idea', 'creative', 'design', 'art'],
    tech: ['tech', 'code', 'programming', 'software', 'app'],
    food: ['food', 'recipe', 'cooking', 'restaurant'],
    travel: ['travel', 'trip', 'vacation', 'flight', 'hotel'],
  };

  for (const [tag, keywords] of Object.entries(tagMap)) {
    if (keywords.some(keyword => lowerContent.includes(keyword))) {
      tags.push(tag);
    }
  }

  return tags.slice(0, 5);
}

function assignCategory(content: string, tags: string[]): string {
  if (tags.length > 0) {
    return tags[0].charAt(0).toUpperCase() + tags[0].slice(1);
  }

  const lowerContent = content.toLowerCase();

  if (lowerContent.includes('work') || lowerContent.includes('job')) {
    return 'Work';
  }
  if (lowerContent.includes('money') || lowerContent.includes('finance')) {
    return 'Finance';
  }
  if (lowerContent.includes('learn') || lowerContent.includes('course')) {
    return 'Learning';
  }

  return 'Personal';
}

function calculateScore(content: string, type: string): number {
  let score = 50;

  if (type === 'video' || type === 'article') {
    score += 20;
  }

  if (content.length > 100) {
    score += 10;
  }

  const urgentWords = ['urgent', 'important', 'asap', 'deadline', 'today'];
  if (urgentWords.some(word => content.toLowerCase().includes(word))) {
    score += 20;
  }

  return Math.min(100, Math.max(0, score));
}

function extractImageUrl(content: string): string | null {
  const imageUrlMatch = content.match(/https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp)/i);
  return imageUrlMatch ? imageUrlMatch[0] : null;
}