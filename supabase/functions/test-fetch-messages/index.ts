const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');

    if (!twilioAccountSid || !twilioAuthToken) {
      return new Response(
        JSON.stringify({ error: 'Twilio credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
    const phoneNumber = '+18623553847';
    
    console.log(`Fetching messages TO ${phoneNumber}...`);
    
    const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json?To=${encodeURIComponent(phoneNumber)}&PageSize=20`;
    console.log('URL:', url);
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Basic ${auth}` },
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Twilio error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Twilio API failed', status: response.status, details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('Messages found:', data.messages?.length || 0);
    
    return new Response(
      JSON.stringify({
        success: true,
        count: data.messages?.length || 0,
        messages: data.messages || [],
        uri: data.uri,
        first_page_uri: data.first_page_uri,
        next_page_uri: data.next_page_uri,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});