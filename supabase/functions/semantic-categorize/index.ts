import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface DeepSemanticAnalysis {
  primaryTopic: string;
  subTopics: string[];
  keywords: string[];
  contentIntent: string;
  contentTheme: string;
  sentiment: string;
  educationalValue: number;
  actionability: number;
  suggestedFolderPath: string;
  suggestedFolderName: string;
  confidence: number;
  reasoning: string;
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

    const analysis = await performDeepSemanticAnalysis(
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
        content_topics: [analysis.primaryTopic, ...analysis.subTopics],
        semantic_category: analysis.contentTheme,
        topic_confidence: analysis.confidence,
        tags: analysis.keywords.slice(0, 10),
      })
      .eq('id', itemId);

    if (updateError) {
      console.error('Error updating item:', updateError);
    }

    await supabase.from('ai_event_log').insert({
      user_id: userId,
      item_id: itemId,
      action_type: 'deep_semantic_analysis',
      ai_output: {
        analysis,
        timestamp: new Date().toISOString(),
      },
    });

    if (!batchMode) {
      await processSemanticClustering(
        userId,
        itemId,
        analysis,
        supabase
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
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

async function performDeepSemanticAnalysis(
  content: string,
  metadata: any,
  openaiKey: string
): Promise<DeepSemanticAnalysis | null> {
  try {
    const prompt = `You are a deep semantic analyzer. Analyze this content with precision and return ONLY valid JSON.

Content: ${content}
Title: ${metadata?.og_title || metadata?.title || metadata?.preview_title || ''}
Description: ${metadata?.og_description || metadata?.description || metadata?.preview_desc || ''}
Platform: ${metadata?.platform_type || 'unknown'}
Site: ${metadata?.og_site_name || ''}

Extract comprehensive semantic information:

1. PRIMARY TOPIC: The main subject matter (be SPECIFIC: "React Hooks Tutorial" not "Programming", "Quantum Entanglement" not "Physics", "Kettlebell Training" not "Fitness")

2. SUB-TOPICS: 4-6 related subtopics that further categorize the content

3. KEYWORDS: Extract 20-30 specific keywords and phrases that describe the content. Include:
   - Technical terms
   - Named entities (people, products, companies)
   - Key concepts
   - Actionable terms

4. CONTENT INTENT: Primary purpose (choose ONE):
   - "Educational Tutorial" - Teaching how to do something
   - "Educational Explanation" - Explaining a concept
   - "News" - Current events, announcements
   - "Opinion" - Commentary, analysis, perspective
   - "Entertainment" - Humor, stories, fun
   - "Inspiration" - Motivational, aspirational
   - "Reference" - Documentation, specs, data
   - "Personal Note" - User's own thoughts

5. CONTENT THEME: Broad category (e.g., "Technology", "Health & Wellness", "Business Strategy", "Politics", "Science", "Entertainment", "Personal Development")

6. SENTIMENT: Overall tone (for opinion/political content)
   - "Positive" - Favorable, optimistic
   - "Negative" - Critical, pessimistic
   - "Neutral" - Balanced, factual
   - "Mixed" - Contains both perspectives
   - "Not Applicable" - For non-opinion content

7. EDUCATIONAL VALUE: 0-10 score (how much could user learn from this?)

8. ACTIONABILITY: 0-10 score (how actionable/practical is this content?)

9. SUGGESTED FOLDER PATH: Where this should go (e.g., "Coding/React/Hooks", "Health/Fitness/Strength Training", "Politics/US/Conservative")

10. FOLDER NAME: Short name for the folder (e.g., "React Hooks", "Strength Training", "Conservative Politics")

11. CONFIDENCE: 0-1 score for how confident you are in this categorization

12. REASONING: Brief explanation of why you categorized it this way

Return JSON structure:
{
  "primaryTopic": "string",
  "subTopics": ["string", ...],
  "keywords": ["string", ...],
  "contentIntent": "string",
  "contentTheme": "string",
  "sentiment": "string",
  "educationalValue": number,
  "actionability": number,
  "suggestedFolderPath": "string",
  "suggestedFolderName": "string",
  "confidence": number,
  "reasoning": "string"
}`;

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
            content: 'You are an expert semantic content analyzer. You understand nuance, context, and can categorize content with precision. Always return valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', await response.text());
      return null;
    }

    const data = await response.json();
    const analysis = JSON.parse(data.choices[0].message.content);

    return {
      primaryTopic: analysis.primaryTopic || 'General',
      subTopics: analysis.subTopics || [],
      keywords: analysis.keywords || [],
      contentIntent: analysis.contentIntent || 'Unknown',
      contentTheme: analysis.contentTheme || 'General',
      sentiment: analysis.sentiment || 'Neutral',
      educationalValue: analysis.educationalValue || 5,
      actionability: analysis.actionability || 5,
      suggestedFolderPath: analysis.suggestedFolderPath || 'General',
      suggestedFolderName: analysis.suggestedFolderName || 'Miscellaneous',
      confidence: analysis.confidence || 0.5,
      reasoning: analysis.reasoning || '',
    };
  } catch (error) {
    console.error('Error in performDeepSemanticAnalysis:', error);
    return null;
  }
}

async function processSemanticClustering(
  userId: string,
  itemId: string,
  analysis: DeepSemanticAnalysis,
  supabase: any
) {
  try {
    const similarItems = await findSemanticallySimilarItems(
      userId,
      analysis.primaryTopic,
      analysis.keywords,
      itemId,
      supabase
    );

    if (similarItems.length >= 2) {
      await createOrUpdateSemanticCluster(
        userId,
        itemId,
        analysis,
        similarItems,
        supabase
      );
    }
  } catch (error) {
    console.error('Error in processSemanticClustering:', error);
  }
}

async function findSemanticallySimilarItems(
  userId: string,
  primaryTopic: string,
  keywords: string[],
  excludeItemId: string,
  supabase: any
) {
  try {
    const { data: items, error } = await supabase
      .from('items')
      .select('id, title, content_topics, tags, semantic_category')
      .eq('user_id', userId)
      .neq('id', excludeItemId)
      .eq('status', 'active')
      .not('content_topics', 'is', null)
      .limit(100);

    if (error || !items) return [];

    const similarItems = items.filter((item: any) => {
      if (!item.content_topics || !Array.isArray(item.content_topics)) return false;

      const topicMatch = item.content_topics.some((topic: string) =>
        topic.toLowerCase().includes(primaryTopic.toLowerCase()) ||
        primaryTopic.toLowerCase().includes(topic.toLowerCase())
      );

      if (topicMatch) return true;

      if (item.tags && Array.isArray(item.tags)) {
        const keywordOverlap = item.tags.filter((tag: string) =>
          keywords.some(kw =>
            kw.toLowerCase().includes(tag.toLowerCase()) ||
            tag.toLowerCase().includes(kw.toLowerCase())
          )
        );
        return keywordOverlap.length >= 3;
      }

      return false;
    });

    return similarItems;
  } catch (error) {
    console.error('Error finding semantically similar items:', error);
    return [];
  }
}

async function createOrUpdateSemanticCluster(
  userId: string,
  newItemId: string,
  analysis: DeepSemanticAnalysis,
  similarItems: any[],
  supabase: any
) {
  try {
    const clusterKey = analysis.primaryTopic.toLowerCase().replace(/\s+/g, '-');

    const { data: existingCluster } = await supabase
      .from('semantic_clusters')
      .select('*')
      .eq('user_id', userId)
      .eq('primary_topic', analysis.primaryTopic)
      .maybeSingle();

    const allItemIds = [newItemId, ...similarItems.map((i: any) => i.id)];

    if (existingCluster) {
      const updatedItemIds = Array.from(new Set([...existingCluster.item_ids, ...allItemIds]));

      await supabase
        .from('semantic_clusters')
        .update({
          item_ids: updatedItemIds,
          item_count: updatedItemIds.length,
          keywords: Array.from(new Set([...existingCluster.keywords, ...analysis.keywords.slice(0, 10)])),
          related_topics: Array.from(new Set([...existingCluster.related_topics, ...analysis.subTopics])),
          confidence_score: Math.max(existingCluster.confidence_score, analysis.confidence),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingCluster.id);

      if (existingCluster.status === 'detected' && updatedItemIds.length >= 5) {
        await supabase
          .from('semantic_clusters')
          .update({ status: 'suggested' })
          .eq('id', existingCluster.id);

        await createInsightForCluster(userId, existingCluster.id, analysis, updatedItemIds.length, supabase);
      }
    } else {
      const { data: newCluster } = await supabase
        .from('semantic_clusters')
        .insert({
          user_id: userId,
          cluster_name: analysis.primaryTopic,
          primary_topic: analysis.primaryTopic,
          related_topics: analysis.subTopics,
          keywords: analysis.keywords.slice(0, 10),
          item_ids: allItemIds,
          item_count: allItemIds.length,
          confidence_score: analysis.confidence,
          suggested_folder_name: analysis.suggestedFolderName,
          suggested_icon: selectIconForTheme(analysis.contentTheme),
          status: allItemIds.length >= 5 ? 'suggested' : 'detected',
        })
        .select()
        .single();

      if (newCluster && allItemIds.length >= 5) {
        await createInsightForCluster(userId, newCluster.id, analysis, allItemIds.length, supabase);
      }
    }
  } catch (error) {
    console.error('Error in createOrUpdateSemanticCluster:', error);
  }
}

async function createInsightForCluster(
  userId: string,
  clusterId: string,
  analysis: DeepSemanticAnalysis,
  itemCount: number,
  supabase: any
) {
  try {
    await supabase
      .from('ai_insights')
      .insert({
        user_id: userId,
        insight_type: 'organization_suggestion',
        title: `Create a folder for ${analysis.primaryTopic}?`,
        description: `You have ${itemCount} items about ${analysis.primaryTopic}. Would you like me to create a folder to organize them?`,
        data: {
          cluster_id: clusterId,
          suggested_folder_name: analysis.suggestedFolderName,
          suggested_folder_path: analysis.suggestedFolderPath,
          item_count: itemCount,
          confidence: analysis.confidence,
        },
        priority: itemCount >= 10 ? 'high' : 'medium',
        status: 'active',
      });
  } catch (error) {
    console.error('Error creating insight:', error);
  }
}

function selectIconForTheme(theme: string): string {
  const themeMap: { [key: string]: string } = {
    'Technology': 'cpu',
    'Coding': 'code',
    'Programming': 'code',
    'Web Development': 'globe',
    'AI & Machine Learning': 'brain',
    'Personal Finance': 'dollar-sign',
    'Business': 'briefcase',
    'Business Strategy': 'target',
    'Marketing': 'megaphone',
    'Health & Wellness': 'heart',
    'Fitness': 'dumbbell',
    'Nutrition': 'apple',
    'Mental Health': 'brain',
    'Politics': 'landmark',
    'Science': 'flask',
    'Physics': 'atom',
    'Biology': 'dna',
    'Entertainment': 'play-circle',
    'Movies & TV': 'film',
    'Music': 'music',
    'Gaming': 'gamepad-2',
    'Sports': 'trophy',
    'News': 'newspaper',
    'Education': 'graduation-cap',
    'Personal Development': 'trending-up',
    'Productivity': 'zap',
    'Design': 'palette',
    'Art': 'paintbrush',
    'Photography': 'camera',
    'Travel': 'plane',
    'Food & Cooking': 'chef-hat',
    'Fashion': 'shirt',
    'Home & Garden': 'home',
    'DIY': 'wrench',
  };

  for (const [key, icon] of Object.entries(themeMap)) {
    if (theme.toLowerCase().includes(key.toLowerCase())) {
      return icon;
    }
  }

  return 'folder';
}
