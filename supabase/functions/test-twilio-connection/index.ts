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

    console.log('TWILIO_ACCOUNT_SID exists:', !!twilioAccountSid);
    console.log('TWILIO_AUTH_TOKEN exists:', !!twilioAuthToken);

    if (!twilioAccountSid || !twilioAuthToken) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Twilio credentials not configured',
          has_sid: !!twilioAccountSid,
          has_token: !!twilioAuthToken,
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
    const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/IncomingPhoneNumbers.json`;

    console.log('Calling Twilio API...');
    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${auth}`,
      },
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Twilio error:', errorText);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Twilio API call failed',
          status: response.status,
          details: errorText,
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const data = await response.json();
    console.log('Twilio response:', JSON.stringify(data, null, 2));

    return new Response(
      JSON.stringify({
        success: true,
        phone_numbers: data.incoming_phone_numbers || [],
        count: data.incoming_phone_numbers?.length || 0,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});