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

    const fromPhone = allMessages[0]?.from.replace(/[^0-9]/g, '');
    const fromPhoneWithout1 = fromPhone?.startsWith('1') ? fromPhone.substring(1) : fromPhone;

    const { data: users } = await supabase
      .from('users')
      .select('id, phone_number')
      .in('phone_number', [fromPhone, fromPhoneWithout1].filter(Boolean));

    const user = users?.[0];

    if (!user) {
      return new Response(
        JSON.stringify({
          success: true,
          total: allMessages.length,
          imported: 0,
          skipped: allMessages.length,
          errors: 0,
          message: 'User not found for phone number'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: existingItems } = await supabase
      .from('items')
      .select('raw_content')
      .eq('user_id', user.id);

    const existingContents = new Set(existingItems?.map(item => item.raw_content) || []);

    const itemsToInsert = [];
    let skippedCount = 0;

    for (const message of allMessages) {
      const body = message.body?.trim();
      if (!body || existingContents.has(body)) {
        skippedCount++;
        continue;
      }

      const urlPattern = /(https?:\/\/[^\s]+)/gi;
      const urls = body.match(urlPattern);
      const hasUrl = urls && urls.length > 0;

      itemsToInsert.push({
        user_id: user.id,
        raw_content: body,
        type: hasUrl ? 'article' : 'note',
        title: hasUrl ? urls[0] : body.substring(0, 100),
        status: 'active',
        created_at: message.date_sent || new Date().toISOString(),
      });
    }

    let importedCount = 0;
    let errorCount = 0;

    if (itemsToInsert.length > 0) {
      const { data, error } = await supabase
        .from('items')
        .insert(itemsToInsert)
        .select();

      if (error) {
        console.error('Bulk insert error:', error);
        errorCount = itemsToInsert.length;
      } else {
        importedCount = data?.length || 0;

        console.log(`Processing ${importedCount} newly imported items for metadata and categorization...`);

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

        for (const item of data || []) {
          try {
            const urlMatch = item.raw_content?.match(/(https?:\/\/[^\s]+)/);
            const hasUrl = urlMatch && urlMatch[0];

            if (hasUrl) {
              const metadataResponse = await fetch(
                `${supabaseUrl}/functions/v1/fetch-link-metadata`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ url: hasUrl }),
                }
              );

              if (metadataResponse.ok) {
                const metadataResult = await metadataResponse.json();
                if (metadataResult.success && metadataResult.metadata) {
                  const metadata = metadataResult.metadata;
                  const updateData: any = {
                    preview_fetched_at: new Date().toISOString(),
                  };

                  if (metadata.og_title) updateData.og_title = metadata.og_title;
                  if (metadata.og_description) updateData.og_description = metadata.og_description;
                  if (metadata.og_image) updateData.og_image = metadata.og_image;
                  if (metadata.og_site_name) updateData.og_site_name = metadata.og_site_name;
                  if (metadata.og_url) updateData.og_url = metadata.og_url;
                  if (metadata.og_type) updateData.og_type = metadata.og_type;
                  if (metadata.og_author) updateData.og_author = metadata.og_author;
                  if (metadata.author_name) updateData.author_name = metadata.author_name;
                  if (metadata.author_avatar) updateData.author_avatar = metadata.author_avatar;
                  if (metadata.platform_type) updateData.platform_type = metadata.platform_type;
                  if (metadata.embed_html) updateData.embed_html = metadata.embed_html;
                  if (metadata.embed_metadata) updateData.embed_metadata = metadata.embed_metadata;
                  if (metadata.content_duration) updateData.content_duration = metadata.content_duration;
                  if (metadata.published_date) updateData.published_date = metadata.published_date;

                  await supabase
                    .from('items')
                    .update(updateData)
                    .eq('id', item.id);
                }
              }
            }

            await fetch(
              `${supabaseUrl}/functions/v1/categorize-item`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${supabaseServiceKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  itemId: item.id,
                  content: item.raw_content,
                  userId: user.id,
                }),
              }
            );

            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (itemError) {
            console.error(`Failed to process item ${item.id}:`, itemError);
          }
        }

        console.log('Finished processing imported items');
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