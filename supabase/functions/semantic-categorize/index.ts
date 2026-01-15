import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface SemanticAnalysis {
  mainTopic: string;
  subTopics: string[];
  contentTheme: string;
  suggestedFolderName: string;
  semanticTags: string[];
  confidence: number;
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

    const { itemId, userId, content, metadata, batchMode = false } = await req.json();

    const analysis = await analyzeContentSemantics(
      content,
      metadata,
      openaiApiKey
    );

    if (!analysis) {
      return new Response(
        JSON.stringify({ error: 'Failed to analyze content' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { error: updateError } = await supabase
      .from('items')
      .update({
        content_topics: [analysis.mainTopic, ...analysis.subTopics],
        semantic_category: analysis.contentTheme,
        topic_confidence: analysis.confidence,
      })
      .eq('id', itemId);

    if (updateError) {
      console.error('Error updating item:', updateError);
    }

    if (!batchMode) {
      const similarItems = await findSimilarItems(
        userId,
        [analysis.mainTopic, ...analysis.subTopics],
        itemId,
        supabase
      );

      if (similarItems.length >= 2) {
        await suggestFolderCreation(
          userId,
          analysis,
          [itemId, ...similarItems.map(i => i.id)],
          supabase
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        similarItemsCount: 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in semantic-categorize:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function analyzeContentSemantics(
  content: string,
  metadata: any,
  openaiKey: string
): Promise<SemanticAnalysis | null> {
  try {
    const prompt = `Analyze this content and extract semantic information. Return ONLY valid JSON.

Content: ${content}
Title: ${metadata?.og_title || metadata?.title || ''}
Description: ${metadata?.og_description || metadata?.description || ''}
Site: ${metadata?.og_site_name || ''}

Return JSON with:
- mainTopic: Primary subject (e.g., "Machine Learning", "Cooking Recipes", "Fitness Training")
- subTopics: Array of 3-5 related subtopics
- contentTheme: Thematic category (e.g., "Technical Education", "Personal Finance", "Health & Wellness")
- suggestedFolderName: Natural folder name that describes the content group
- semanticTags: 5-10 tags representing key concepts
- confidence: 0-1 score for categorization certainty`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a semantic content analyzer. Always return valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', await response.text());
      return null;
    }

    const data = await response.json();
    const resultText = data.choices[0].message.content.trim();

    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response:', resultText);
      return null;
    }

    const analysis = JSON.parse(jsonMatch[0]);

    return {
      mainTopic: analysis.mainTopic || 'General',
      subTopics: analysis.subTopics || [],
      contentTheme: analysis.contentTheme || 'General',
      suggestedFolderName: analysis.suggestedFolderName || 'Miscellaneous',
      semanticTags: analysis.semanticTags || [],
      confidence: analysis.confidence || 0.5,
    };
  } catch (error) {
    console.error('Error in analyzeContentSemantics:', error);
    return null;
  }
}

async function findSimilarItems(
  userId: string,
  topics: string[],
  excludeItemId: string,
  supabase: any
) {
  try {
    const { data: items, error } = await supabase
      .from('items')
      .select('id, title, content_topics, semantic_category')
      .eq('user_id', userId)
      .neq('id', excludeItemId)
      .not('content_topics', 'is', null)
      .limit(50);

    if (error || !items) return [];

    const similarItems = items.filter((item: any) => {
      if (!item.content_topics || !Array.isArray(item.content_topics)) return false;

      const overlap = item.content_topics.filter((topic: string) =>
        topics.some(t => t.toLowerCase().includes(topic.toLowerCase()) ||
                        topic.toLowerCase().includes(t.toLowerCase()))
      );

      return overlap.length >= 2;
    });

    return similarItems;
  } catch (error) {
    console.error('Error finding similar items:', error);
    return [];
  }
}

async function suggestFolderCreation(
  userId: string,
  analysis: SemanticAnalysis,
  matchingItemIds: string[],
  supabase: any
) {
  try {
    const dedupKey = `${userId}-${analysis.mainTopic.toLowerCase().replace(/\s+/g, '-')}`;

    const { data: existing } = await supabase
      .from('folder_recommendations')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .contains('topic_keywords', [analysis.mainTopic])
      .limit(1);

    if (existing && existing.length > 0) {
      return;
    }

    const { error } = await supabase
      .from('folder_recommendations')
      .insert({
        user_id: userId,
        suggested_folder_name: analysis.suggestedFolderName,
        suggested_icon: selectIconForTheme(analysis.contentTheme),
        suggested_description: `Contains items about ${analysis.mainTopic}`,
        topic_keywords: [analysis.mainTopic, ...analysis.subTopics],
        matching_item_ids: matchingItemIds,
        item_count: matchingItemIds.length,
        confidence: analysis.confidence,
        reasoning: `Found ${matchingItemIds.length} items related to ${analysis.mainTopic}`,
        status: 'pending',
      });

    if (error) {
      console.error('Error creating folder recommendation:', error);
    }
  } catch (error) {
    console.error('Error in suggestFolderCreation:', error);
  }
}

function selectIconForTheme(theme: string): string {
  const themeMap: { [key: string]: string } = {
    'Technical Education': 'code',
    'Personal Finance': 'dollar-sign',
    'Health & Wellness': 'heart',
    'Entertainment': 'play-circle',
    'News': 'newspaper',
    'Cooking': 'chef-hat',
    'Travel': 'plane',
    'Fashion': 'shirt',
    'Sports': 'trophy',
    'Music': 'music',
    'Art': 'palette',
    'Business': 'briefcase',
    'Science': 'flask',
    'Gaming': 'gamepad-2',
  };

  return themeMap[theme] || 'folder';
}
