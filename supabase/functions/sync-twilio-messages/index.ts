import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');

    if (!twilioAccountSid || !twilioAuthToken) {
      console.error('MISSING CREDENTIALS!');
      console.error('TWILIO_ACCOUNT_SID present:', !!twilioAccountSid);
      console.error('TWILIO_AUTH_TOKEN present:', !!twilioAuthToken);
      throw new Error('Twilio credentials are NOT configured in Supabase. Go to Supabase Dashboard → Edge Functions → Secrets and add: TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN');
    }

    const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    console.log('=== STARTING TWILIO SYNC ===');
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
      throw new Error(`Twilio API error fetching numbers: ${numbersResponse.status} ${numbersResponse.statusText}`);
    }

    const numbersData = await numbersResponse.json();
    const phoneNumbers = numbersData.incoming_phone_numbers || [];

    if (phoneNumbers.length === 0) {
      throw new Error('No Twilio phone numbers found in account');
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
        throw new Error(`Twilio API error: ${twilioResponse.status} ${twilioResponse.statusText}`);
      }

      const twilioData = await twilioResponse.json();
      const messages = twilioData.messages || [];
      console.log(`Page ${pageCount}: Found ${messages.length} messages`);
      
      allMessages = allMessages.concat(messages);

      nextPageUrl = twilioData.next_page_uri
        ? `https://api.twilio.com${twilioData.next_page_uri}`
        : null;
    }

    console.log(`=== TOTAL MESSAGES FETCHED: ${allMessages.length} ===`);
    console.log(`Pages fetched: ${pageCount}`);

    if (allMessages.length >= MAX_MESSAGES) {
      console.log(`Reached maximum message limit of ${MAX_MESSAGES}`);
    }

    if (allMessages.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          total: 0,
          imported: 0,
          skipped: 0,
          errors: 0,
          message: 'No messages found in Twilio account for this number'
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
    const errorDetails: string[] = [];

    for (let i = 0; i < allMessages.length; i++) {
      const message = allMessages[i];
      
      try {
        console.log(`\n--- Processing message ${i + 1}/${allMessages.length} ---`);
        console.log('Message SID:', message.sid);
        console.log('From:', message.from);
        console.log('To:', message.to);
        console.log('Body:', message.body?.substring(0, 50));
        console.log('Date sent:', message.date_sent);

        const fromPhone = message.from.replace(/[^0-9]/g, '');
        console.log('Cleaned phone:', fromPhone);

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, phone_number, email')
          .eq('phone_number', fromPhone)
          .maybeSingle();

        if (userError) {
          console.error('Database error finding user:', userError);
          errorCount++;
          errorDetails.push(`User lookup failed for ${fromPhone}`);
          continue;
        }

        if (!userData) {
          console.log(`No user found for phone: ${fromPhone} - SKIPPING`);
          skippedCount++;
          continue;
        }

        console.log('Found user:', userData.email);

        const body = message.body?.trim();
        if (!body || body.length === 0) {
          console.log('Empty body - SKIPPING');
          skippedCount++;
          continue;
        }

        console.log('Message body:', body);

        const { data: existingItem } = await supabase
          .from('items')
          .select('id')
          .eq('user_id', userData.id)
          .eq('raw_content', body)
          .maybeSingle();

        if (existingItem) {
          console.log('Duplicate message - SKIPPING');
          skippedCount++;
          continue;
        }

        const urlPattern = /(https?:\/\/[^\s]+)/gi;
        const urls = body.match(urlPattern);
        const hasUrl = urls && urls.length > 0;

        const itemType = hasUrl ? 'article' : 'note';
        console.log('Item type:', itemType);

        const { data: newItem, error: insertError } = await supabase
          .from('items')
          .insert({
            user_id: userData.id,
            raw_content: body,
            type: itemType,
            title: hasUrl ? urls[0] : body.substring(0, 100),
            status: 'active',
            created_at: message.date_sent || new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) {
          console.error('Insert error:', insertError);
          errorCount++;
          errorDetails.push(`Insert failed: ${insertError.message}`);
          continue;
        }

        console.log('✓ IMPORTED successfully! Item ID:', newItem.id);
        importedCount++;

        if (newItem && hasUrl) {
          try {
            console.log('Triggering AI categorization...');
            const categorizeUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/categorize-item`;
            await fetch(categorizeUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              },
              body: JSON.stringify({
                item_id: newItem.id,
                user_id: userData.id,
              }),
            });
            console.log('Categorization triggered');
          } catch (categorizeError) {
            console.error('Categorization failed:', categorizeError);
          }
        }
      } catch (itemError) {
        console.error('Error processing message:', itemError);
        errorCount++;
        errorDetails.push(`Processing error: ${itemError.message}`);
      }
    }

    console.log('\n=== SYNC COMPLETE ===');
    console.log('Total messages:', allMessages.length);
    console.log('Imported:', importedCount);
    console.log('Skipped:', skippedCount);
    console.log('Errors:', errorCount);

    return new Response(
      JSON.stringify({
        success: true,
        total: allMessages.length,
        imported: importedCount,
        skipped: skippedCount,
        errors: errorCount,
        errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('=== SYNC FAILED ===');
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