import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
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

    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { userId, message, sessionId, includeContext = true } = await req.json();

    let currentSessionId = sessionId;

    if (!currentSessionId) {
      const { data: newSession } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: userId,
          title: message.substring(0, 50),
        })
        .select()
        .single();

      currentSessionId = newSession?.id;
    }

    await supabase.from('chat_messages').insert({
      session_id: currentSessionId,
      user_id: userId,
      role: 'user',
      content: message,
    });

    const [conversationHistory, userContext] = await Promise.all([
      includeContext ? getConversationHistory(currentSessionId, supabase) : Promise.resolve([]),
      getUserContext(userId, supabase),
    ]);

    const { searchQuery, platformFilter, dateFrom, dateTo } = parseQueryFilters(message);

    const relevantItems = await findRelevantItems(
      userId,
      searchQuery,
      platformFilter,
      dateFrom,
      dateTo,
      supabase
    );

    const response = await generateAIResponse(
      message,
      conversationHistory,
      userContext,
      relevantItems,
      openaiApiKey
    );

    const tokenCount = estimateTokens(message + response.content);

    await supabase.from('chat_messages').insert({
      session_id: currentSessionId,
      user_id: userId,
      role: 'assistant',
      content: response.content,
      metadata: {
        items_referenced: response.itemsReferenced,
        intent: response.intent,
        confidence: response.confidence,
        search_query: searchQuery,
        total_results: relevantItems.length,
      },
      tokens_used: tokenCount,
    });

    return new Response(
      JSON.stringify({
        success: true,
        sessionId: currentSessionId,
        message: response.content,
        itemsReferenced: response.itemsReferenced,
        intent: response.intent,
        suggestions: response.suggestions,
        totalResults: relevantItems.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in ai-chat-assistant:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function parseQueryFilters(message: string): {
  searchQuery: string;
  platformFilter: string | null;
  dateFrom: string | null;
  dateTo: string | null;
} {
  const lower = message.toLowerCase();
  let searchQuery = message;
  let platformFilter: string | null = null;
  let dateFrom: string | null = null;
  let dateTo: string | null = null;

  const platformMap: Record<string, string> = {
    'youtube': 'youtube',
    'video': 'youtube',
    'twitter': 'twitter',
    'tweet': 'twitter',
    'tweets': 'twitter',
    'x.com': 'twitter',
    'instagram': 'instagram',
    'insta': 'instagram',
    'tiktok': 'tiktok',
    'tik tok': 'tiktok',
    'vimeo': 'vimeo',
    'facebook': 'facebook',
    'reddit': 'reddit',
    'linkedin': 'linkedin',
    'github': 'github',
    'medium': 'medium',
  };

  for (const [keyword, platform] of Object.entries(platformMap)) {
    if (lower.includes(keyword)) {
      platformFilter = platform;
      break;
    }
  }

  const now = new Date();

  if (lower.includes('today')) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    dateFrom = start.toISOString();
  } else if (lower.includes('yesterday')) {
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);
    dateFrom = start.toISOString();
    dateTo = end.toISOString();
  } else if (lower.includes('last week') || lower.includes('this week') || lower.includes('past week')) {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    dateFrom = start.toISOString();
  } else if (lower.includes('last month') || lower.includes('this month') || lower.includes('past month')) {
    const start = new Date(now);
    start.setMonth(start.getMonth() - 1);
    dateFrom = start.toISOString();
  } else if (lower.includes('last year') || lower.includes('this year') || lower.includes('past year')) {
    const start = new Date(now);
    start.setFullYear(start.getFullYear() - 1);
    dateFrom = start.toISOString();
  } else {
    const monthMatch = lower.match(/(?:in|from|saved in|during)\s+(january|february|march|april|may|june|july|august|september|october|november|december)/);
    if (monthMatch) {
      const months: Record<string, number> = {
        january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
        july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
      };
      const monthNum = months[monthMatch[1]];
      const year = monthNum > now.getMonth() ? now.getFullYear() - 1 : now.getFullYear();
      dateFrom = new Date(year, monthNum, 1).toISOString();
      dateTo = new Date(year, monthNum + 1, 0, 23, 59, 59).toISOString();
    }
  }

  const stopWords = [
    'show', 'me', 'find', 'search', 'for', 'my', 'the', 'a', 'an',
    'about', 'marks', 'content', 'items', 'that', 'which', 'related',
    'to', 'from', 'in', 'on', 'all', 'saved', 'bookmarks', 'posts',
    'get', 'list', 'give', 'what', 'are', 'is', 'can', 'you',
    'today', 'yesterday', 'last', 'week', 'month', 'year', 'this',
    'past', 'recent', 'latest', 'old', 'new',
  ];
  const cleaned = searchQuery
    .split(/\s+/)
    .filter(w => w.length > 1 && !stopWords.includes(w.toLowerCase()))
    .join(' ')
    .trim();

  if (cleaned.length > 0) {
    searchQuery = cleaned;
  }

  return { searchQuery, platformFilter, dateFrom, dateTo };
}

async function getConversationHistory(sessionId: string, supabase: any): Promise<ChatMessage[]> {
  const { data: messages } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(10);

  return messages || [];
}

async function getUserContext(userId: string, supabase: any) {
  const { data: items, count: totalItems } = await supabase
    .from('items')
    .select('semantic_category, content_topics, platform_type', { count: 'exact' })
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(500);

  const { data: clusters } = await supabase
    .from('semantic_clusters')
    .select('primary_topic, item_count, status')
    .eq('user_id', userId)
    .order('item_count', { ascending: false })
    .limit(10);

  const { data: insights } = await supabase
    .from('ai_insights')
    .select('insight_type, title, description')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(5);

  const topicDistribution: { [key: string]: number } = {};
  const platformDistribution: { [key: string]: number } = {};

  items?.forEach((item: any) => {
    if (item.semantic_category) {
      topicDistribution[item.semantic_category] = (topicDistribution[item.semantic_category] || 0) + 1;
    }
    if (item.platform_type) {
      platformDistribution[item.platform_type] = (platformDistribution[item.platform_type] || 0) + 1;
    }
  });

  return {
    totalItems: totalItems || 0,
    topTopics: Object.entries(topicDistribution)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([topic, count]) => ({ topic, count })),
    platforms: Object.entries(platformDistribution)
      .sort(([, a], [, b]) => b - a)
      .map(([platform, count]) => ({ platform, count })),
    clusters: clusters || [],
    activeInsights: insights || [],
  };
}

async function findRelevantItems(
  userId: string,
  query: string,
  platformFilter: string | null,
  dateFrom: string | null,
  dateTo: string | null,
  supabase: any
) {
  const { data: items, error } = await supabase.rpc('search_user_items', {
    p_user_id: userId,
    p_query: query,
    p_platform: platformFilter,
    p_date_from: dateFrom,
    p_date_to: dateTo,
    p_limit: 20,
  });

  if (error) {
    console.error('search_user_items RPC error:', error);
    return [];
  }

  return items || [];
}

async function generateAIResponse(
  userMessage: string,
  conversationHistory: ChatMessage[],
  userContext: any,
  relevantItems: any[],
  openaiKey: string
) {
  const systemPrompt = `You are Memark's AI Assistant - a helpful, knowledgeable companion for users managing their personal knowledge vault.

## Your Capabilities:

1. FIND MARKS: Help users find specific content with natural language queries
   - Search across ALL saved marks - titles, content, summaries, tags, topics, descriptions, authors
   - Understand filters: platform (YouTube, Twitter, etc.), date ranges, categories, topics
   - Support queries like "cooking videos from last week" or "that article about AI"
   - Always reference found items by their position number

2. ANSWER QUESTIONS ABOUT MEMARK: Explain features and help users

3. PROVIDE INSIGHTS: Analyze the user's knowledge vault
   - Topic distribution and patterns
   - Organization suggestions

4. RECOMMENDATIONS: Suggest actions based on their vault

## User Context:
- Total saved items: ${userContext.totalItems}
- Top topics: ${userContext.topTopics.map((t: any) => `${t.topic} (${t.count})`).join(', ') || 'None yet'}
- Platforms used: ${userContext.platforms.map((p: any) => `${p.platform} (${p.count})`).join(', ') || 'None yet'}
- Active clusters: ${userContext.clusters.map((c: any) => `${c.primary_topic} (${c.item_count} items)`).join(', ') || 'None yet'}

## Communication Style:
- Be conversational and friendly but concise
- When showing items, briefly explain WHY each matches the query
- Mention if items contain video, images, or other media the user can play/view
- If no items found, suggest alternative search terms
- Ask clarifying questions if the query is very vague

## Important:
- ALWAYS reference items by the IDs provided in the context
- The system performs deep full-text search across all fields automatically
- When items have media (videos, images, embeds), mention they can be viewed inline
- Be specific about match count: "I found X marks matching your search"`;

  let contextMessage = '';
  if (relevantItems.length > 0) {
    contextMessage = `\n\nSEARCH RESULTS (${relevantItems.length} items found):\n${relevantItems.slice(0, 15).map((item: any, idx: number) => {
      const hasVideo = item.video_url || item.platform_type === 'youtube' || item.platform_type === 'vimeo' || item.platform_type === 'tiktok';
      const hasImages = item.og_image || (item.media_urls && JSON.stringify(item.media_urls) !== '[]') || (item.carousel_images && JSON.stringify(item.carousel_images) !== '[]');
      const hasEmbed = item.embed_html;
      const mediaIndicators = [
        hasVideo ? '[VIDEO]' : '',
        hasImages ? '[IMAGE]' : '',
        hasEmbed ? '[EMBED]' : '',
      ].filter(Boolean).join(' ');

      return `${idx + 1}. ID:${item.id} "${item.title || item.og_title || (item.raw_content || '').substring(0, 80)}"
         ${mediaIndicators}
         Platform: ${item.platform_type || 'web'} | Category: ${item.semantic_category || item.category || 'N/A'}
         Topics: ${item.content_topics?.join(', ') || 'N/A'}
         Tags: ${item.tags?.join(', ') || 'N/A'}
         Saved: ${item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}
         Relevance: ${(item.relevance_score || 0).toFixed(3)}`;
    }).join('\n')}`;
  }

  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-6),
    { role: 'user', content: userMessage + contextMessage },
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('OpenAI API error:', errorBody);
    throw new Error('Failed to generate AI response');
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  const intent = detectIntent(userMessage);
  const itemsReferenced = relevantItems.slice(0, 10).map((item: any) => item.id);
  const suggestions = generateSuggestions(intent, userContext, relevantItems);

  return {
    content,
    intent,
    itemsReferenced,
    confidence: relevantItems.length > 0 ? 0.9 : 0.7,
    suggestions,
  };
}

function detectIntent(message: string): string {
  const lower = message.toLowerCase();

  const searchWords = ['show', 'find', 'search', 'look', 'where', 'get', 'list', 'give', 'pull up', 'bring up', 'marks about', 'items about'];
  if (searchWords.some(w => lower.includes(w))) {
    return 'search';
  }
  if (lower.includes('how') || lower.includes('what is') || lower.includes('explain') || lower.includes('why')) {
    return 'question';
  }
  if (lower.includes('suggest') || lower.includes('recommend') || lower.includes('should i')) {
    return 'recommendation';
  }
  if (lower.includes('organize') || lower.includes('folder') || lower.includes('categorize') || lower.includes('sort')) {
    return 'organization';
  }

  return 'search';
}

function generateSuggestions(intent: string, userContext: any, relevantItems: any[]): string[] {
  const suggestions: string[] = [];

  if (relevantItems.length > 0) {
    suggestions.push('Open one of these items');
    suggestions.push('Create a collection from these results');
    if (relevantItems.length > 5) {
      suggestions.push('Narrow your search with more specific terms');
    }
  } else {
    suggestions.push('Try different search terms');
    suggestions.push('Show me all my recent marks');
  }

  if (userContext.clusters.length > 0 && userContext.clusters.some((c: any) => c.status === 'suggested')) {
    suggestions.push('Review suggested folder organizations');
  }

  if (userContext.totalItems > 50) {
    suggestions.push('What topics do I save most?');
  }

  return suggestions.slice(0, 3);
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
