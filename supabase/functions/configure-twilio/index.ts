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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    if (!accountSid || !authToken) {
      return new Response(
        JSON.stringify({ 
          error: 'Twilio credentials not configured'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get phone number SID from request
    const { phoneNumber } = await req.json();

    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ error: 'Phone number required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the phone number SID
    const listUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`;
    const listResponse = await fetch(listUrl, {
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
      },
    });

    const listData = await listResponse.json();
    const phoneNumberRecord = listData.incoming_phone_numbers.find(
      (num: any) => num.phone_number === phoneNumber
    );

    if (!phoneNumberRecord) {
      return new Response(
        JSON.stringify({ error: 'Phone number not found in account' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update the webhook
    const webhookUrl = `${supabaseUrl}/functions/v1/sms-webhook`;
    const updateUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers/${phoneNumberRecord.sid}.json`;
    
    const updateResponse = await fetch(updateUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        SmsUrl: webhookUrl,
        SmsMethod: 'POST',
      }),
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      throw new Error(`Failed to update webhook: ${JSON.stringify(errorData)}`);
    }

    const result = await updateResponse.json();

    return new Response(
      JSON.stringify({ 
        success: true,
        phoneNumber: result.phone_number,
        webhookUrl: result.sms_url,
        message: 'Webhook configured successfully'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error configuring webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to configure webhook', details: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});