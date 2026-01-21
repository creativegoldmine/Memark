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

    const conversationHistory = includeContext
      ? await getConversationHistory(currentSessionId, supabase)
      : [];

    const userContext = await getUserContext(userId, supabase);

    const relevantItems = await findRelevantItems(userId, message, userContext, supabase);

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
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

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
  userContext: any,
  supabase: any
) {
  const queryLower = query.toLowerCase();
  const isSearchQuery =
    queryLower.includes('show me') ||
    queryLower.includes('find') ||
    queryLower.includes('search') ||
    queryLower.includes('marks about') ||
    queryLower.includes('content about') ||
    queryLower.includes('items about');

  if (!isSearchQuery) {
    return [];
  }

  const { data: items } = await supabase
    .from('items')
    .select('id, title, summary, raw_content, tags, content_topics, semantic_category, platform_type, created_at, score')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(100);

  if (!items || items.length === 0) return [];

  const queryWords = queryLower
    .split(' ')
    .filter(w => w.length > 3)
    .filter(w => !['show', 'find', 'about', 'marks', 'content', 'items', 'that', 'which', 'related'].includes(w));

  const scoredItems = items.map((item: any) => {
    const searchText = `
      ${item.title || ''}
      ${item.summary || ''}
      ${item.raw_content || ''}
      ${item.tags?.join(' ') || ''}
      ${item.content_topics?.join(' ') || ''}
      ${item.semantic_category || ''}
    `.toLowerCase();

    let relevanceScore = 0;

    queryWords.forEach(word => {
      if (searchText.includes(word)) {
        relevanceScore += 10;
      }

      if (item.content_topics) {
        item.content_topics.forEach((topic: string) => {
          if (topic.toLowerCase().includes(word) || word.includes(topic.toLowerCase())) {
            relevanceScore += 20;
          }
        });
      }
    });

    if (queryLower.includes('positive') || queryLower.includes('good') || queryLower.includes('helpful')) {
      if (item.score && item.score > 70) relevanceScore += 5;
    }

    if (queryLower.includes('negative') || queryLower.includes('critical')) {
      if (item.score && item.score < 50) relevanceScore += 5;
    }

    if (queryLower.includes('educational') || queryLower.includes('learn') || queryLower.includes('tutorial')) {
      if (item.tags?.some((t: string) => ['educational', 'tutorial', 'guide', 'learning'].includes(t.toLowerCase()))) {
        relevanceScore += 15;
      }
    }

    if (queryLower.includes('recent') || queryLower.includes('latest')) {
      const daysSinceCreated = (Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreated < 7) relevanceScore += 10;
    }

    return { ...item, relevanceScore };
  });

  return scoredItems
    .filter(item => item.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 10);
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
   - Understand complex filters (sentiment, intent, topic, platform, recency)
   - Support queries like "show me positive Trump content" or "coding tutorials for success"
   - Return relevant items with explanations

2. ANSWER QUESTIONS ABOUT MEMARK: Explain features and help users
   - How folders work
   - What tags and categories do
   - How to organize content
   - Subscription features

3. PROVIDE INSIGHTS: Analyze the user's knowledge vault
   - Topic distribution and patterns
   - Learning gaps or opportunities
   - Organization suggestions
   - Usage trends

4. RECOMMENDATIONS: Suggest actions
   - Folder organization based on clusters
   - Content to review
   - Items to revisit
   - Export/sharing opportunities

## User Context:
- Total saved items: ${userContext.totalItems}
- Top topics: ${userContext.topTopics.map((t: any) => `${t.topic} (${t.count})`).join(', ')}
- Platforms used: ${userContext.platforms.map((p: any) => `${p.platform} (${p.count})`).join(', ')}
- Active clusters: ${userContext.clusters.map((c: any) => `${c.primary_topic} (${c.item_count} items)`).join(', ')}
- Active insights: ${userContext.activeInsights.length}

## Communication Style:
- Be conversational and friendly
- Use clear, concise language
- Avoid technical jargon unless needed
- Provide specific, actionable responses
- When showing items, explain WHY they match
- Ask clarifying questions if query is ambiguous

## Important:
- If searching for items, reference the relevant_items provided
- Be specific about what you found and why it matches
- For Memark questions, give practical, helpful answers
- Suggest next steps or related actions when appropriate`;

  let contextMessage = '';
  if (relevantItems.length > 0) {
    contextMessage = `\n\nRELEVANT ITEMS FOUND (${relevantItems.length}):\n${relevantItems.map((item: any, idx: number) =>
      `${idx + 1}. "${item.title || item.raw_content?.substring(0, 60)}"
         Topics: ${item.content_topics?.join(', ') || 'N/A'}
         Platform: ${item.platform_type || 'N/A'}
         Score: ${item.score || 'N/A'}
         Relevance: ${item.relevanceScore}`
    ).join('\n')}`;
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
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate AI response');
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  const intent = detectIntent(userMessage);
  const itemsReferenced = relevantItems.slice(0, 5).map(item => item.id);
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

  if (lower.includes('show') || lower.includes('find') || lower.includes('search')) {
    return 'search';
  }
  if (lower.includes('how') || lower.includes('what') || lower.includes('explain')) {
    return 'question';
  }
  if (lower.includes('suggest') || lower.includes('recommend') || lower.includes('should i')) {
    return 'recommendation';
  }
  if (lower.includes('organize') || lower.includes('folder') || lower.includes('categorize')) {
    return 'organization';
  }

  return 'conversation';
}

function generateSuggestions(intent: string, userContext: any, relevantItems: any[]): string[] {
  const suggestions: string[] = [];

  if (intent === 'search' && relevantItems.length > 0) {
    suggestions.push('Open one of these items');
    suggestions.push('Create a collection from these results');
    suggestions.push('Refine search with more specific terms');
  }

  if (userContext.clusters.length > 0 && userContext.clusters.some((c: any) => c.status === 'suggested')) {
    suggestions.push('Review suggested folder organizations');
  }

  if (userContext.activeInsights.length > 0) {
    suggestions.push('Check your AI insights');
  }

  if (userContext.totalItems > 50) {
    suggestions.push('Show me my most important marks');
    suggestions.push('What topics do I save most?');
  }

  return suggestions.slice(0, 3);
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
