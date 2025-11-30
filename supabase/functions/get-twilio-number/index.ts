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
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');

    if (!accountSid || !authToken) {
      return new Response(
        JSON.stringify({ 
          error: 'Twilio credentials not configured',
          details: 'Please add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN secrets'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
      },
    });

    if (!response.ok) {
      throw new Error(`Twilio API error: ${response.statusText}`);
    }

    const data = await response.json();
    const phoneNumbers = data.incoming_phone_numbers || [];

    if (phoneNumbers.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No phone numbers found',
          details: 'No active phone numbers in this Twilio account'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return all numbers with their webhook configs
    const numbers = phoneNumbers.map((num: any) => ({
      phoneNumber: num.phone_number,
      friendlyName: num.friendly_name,
      smsUrl: num.sms_url,
      capabilities: num.capabilities,
    }));

    return new Response(
      JSON.stringify({ 
        success: true,
        numbers,
        memarkNumber: numbers[0].phoneNumber,
        webhookConfigured: numbers[0].smsUrl?.includes('sms-webhook')
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error fetching Twilio numbers:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch Twilio numbers', details: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});