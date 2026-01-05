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

    const { query, userId } = await req.json();

    const { data: items, error } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({
          message: "You haven't saved anything yet. Text a link or note to your MeMark number to get started!",
          items: [],
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!openaiApiKey) {
      const basicResults = basicSearch(query, items);
      return new Response(
        JSON.stringify(basicResults),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const itemsSummary = items.slice(0, 100).map(item => ({
      id: item.id,
      title: item.title || item.raw_content.substring(0, 60),
      summary: item.summary || '',
      content: item.raw_content?.substring(0, 200) || '',
      type: item.type,
      category: item.category,
      tags: item.tags || [],
      created: new Date(item.created_at).toLocaleDateString(),
    }));

    const systemPrompt = `You are an intelligent memory assistant for MeMark. The user has saved content (links, notes, videos, articles) and wants to find specific items using natural language.

Your job is to:
1. Parse complex queries including sentiment, intent, and context
2. Understand filters like "positive", "negative", "educational", "helpful", "entertaining"
3. Match topic keywords (e.g., "trump", "coding", "health")
4. Consider recency if mentioned ("recent", "last week", "today")
5. Return matching item IDs and a helpful conversational message

Query examples:
- "show me marks related to trump, specifically that are positive for him"
- "show me marks related to vibe coding which are educational and going to help me succeed"
- "that article about AI from last week"
- "videos about cooking that are entertaining"
- "business strategy content that's actionable"

Analysis approach:
- Extract main topics from query
- Identify sentiment filters (positive/negative mentions)
- Identify intent filters (educational, helpful, entertaining, actionable)
- Match against item titles, summaries, content, tags, and categories
- Prioritize items that match multiple criteria

Return JSON with:
{
  "message": "friendly conversational response explaining what you found",
  "itemIds": ["id1", "id2", ...]
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
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
            content: `User's saved items:\n${JSON.stringify(itemsSummary, null, 2)}\n\nUser query: "${query}"\n\nAnalyze the query for:\n1. Main topics/keywords\n2. Sentiment filters (positive/negative)\n3. Intent filters (educational, helpful, entertaining, actionable, success-oriented)\n4. Time context (recent, last week, etc.)\n\nReturn JSON with: { "message": "conversational response explaining what you found and why", "itemIds": ["id1", "id2", ...] }`,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const basicResults = basicSearch(query, items);
      return new Response(
        JSON.stringify(basicResults),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const aiData = await response.json();
    const aiResult = JSON.parse(aiData.choices[0].message.content);

    const matchedItems = items.filter(item =>
      aiResult.itemIds?.includes(item.id)
    );

    return new Response(
      JSON.stringify({
        message: aiResult.message || "Here's what I found:",
        items: matchedItems.slice(0, 10),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in AI recall:', error);
    return new Response(
      JSON.stringify({
        message: "Sorry, I had trouble searching. Please try again.",
        items: [],
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function basicSearch(query: string, items: any[]) {
  const lowerQuery = query.toLowerCase();
  const queryWords = lowerQuery.split(' ').filter(w => w.length > 2);

  const matches = items.filter(item => {
    const searchText = `${item.title} ${item.summary} ${item.raw_content} ${item.tags?.join(' ')} ${item.category}`.toLowerCase();
    return queryWords.some(word => searchText.includes(word));
  });

  if (matches.length === 0) {
    return {
      message: "I couldn't find anything matching that. Try describing it differently, or check what you've saved.",
      items: [],
    };
  }

  const message = matches.length === 1
    ? `Found 1 item matching \"${query}\"`
    : `Found ${matches.length} items matching \"${query}\"`;

  return {
    message,
    items: matches.slice(0, 10),
  };
}