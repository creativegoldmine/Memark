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

interface UserHints {
  contentType?: string;
  userNotes?: string;
  priority?: string;
  importance?: string;
  cleanContent?: string;
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
    const body = formData.get('Body') as string;
    const mediaUrl = formData.get('MediaUrl0') as string | null;

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

    const { data: item, error: itemError } = await supabase
      .from('items')
      .insert({
        user_id: user.id,
        raw_content: body,
        media_url: mediaUrl,
        status: 'active',
        review_stage: 1,
        next_review_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        content_type: userHints.contentType,
        user_notes: userHints.userNotes,
        priority: userHints.priority,
        importance: userHints.importance,
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