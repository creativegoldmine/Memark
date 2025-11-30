import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface TwilioSMSPayload {
  From: string;
  Body: string;
  MediaUrl0?: string;
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

    const formData = await req.formData();
    const from = formData.get('From') as string;
    const body = formData.get('Body') as string;
    const mediaUrl = formData.get('MediaUrl0') as string | null;

    const phoneNumber = from.replace(/\D/g, '');

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', phoneNumber)
      .maybeSingle();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: item, error: itemError } = await supabase
      .from('items')
      .insert({
        user_id: user.id,
        raw_content: body,
        media_url: mediaUrl,
        status: 'active',
        review_stage: 1,
        next_review_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (itemError) {
      throw itemError;
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/categorize-item`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemId: item.id, content: body, userId: user.id }),
      }
    );

    return new Response(
      JSON.stringify({ success: true, itemId: item.id }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing SMS:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});