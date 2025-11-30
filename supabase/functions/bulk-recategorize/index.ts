import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const FOLDER_HIERARCHY = {
  'Politics': {
    icon: '🗳️',
    subfolders: {
      'Left': { icon: '⬅️' },
      'Right': { icon: '➡️' },
      'Center': { icon: '⚖️' },
    }
  },
  'Education': {
    icon: '📚',
    subfolders: {
      'Coding': { icon: '💻' },
      'University': { icon: '🎓' },
      'Research': { icon: '🔬' },
      'Tutorials': { icon: '📖' },
      'Tips': { icon: '💡' },
    }
  },
  'Neuroscience': {
    icon: '🧠',
    subfolders: {
      'Brain': { icon: '🧠' },
      'Body': { icon: '💪' },
      'Psychology': { icon: '🧘' },
    }
  },
  'Affirmations': {
    icon: '✨',
    subfolders: {
      'Biblical': { icon: '📖' },
      'Energy': { icon: '⚡' },
      'Positive': { icon: '🌟' },
    }
  },
  'Entertainment': {
    icon: '🎬',
    subfolders: {
      'Celebrities': { icon: '⭐' },
      'Music': { icon: '🎵' },
      'Sports': { icon: '⚽' },
      'Fights': { icon: '🥊' },
      'Movies': { icon: '🎥' },
      'TV Shows': { icon: '📺' },
    }
  },
  'Funny': {
    icon: '😂',
    subfolders: {
      'Videos': { icon: '🎬' },
      'Memes': { icon: '🤣' },
      'Jokes': { icon: '😄' },
    }
  },
  'Health': {
    icon: '🏥',
    subfolders: {
      'Diet': { icon: '🥗' },
      'Healing': { icon: '💚' },
      'Disease': { icon: '🩺' },
      'Fitness': { icon: '💪' },
      'Mental': { icon: '🧘' },
    }
  },
  'Conspiracy': {
    icon: '👁️',
    subfolders: {
      'Government': { icon: '🏛️' },
      'Science': { icon: '🔬' },
      'Historical': { icon: '📜' },
    }
  },
  'Technology': {
    icon: '💻',
    subfolders: {
      'AI': { icon: '🤖' },
      'Crypto': { icon: '💰' },
      'Gadgets': { icon: '📱' },
      'Software': { icon: '⚙️' },
    }
  },
  'Business': {
    icon: '💼',
    subfolders: {
      'Startup': { icon: '🚀' },
      'Marketing': { icon: '📊' },
      'Finance': { icon: '💵' },
      'Investing': { icon: '📈' },
    }
  },
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId } = await req.json();

    for (const [categoryName, categoryData] of Object.entries(FOLDER_HIERARCHY)) {
      const { data: parentFolder } = await supabase
        .from('folders')
        .upsert({
          user_id: userId,
          name: categoryName,
          path: categoryName,
          icon: categoryData.icon,
          is_auto_generated: true,
        }, { onConflict: 'user_id,path' })
        .select()
        .single();

      if (parentFolder && categoryData.subfolders) {
        for (const [subName, subData] of Object.entries(categoryData.subfolders)) {
          await supabase.from('folders').upsert({
            user_id: userId,
            name: subName,
            path: `${categoryName}/${subName}`,
            icon: subData.icon,
            parent_folder_id: parentFolder.id,
            is_auto_generated: true,
          }, { onConflict: 'user_id,path' });
        }
      }
    }

    const { data: items } = await supabase.from('items').select('*').eq('user_id', userId).eq('status', 'active');

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ success: true, itemsProcessed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let processed = 0;
    for (const item of items) {
      try {
        const aiCategories = await categorizeWithAI(openaiApiKey, item);
        for (const category of aiCategories) {
          const { data: folder } = await supabase.from('folders').select('id').eq('user_id', userId).eq('path', category).maybeSingle();
          if (folder) {
            await supabase.from('item_folders').upsert({ item_id: item.id, folder_id: folder.id, added_by_ai: true }, {
              onConflict: 'item_id,folder_id', ignoreDuplicates: true
            });
          }
        }
        processed++;
      } catch (e) {}
    }

    return new Response(JSON.stringify({ success: true, itemsProcessed: processed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function categorizeWithAI(apiKey: string | undefined, item: any): Promise<string[]> {
  if (!apiKey) return [];
  try {
    const content = `${item.title || ''} ${item.summary || ''} ${item.raw_content || ''}`;
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: `Categorize into subfolders: ${content}. Return JSON: {"folders":["Politics/Left","Health/Diet"]}`
        }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      }),
    });
    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    return result.folders || [];
  } catch {
    return [];
  }
}