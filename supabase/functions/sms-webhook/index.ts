import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface TwilioSMSPayload {
  From: string;
  Body: string;
  NumMedia?: string;
  MediaUrl0?: string;
  MediaUrl1?: string;
  MediaUrl2?: string;
  MediaUrl3?: string;
  MediaUrl4?: string;
  MediaUrl5?: string;
  MediaUrl6?: string;
  MediaUrl7?: string;
  MediaUrl8?: string;
  MediaUrl9?: string;
  MediaContentType0?: string;
  MediaContentType1?: string;
  MediaContentType2?: string;
  MediaContentType3?: string;
  MediaContentType4?: string;
  MediaContentType5?: string;
  MediaContentType6?: string;
  MediaContentType7?: string;
  MediaContentType8?: string;
  MediaContentType9?: string;
}

interface UserHints {
  contentType?: string;
  userNotes?: string;
  priority?: string;
  importance?: string;
  cleanContent?: string;
}

function extractMediaUrls(formData: FormData): string[] {
  const mediaUrls: string[] = [];

  for (let i = 0; i < 10; i++) {
    const mediaUrl = formData.get(`MediaUrl${i}`) as string | null;
    if (mediaUrl) {
      mediaUrls.push(mediaUrl);
    }
  }

  return mediaUrls;
}

function classifyContent(body: string, mediaUrls: string[], hasUrl: boolean): string {
  const hasMedia = mediaUrls.length > 0;
  const hasText = body && body.trim().length > 0;

  if (hasUrl && hasMedia && hasText) {
    return 'link_with_photo';
  }

  if (hasUrl && hasText) {
    return 'link_with_text';
  }

  if (hasUrl && !hasText) {
    const urlLower = body.toLowerCase();
    if (urlLower.includes('twitter.com') || urlLower.includes('x.com') ||
        urlLower.includes('instagram.com') || urlLower.includes('youtube.com') ||
        urlLower.includes('tiktok.com') || urlLower.includes('facebook.com')) {
      return 'social_post';
    }
    return 'link_only';
  }

  if (hasMedia && hasText) {
    return 'text_with_photo';
  }

  if (hasMedia && !hasText) {
    return 'text_with_photo';
  }

  if (hasText && !hasUrl && !hasMedia) {
    return 'text_only';
  }

  return 'text_only';
}

function parseUserHints(body: string): UserHints {
  const hints: UserHints = {
    priority: 'medium',
    importance: 'normal',
  };

  const lowerBody = body.toLowerCase();

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
  } else if (lowerBody.includes('important') || lowerBody.includes('urgent')) {
    hints.priority = 'high';
    hints.importance = 'high';
  }

  const noteMatch = body.match(/note\s*[:=]\s*(.+?)(?:\n|$)/i);
  if (noteMatch) {
    hints.userNotes = noteMatch[1].trim();
  }

  hints.cleanContent = body
    .replace(/(?:place in|add to|category|categorize as|folder)\s+\w+/gi, '')
    .replace(/(?:priority|important|urgent)\s*[:=]?\s*(?:high|medium|low|urgent)/gi, '')
    .replace(/note\s*[:=]\s*.+/gi, '')
    .trim();

  return hints;
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
    const body = formData.get('Body') as string || '';
    const numMedia = parseInt(formData.get('NumMedia') as string || '0', 10);

    const mediaUrls = extractMediaUrls(formData);

    const phoneNumber = from.replace(/\D/g, '');
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
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
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

    if (itemError) {
      throw itemError;
    }

    if (hasUrl) {
      console.log(`Fetching metadata for URL: ${hasUrl}`);
      await supabase
        .from('items')
        .update({ processing_status: 'processing' })
        .eq('id', item.id);

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
            const updateData: any = {
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

            await supabase
              .from('items')
              .update(updateData)
              .eq('id', item.id);

            console.log(`Metadata fetched and saved for item ${item.id}`);
          } else {
            await supabase
              .from('items')
              .update({
                processing_status: 'completed',
                processing_error: 'Metadata fetch returned no data',
              })
              .eq('id', item.id);
          }
        } else {
          await supabase
            .from('items')
            .update({
              processing_status: 'failed',
              processing_error: `HTTP ${metadataResponse.status}`,
            })
            .eq('id', item.id);
        }
      } catch (metadataError) {
        console.error('Failed to fetch metadata:', metadataError);
        await supabase
          .from('items')
          .update({
            processing_status: 'failed',
            processing_error: metadataError.message || 'Unknown error',
          })
          .eq('id', item.id);
      }
    } else if (mediaUrls.length > 0) {
      await supabase
        .from('items')
        .update({ processing_status: 'completed' })
        .eq('id', item.id);
    } else {
      await supabase
        .from('items')
        .update({ processing_status: 'completed' })
        .eq('id', item.id);
    }

    const categorizeResponse = await fetch(
      `${supabaseUrl}/functions/v1/categorize-item`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId: item.id,
          content: userHints.cleanContent || body,
          userId: user.id,
          metadata: userHints
        }),
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