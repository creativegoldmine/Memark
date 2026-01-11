import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ShareRequest {
  content: string;
  type?: 'url' | 'text';
  title?: string;
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { content, type, title }: ShareRequest = await req.json();

    if (!content) {
      throw new Error('Content is required');
    }

    const isUrl = type === 'url' || content.startsWith('http://') || content.startsWith('https://');
    const itemType = isUrl ? 'article' : 'text';

    const newItem = {
      user_id: user.id,
      raw_content: content,
      type: itemType,
      title: title || (isUrl ? 'Shared Link' : 'Shared Text'),
      summary: '',
      tags: ['shared'],
      status: 'active',
      score: 50,
      review_stage: 1,
      next_review_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: item, error: insertError } = await supabase
      .from('items')
      .insert(newItem)
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    if (isUrl) {
      try {
        await supabase.functions.invoke('categorize-item', {
          body: { item_id: item.id },
        });
      } catch (categError) {
        console.error('AI categorization failed (non-fatal):', categError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        item: item,
        message: 'Content saved to Memark!',
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in share-to-memark:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
