import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface UserHints {
  contentType?: string;
  userNotes?: string;
  priority?: string;
  importance?: string;
  cleanContent?: string;
}

async function verifyTwilioSignature(
  authToken: string,
  twilioSignature: string,
  url: string,
  params: Record<string, string>
): Promise<boolean> {
  const sortedKeys = Object.keys(params).sort();
  let stringToSign = url;
  for (const key of sortedKeys) {
    stringToSign += key + params[key];
  }

  const encoder = new TextEncoder();
  const keyData = encoder.encode(authToken);
  const msgData = encoder.encode(stringToSign);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)));

  return base64Signature === twilioSignature;
}

async function hashPhone(phone: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(phone);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function extractMediaUrls(formData: FormData): string[] {
  const mediaUrls: string[] = [];
  for (let i = 0; i < 10; i++) {
    const mediaUrl = formData.get(`MediaUrl${i}`) as string | null;
    if (mediaUrl) mediaUrls.push(mediaUrl);
  }
  return mediaUrls;
}

function classifyContent(body: string, mediaUrls: string[], hasUrl: boolean): string {
  const hasMedia = mediaUrls.length > 0;
  const hasText = body && body.trim().length > 0;

  if (hasUrl && hasMedia && hasText) return 'link_with_photo';
  if (hasUrl && hasText) return 'link_with_text';

  if (hasUrl && !hasText) {
    const urlLower = body.toLowerCase();
    if (
      urlLower.includes('twitter.com') || urlLower.includes('x.com') ||
      urlLower.includes('instagram.com') || urlLower.includes('youtube.com') ||
      urlLower.includes('tiktok.com') || urlLower.includes('facebook.com')
    ) {
      return 'social_post';
    }
    return 'link_only';
  }

  if (hasMedia) return 'text_with_photo';
  if (hasText) return 'text_only';
  return 'text_only';
}

function parseUserHints(body: string): UserHints {
  const hints: UserHints = {
    priority: 'medium',
    importance: 'normal',
  };

  const categoryPatterns = [
    { regex: /(?:place in|add to|category|categorize as|folder)\s+(\w+)/i, key: 'contentType' },
    { regex: /(?:education|learning|study|course|tutorial)/i, value: 'Education' },
    { regex: /(?:business|work|career|professional)/i, value: 'Business' },
    { regex: /(?:tech|technology|programming|coding|dev)/i, value: 'Technology' },
    { regex: /(?:health|fitness|wellness|medical)/i, value: 'Health' },
    { regex: /(?:entertainment|fun|movie|show|game)/i, value: 'Entertainment' },
    { regex: /(?:news|current events|politics)/i, value: 'News' },
    { regex: /(?:science|research|study)/i, value: 'Science' },
    { regex: /(?:sports|athletic|exercise)/i, value: 'Sports' },
    { regex: /(?:travel|vacation|trip)/i, value: 'Travel' },
    { regex: /(?:food|cooking|recipe|restaurant)/i, value: 'Food' },
  ];

  for (const pattern of categoryPatterns) {
    const match = body.match(pattern.regex);
    if (match) {
      if (pattern.key === 'contentType' && match[1]) {
        hints.contentType = match[1].charAt(0).toUpperCase() + match[1].slice(1);
      } else if (pattern.value) {
        hints.contentType = pattern.value;
      }
      break;
    }
  }

  const priorityMatch = body.match(/(?:priority|important|urgent)\s*[:=]?\s*(high|medium|low|urgent)/i);
  if (priorityMatch) {
    hints.priority = priorityMatch[1].toLowerCase() === 'urgent' ? 'high' : priorityMatch[1].toLowerCase();
  } else if (body.toLowerCase().includes('important') || body.toLowerCase().includes('urgent')) {
    hints.priority = 'high';
    hints.importance = 'high';
  }

  const noteMatch = body.match(/note\s*[:=]\s*(.+?)(?:\n|$)/i);
  if (noteMatch) hints.userNotes = noteMatch[1].trim();

  hints.cleanContent = body
    .replace(/(?:place in|add to|category|categorize as|folder)\s+\w+/gi, '')
    .replace(/(?:priority|important|urgent)\s*[:=]?\s*(?:high|medium|low|urgent)/gi, '')
    .replace(/note\s*[:=]\s*.+/gi, '')
    .trim();

  return hints;
}

async function logWebhookAttempt(
  supabase: ReturnType<typeof createClient>,
  phoneHash: string,
  outcome: string,
  source: string,
  options: {
    matchedUserId?: string;
    itemId?: string;
    errorMessage?: string;
    requestIp?: string;
    twilioMessageSid?: string;
    durationMs?: number;
  } = {}
) {
  try {
    await supabase.from('webhook_logs').insert({
      phone_hash: phoneHash,
      matched_user_id: options.matchedUserId || null,
      outcome,
      source,
      item_id: options.itemId || null,
      error_message: options.errorMessage || null,
      request_ip: options.requestIp || null,
      twilio_message_sid: options.twilioMessageSid || null,
      processing_duration_ms: options.durationMs || null,
    });
  } catch (logError) {
    console.error('Failed to write webhook log:', logError);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const requestIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const isTestMode = req.headers.get('x-memark-test-mode') === 'true';

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid form data' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const from = formData.get('From') as string;
  const body = formData.get('Body') as string || '';
  const messageSid = formData.get('MessageSid') as string || '';

  if (!from) {
    return new Response(
      JSON.stringify({ error: 'Missing From field' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const phoneNumber = from.replace(/\D/g, '');
  const phoneHash = await hashPhone(phoneNumber);

  if (!isTestMode && twilioAuthToken) {
    const twilioSignature = req.headers.get('x-twilio-signature') || '';
    const webhookUrl = `${supabaseUrl}/functions/v1/sms-webhook`;

    const params: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      params[key] = value.toString();
    }

    const isValid = await verifyTwilioSignature(twilioAuthToken, twilioSignature, webhookUrl, params);

    if (!isValid) {
      console.warn(`Rejected webhook: invalid Twilio signature from IP ${requestIp}`);
      await logWebhookAttempt(supabase, phoneHash, 'signature_invalid', 'unknown', {
        requestIp,
        twilioMessageSid: messageSid,
        durationMs: Date.now() - startTime,
      });
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  try {
    const mediaUrls = extractMediaUrls(formData);
    const phoneNumberWithout1 = phoneNumber.startsWith('1') ? phoneNumber.substring(1) : phoneNumber;

    let user = null;

    const { data: user1 } = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', phoneNumber)
      .maybeSingle();

    if (!user1 && phoneNumber !== phoneNumberWithout1) {
      const { data: user2 } = await supabase
        .from('users')
        .select('id')
        .eq('phone_number', phoneNumberWithout1)
        .maybeSingle();
      user = user2;
    } else {
      user = user1;
    }

    if (!user) {
      await logWebhookAttempt(supabase, phoneHash, 'user_not_found', isTestMode ? 'test_simulator' : 'twilio', {
        requestIp,
        twilioMessageSid: messageSid,
        durationMs: Date.now() - startTime,
      });
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userHints = parseUserHints(body);
    const urlMatch = body.match(/(https?:\/\/[^\s]+)/);
    const hasUrl = urlMatch && urlMatch[0];
    const contentClassification = classifyContent(body, mediaUrls, !!hasUrl);

    const { data: item, error: itemError } = await supabase
      .from('items')
      .insert({
        user_id: user.id,
        raw_content: body,
        media_url: mediaUrls[0] || null,
        media_urls: mediaUrls.length > 0 ? mediaUrls : null,
        media_count: mediaUrls.length,
        status: 'active',
        review_stage: 1,
        next_review_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        content_type: userHints.contentType,
        user_notes: userHints.userNotes,
        priority: userHints.priority,
        importance: userHints.importance,
        content_classification: contentClassification,
        ingestion_source: 'sms',
        processing_status: 'pending',
        api_version: 'v2',
      })
      .select()
      .single();

    if (itemError) throw itemError;

    if (hasUrl) {
      await supabase.from('items').update({ processing_status: 'processing' }).eq('id', item.id);

      try {
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
            const updateData: Record<string, unknown> = {
              preview_fetched_at: new Date().toISOString(),
              processing_status: 'completed',
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
            if (metadata.embed_metadata) {
              updateData.embed_metadata = metadata.embed_metadata;
              if (metadata.embed_metadata.carousel_images) {
                updateData.carousel_images = metadata.embed_metadata.carousel_images;
              }
              if (metadata.embed_metadata.video_url) {
                updateData.video_url = metadata.embed_metadata.video_url;
              }
            }
            if (metadata.content_duration) updateData.content_duration = metadata.content_duration;
            if (metadata.published_date) updateData.published_date = metadata.published_date;

            await supabase.from('items').update(updateData).eq('id', item.id);
          } else {
            await supabase.from('items').update({
              processing_status: 'completed',
              processing_error: 'Metadata fetch returned no data',
            }).eq('id', item.id);
          }
        } else {
          await supabase.from('items').update({
            processing_status: 'failed',
            processing_error: `HTTP ${metadataResponse.status}`,
          }).eq('id', item.id);
        }
      } catch (metadataError) {
        console.error('Failed to fetch metadata:', metadataError);
        await supabase.from('items').update({
          processing_status: 'failed',
          processing_error: (metadataError as Error).message || 'Unknown error',
        }).eq('id', item.id);
      }
    } else {
      await supabase.from('items').update({ processing_status: 'completed' }).eq('id', item.id);
    }

    await fetch(`${supabaseUrl}/functions/v1/categorize-item`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        itemId: item.id,
        content: userHints.cleanContent || body,
        userId: user.id,
        metadata: userHints,
      }),
    });

    await logWebhookAttempt(supabase, phoneHash, 'success', isTestMode ? 'test_simulator' : 'twilio', {
      matchedUserId: user.id,
      itemId: item.id,
      requestIp,
      twilioMessageSid: messageSid,
      durationMs: Date.now() - startTime,
    });

    return new Response(
      JSON.stringify({ success: true, itemId: item.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing SMS:', error);
    await logWebhookAttempt(supabase, phoneHash, 'error', isTestMode ? 'test_simulator' : 'twilio', {
      requestIp,
      twilioMessageSid: messageSid,
      errorMessage: (error as Error).message || 'Unknown error',
      durationMs: Date.now() - startTime,
    });
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
