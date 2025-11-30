import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  console.log('=== FUNCTION INVOKED ===');
  console.log('Method:', req.method);
  console.log('Headers:', Object.fromEntries(req.headers.entries()));
  
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Getting user from token...');
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError) {
      console.error('Auth error:', authError);
      throw new Error('Unauthorized: ' + authError.message);
    }
    
    if (!user) {
      throw new Error('Unauthorized: No user found');
    }

    console.log('User authenticated:', user.id);

    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');

    console.log('Twilio credentials check:');
    console.log('  TWILIO_ACCOUNT_SID present:', !!twilioAccountSid);
    console.log('  TWILIO_AUTH_TOKEN present:', !!twilioAuthToken);

    if (!twilioAccountSid || !twilioAuthToken) {
      throw new Error('Twilio credentials not configured');
    }

    const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    console.log('Fetching Twilio phone numbers...');
    const numbersUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/IncomingPhoneNumbers.json`;

    const numbersResponse = await fetch(numbersUrl, {
      headers: {
        'Authorization': `Basic ${auth}`,
      },
    });

    if (!numbersResponse.ok) {
      const errorText = await numbersResponse.text();
      console.error('Twilio API error:', errorText);
      throw new Error(`Twilio API error: ${numbersResponse.status}`);
    }

    const numbersData = await numbersResponse.json();
    const phoneNumbers = numbersData.incoming_phone_numbers || [];

    if (phoneNumbers.length === 0) {
      throw new Error('No Twilio phone numbers found');
    }
    
    const twilioPhoneNumber = phoneNumbers[0].phone_number;
    console.log(`Using Twilio number: ${twilioPhoneNumber}`);

    console.log('Fetching messages from Twilio...');

    let allMessages: any[] = [];
    let nextPageUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json?To=${encodeURIComponent(twilioPhoneNumber)}&PageSize=100`;
    let pageCount = 0;
    const MAX_PAGES = 3;
    const MAX_MESSAGES = 300;

    while (nextPageUrl && pageCount < MAX_PAGES && allMessages.length < MAX_MESSAGES) {
      pageCount++;
      console.log(`Fetching page ${pageCount}...`);
      
      const twilioResponse = await fetch(nextPageUrl, {
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      });

      if (!twilioResponse.ok) {
        const errorText = await twilioResponse.text();
        console.error('Twilio API error:', errorText);
        throw new Error(`Twilio API error: ${twilioResponse.status}`);
      }

      const twilioData = await twilioResponse.json();
      const messages = twilioData.messages || [];
      console.log(`Page ${pageCount}: Found ${messages.length} messages`);
      
      allMessages = allMessages.concat(messages);

      nextPageUrl = twilioData.next_page_uri
        ? `https://api.twilio.com${twilioData.next_page_uri}`
        : null;
    }

    console.log(`Total messages fetched: ${allMessages.length}`);

    if (allMessages.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          total: 0,
          imported: 0,
          skipped: 0,
          errors: 0,
          message: 'No messages found'
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const message of allMessages) {
      try {
        const fromPhone = message.from.replace(/[^0-9]/g, '');
        const fromPhoneWithout1 = fromPhone.startsWith('1') ? fromPhone.substring(1) : fromPhone;

        let userData = null;

        const { data: userData1 } = await supabase
          .from('users')
          .select('id, phone_number, email')
          .eq('phone_number', fromPhone)
          .maybeSingle();

        if (!userData1 && fromPhone !== fromPhoneWithout1) {
          const { data: userData2 } = await supabase
            .from('users')
            .select('id, phone_number, email')
            .eq('phone_number', fromPhoneWithout1)
            .maybeSingle();
          userData = userData2;
        } else {
          userData = userData1;
        }

        if (!userData) {
          skippedCount++;
          continue;
        }

        const body = message.body?.trim();
        if (!body) {
          skippedCount++;
          continue;
        }

        const { data: existingItem } = await supabase
          .from('items')
          .select('id')
          .eq('user_id', userData.id)
          .eq('raw_content', body)
          .maybeSingle();

        if (existingItem) {
          skippedCount++;
          continue;
        }

        const urlPattern = /(https?:\/\/[^\s]+)/gi;
        const urls = body.match(urlPattern);
        const hasUrl = urls && urls.length > 0;
        const itemType = hasUrl ? 'article' : 'note';

        const { error: insertError } = await supabase
          .from('items')
          .insert({
            user_id: userData.id,
            raw_content: body,
            type: itemType,
            title: hasUrl ? urls[0] : body.substring(0, 100),
            status: 'active',
            created_at: message.date_sent || new Date().toISOString(),
          });

        if (insertError) {
          errorCount++;
          continue;
        }

        importedCount++;
      } catch (itemError) {
        errorCount++;
      }
    }

    console.log('Sync complete:');
    console.log('  Total:', allMessages.length);
    console.log('  Imported:', importedCount);
    console.log('  Skipped:', skippedCount);
    console.log('  Errors:', errorCount);

    return new Response(
      JSON.stringify({
        success: true,
        total: allMessages.length,
        imported: importedCount,
        skipped: skippedCount,
        errors: errorCount,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Function error:', error);
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