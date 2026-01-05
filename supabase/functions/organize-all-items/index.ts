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

    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('id, title, category, type, raw_content')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (itemsError) {
      throw itemsError;
    }

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No items to process', processed: 0 }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let processed = 0;
    let failed = 0;
    const batchSize = 10;

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      const promises = batch.map(async (item) => {
        try {
          const response = await fetch(
            `${supabaseUrl}/functions/v1/auto-folder-categorize`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                itemId: item.id,
                userId: userId,
              }),
            }
          );

          if (response.ok) {
            processed++;
          } else {
            failed++;
            console.error(`Failed to process item ${item.id}:`, await response.text());
          }
        } catch (error) {
          failed++;
          console.error(`Error processing item ${item.id}:`, error);
        }
      });

      await Promise.all(promises);
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalItems: items.length,
        processed,
        failed,
        message: `Processed ${processed} items, ${failed} failed`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in organize-all-items:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});