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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { itemId, userId } = await req.json();

    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (itemError || !item) {
      throw new Error('Item not found');
    }

    const folders = [];

    if (item.category) {
      const categoryFolder = await getOrCreateFolder(
        supabase,
        userId,
        item.category,
        null,
        item.category.toLowerCase(),
        getCategoryIcon(item.category),
        item.category
      );
      folders.push(categoryFolder.id);
    }

    if (item.tags && Array.isArray(item.tags) && item.tags.length > 0) {
      const { data: existingFolders } = await supabase
        .from('folders')
        .select('id, name, path')
        .eq('user_id', userId);

      const existingFolderNames = new Set(
        existingFolders?.map((f: any) => f.name.toLowerCase()) || []
      );

      const priorityTag = item.tags[0];
      if (priorityTag) {
        const normalizedTag = priorityTag.toString().toLowerCase();

        if (normalizedTag.length >= 3 && normalizedTag.length <= 30) {
          const tagName = priorityTag.toString()
            .split('-')
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

          if (!existingFolderNames.has(tagName.toLowerCase())) {
            const { data: itemCount } = await supabase
              .from('items')
              .select('id', { count: 'exact' })
              .eq('user_id', userId)
              .contains('tags', [priorityTag]);

            if (itemCount && itemCount.length >= 3) {
              const tagFolder = await getOrCreateFolder(
                supabase,
                userId,
                tagName,
                null,
                `tag-${normalizedTag}`,
                getTagIcon(normalizedTag),
                null
              );
              folders.push(tagFolder.id);
            }
          } else {
            const existingFolder = existingFolders?.find(
              (f: any) => f.name.toLowerCase() === tagName.toLowerCase()
            );
            if (existingFolder) {
              folders.push(existingFolder.id);
            }
          }
        }
      }
    }

    for (const folderId of folders) {
      await supabase
        .from('item_folders')
        .upsert({
          item_id: itemId,
          folder_id: folderId,
          added_by_ai: true,
        }, {
          onConflict: 'item_id,folder_id',
          ignoreDuplicates: true,
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        foldersAdded: folders.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in auto-folder-categorize:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function extractUrl(text: string): string | null {
  const urlMatch = text.match(/https?:\/\/[^\s]+/);
  return urlMatch ? urlMatch[0] : null;
}

function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    if (hostname.includes('x.com') || hostname.includes('twitter.com')) {
      return 'x.com';
    }
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      return 'youtube.com';
    }
    if (hostname.includes('github.com')) {
      return 'github.com';
    }

    const parts = hostname.split('.');
    if (parts.length >= 2) {
      return parts.slice(-2).join('.');
    }
    return hostname;
  } catch {
    return null;
  }
}

async function getOrCreateFolder(
  supabase: any,
  userId: string,
  name: string,
  parentId: string | null,
  path: string,
  icon: string,
  autoRule: string | null
) {
  const { data: existingFolder } = await supabase
    .from('folders')
    .select('*')
    .eq('user_id', userId)
    .ilike('name', name)
    .maybeSingle();

  if (existingFolder) {
    return existingFolder;
  }

  const { data: folder, error } = await supabase
    .from('folders')
    .insert({
      user_id: userId,
      name,
      parent_folder_id: parentId,
      path,
      icon,
      is_auto_generated: true,
      auto_rule: autoRule,
    })
    .select()
    .single();

  if (error) throw error;
  return folder;
}

function getDomainIcon(domain: string): string {
  const icons: Record<string, string> = {
    'x.com': '𝕏',
    'twitter.com': '𝕏',
    'youtube.com': '📺',
    'github.com': '⚡',
    'medium.com': '📝',
    'reddit.com': '🤖',
    'linkedin.com': '💼',
    'facebook.com': '📘',
    'instagram.com': '📷',
  };
  return icons[domain] || '🌐';
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    'Technology': '💻',
    'Development': '⚡',
    'Programming': '👨‍💻',
    'Tutorial': '📖',
    'Education': '📚',
    'Learning': '🎓',
    'Entertainment': '🎬',
    'News': '📰',
    'News-Politics': '🏛️',
    'News-Tech': '📱',
    'News-Celebrity': '⭐',
    'Business': '💼',
    'Strategy': '♟️',
    'Health': '🏥',
    'Fitness': '💪',
    'Science': '🔬',
    'Sports': '⚽',
    'Travel': '✈️',
    'Food': '🍔',
    'Inspiration': '✨',
    'Creative': '🎨',
    'Design': '🖌️',
    'Social': '👥',
    'Culture': '🌍',
    'Finance': '💰',
    'Career': '📈',
    'Personal-Growth': '🌱',
  };
  return icons[category] || '📂';
}

function getTagIcon(tag: string): string {
  const tagIcons: Record<string, string> = {
    'coding': '💻',
    'react': '⚛️',
    'javascript': '💛',
    'python': '🐍',
    'ai': '🤖',
    'tutorial': '📖',
    'learning': '🎓',
    'business': '💼',
    'strategy': '♟️',
    'design': '🎨',
    'inspiration': '✨',
    'vibe': '🌊',
    'news': '📰',
    'politics': '🏛️',
    'celebrity': '⭐',
    'trump': '🇺🇸',
    'tech': '💡',
    'health': '🏥',
    'fitness': '💪',
    'finance': '💰',
    'career': '📈',
  };

  for (const [key, icon] of Object.entries(tagIcons)) {
    if (tag.includes(key)) return icon;
  }

  return '🏷️';
}

function getTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    'video': '🎥',
    'article': '📄',
    'text': '📝',
    'link': '🔗',
    'image': '🖼️',
    'note': '📌',
  };
  return icons[type] || '📄';
}
