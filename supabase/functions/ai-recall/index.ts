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

    const itemsSummary = items.slice(0, 50).map(item => ({
      id: item.id,
      title: item.title || item.raw_content.substring(0, 60),
      summary: item.summary || '',
      type: item.type,
      category: item.category,
      tags: item.tags,
      created: new Date(item.created_at).toLocaleDateString(),
    }));

    const systemPrompt = `You are a helpful memory assistant for MeMark. The user has saved content (links, notes, videos, articles, etc.) and is trying to recall something.

Your job is to:
1. Understand what they're trying to remember (even if described vaguely)
2. Match their description to saved items
3. Respond conversationally and helpfully
4. Return matching item IDs

User might say things like:
- "that article about AI I saved last week"
- "the video on cooking I watched"
- "something about productivity"
- "the Twitter thread from yesterday"

Be friendly, natural, and help them find what they're looking for.`;

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
            content: `User's saved items:\n${JSON.stringify(itemsSummary, null, 2)}\n\nUser query: "${query}"\n\nReturn JSON with: { "message": "friendly response", "itemIds": ["id1", "id2"] }`,
          },
        ],
        temperature: 0.7,
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
    ? `Found 1 item matching "${query}"`
    : `Found ${matches.length} items matching "${query}"`;

  return {
    message,
    items: matches.slice(0, 10),
  };
}